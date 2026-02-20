import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const LOCAL_STORAGE_KEY = 'studmetrics_saved_dashboards'

/**
 * Hook to save/load/delete custom dashboard configurations.
 * 
 * Uses Supabase `saved_dashboards` table if the user is authenticated,
 * falls back to localStorage for anonymous users.
 * 
 * Each dashboard = { id, name, charts: [...chartConfigs], created_at, updated_at }
 */
export function useSavedDashboards() {
  const { user } = useAuth()
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)

  // Load dashboards
  const loadDashboards = useCallback(async () => {
    setLoading(true)

    if (user) {
      // Try Supabase first
      try {
        const { data, error } = await supabase
          .from('saved_dashboards')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })

        if (!error && data) {
          setDashboards(data.map(d => ({
            ...d,
            charts: typeof d.charts === 'string' ? JSON.parse(d.charts) : d.charts,
          })))
          setLoading(false)
          return
        }
      } catch (e) {
        // Table might not exist yet — fall through to localStorage
        console.warn('saved_dashboards table not available, using localStorage:', e.message)
      }
    }

    // Fallback: localStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) {
        setDashboards(JSON.parse(stored))
      }
    } catch (e) {
      console.warn('Failed to load dashboards from localStorage:', e)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadDashboards()
  }, [loadDashboards])

  // Save a new dashboard or update an existing one
  const saveDashboard = useCallback(async (name, charts, existingId = null) => {
    const now = new Date().toISOString()
    const dashboard = {
      id: existingId || `dash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      charts,
      created_at: existingId ? undefined : now,
      updated_at: now,
    }

    if (user) {
      try {
        const payload = {
          id: dashboard.id,
          user_id: user.id,
          name: dashboard.name,
          charts: JSON.stringify(charts),
          updated_at: now,
        }
        if (!existingId) payload.created_at = now

        const { error } = existingId
          ? await supabase.from('saved_dashboards').update(payload).eq('id', existingId)
          : await supabase.from('saved_dashboards').insert(payload)

        if (!error) {
          await loadDashboards()
          return dashboard.id
        }
      } catch (e) {
        console.warn('Supabase save failed, using localStorage:', e.message)
      }
    }

    // Fallback: localStorage
    setDashboards(prev => {
      const updated = existingId
        ? prev.map(d => d.id === existingId ? { ...d, name, charts, updated_at: now } : d)
        : [{ ...dashboard, created_at: now }, ...prev]
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {
        console.warn('localStorage save failed:', e)
      }
      return updated
    })

    return dashboard.id
  }, [user, loadDashboards])

  // Delete a dashboard
  const deleteDashboard = useCallback(async (id) => {
    if (user) {
      try {
        await supabase.from('saved_dashboards').delete().eq('id', id)
      } catch (e) {
        // Ignore
      }
    }

    setDashboards(prev => {
      const updated = prev.filter(d => d.id !== id)
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {
        // Ignore
      }
      return updated
    })
  }, [user])

  return {
    dashboards,
    loading,
    saveDashboard,
    deleteDashboard,
    refreshDashboards: loadDashboards,
  }
}