import { useState, useEffect, useCallback } from 'react'
import * as api from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// ─── Alert Subscriptions ───────────────────────────

export function useAlertSubscriptions() {
  const { user } = useAuth()
  const [subscriptions, setSubscriptions] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiAvailable, setApiAvailable] = useState(null)

  const load = useCallback(async () => {
    if (!user) {
      setSubscriptions([])
      setHistory([])
      setLoading(false)
      return
    }

    setLoading(true)
    // Try pipeline API first — scoped to user email
    const subs = await api.getAlertSubscriptions(user.email)
    if (subs !== null) {
      setApiAvailable(true)
      setSubscriptions(Array.isArray(subs) ? subs : subs?.subscriptions || [])
      const hist = await api.getAlertHistory(50, user.email)
      setHistory(Array.isArray(hist) ? hist : hist?.history || [])
    } else {
      // Fallback: try Supabase direct — scoped to user email
      setApiAvailable(false)
      try {
        const { data } = await supabase.from('alert_subscriptions').select('*').eq('email', user.email).order('created_at', { ascending: false })
        setSubscriptions(data || [])
        const { data: histData } = await supabase.from('alert_history').select('*').eq('email', user.email).order('fired_at', { ascending: false }).limit(50)
        setHistory(histData || [])
      } catch {
        setSubscriptions([])
        setHistory([])
      }
    }
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const createSubscription = useCallback(async (sub) => {
    if (apiAvailable) {
      const result = await api.createAlertSubscription(sub)
      if (result) { await load(); return result }
    }
    // Supabase fallback
    const { data, error } = await supabase.from('alert_subscriptions').insert(sub).select().single()
    if (!error) { await load(); return data }
    throw error
  }, [apiAvailable, load])

  const deleteSubscription = useCallback(async (id) => {
    if (apiAvailable) {
      await api.deleteAlertSubscription(id)
    } else {
      await supabase.from('alert_subscriptions').delete().eq('id', id)
    }
    await load()
  }, [apiAvailable, load])

  return { subscriptions, history, loading, createSubscription, deleteSubscription, refresh: load, apiAvailable }
}

// ─── Report Profiles ───────────────────────────────

export function useReportProfiles() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiAvailable, setApiAvailable] = useState(null)

  const load = useCallback(async () => {
    if (!user) {
      setProfiles([])
      setHistory([])
      setLoading(false)
      return
    }

    setLoading(true)
    const profs = await api.getReportProfiles(user.email)
    if (profs !== null) {
      setApiAvailable(true)
      setProfiles(Array.isArray(profs) ? profs : profs?.profiles || [])
      const hist = await api.getReportHistory(20)
      setHistory(Array.isArray(hist) ? hist : hist?.history || [])
    } else {
      setApiAvailable(false)
      try {
        const { data } = await supabase.from('report_profiles').select('*').eq('email', user.email).order('created_at', { ascending: false })
        setProfiles(data || [])
        const { data: histData } = await supabase.from('report_history').select('*').order('generated_at', { ascending: false }).limit(20)
        setHistory(histData || [])
      } catch {
        setProfiles([])
        setHistory([])
      }
    }
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const createProfile = useCallback(async (profile) => {
    if (apiAvailable) {
      const result = await api.createReportProfile(profile)
      if (result) { await load(); return result }
    }
    const { data, error } = await supabase.from('report_profiles').insert(profile).select().single()
    if (!error) { await load(); return data }
    throw error
  }, [apiAvailable, load])

  const deleteProfile = useCallback(async (id) => {
    if (apiAvailable) {
      await api.deleteReportProfile(id)
    } else {
      await supabase.from('report_profiles').delete().eq('id', id)
    }
    await load()
  }, [apiAvailable, load])

  const previewReport = useCallback(async (id) => {
    if (apiAvailable) {
      return api.previewReport(id)
    }
    return null
  }, [apiAvailable])

  const generateReport = useCallback(async (id) => {
    if (apiAvailable) {
      return api.generateReport(id)
    }
    return null
  }, [apiAvailable])

  return { profiles, history, loading, createProfile, deleteProfile, previewReport, generateReport, refresh: load, apiAvailable }
}

// ─── Market Time Series ────────────────────────────

export function useMarketTimeSeries() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Try pipeline API
      const result = await api.getMarketTimeSeries()
      if (result) {
        setData(Array.isArray(result) ? result : result?.data || result?.timeseries || [])
      } else {
        // Fallback: try Supabase mart_market_daily_summary
        try {
          const { data: rows } = await supabase
            .from('mart_market_daily_summary')
            .select('*')
            .order('scraped_date', { ascending: true })
          setData(rows || [])
        } catch {
          setData(null)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  return { data, loading }
}