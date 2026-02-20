import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Subscription tiers and limits.
 *
 * Free: 1 alert, 1 weekly report, basic watchlist
 * Pro ($5/mo): 10 alerts, 10 reports, full custom builder, saved dashboards
 */

export const TIERS = {
  free: {
    name: 'Free',
    maxAlerts: 1,
    maxReports: 1,
    canUseCustomBuilder: false,
    canSaveDashboards: false,
    maxWatchlistItems: 5,
    maxCompareItems: 2,
    price: 0,
  },
  pro: {
    name: 'Pro',
    maxAlerts: 10,
    maxReports: 10,
    canUseCustomBuilder: true,
    canSaveDashboards: true,
    maxWatchlistItems: 999,
    maxCompareItems: 999,
    price: 5,
  },
}

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alertCount, setAlertCount] = useState(0)
  const [reportCount, setReportCount] = useState(0)
  const [watchlistCount, setWatchlistCount] = useState(0)

  const tier = subscription?.tier || 'free'
  const limits = TIERS[tier] || TIERS.free
  const isPro = tier === 'pro'

  const loadSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null)
      setAlertCount(0)
      setReportCount(0)
      setWatchlistCount(0)
      setLoading(false)
      return
    }

    // Ensure we have an active session before querying
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setSubscription({ tier: 'free', user_id: user.id })
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // ... rest of your queries
      // Try to fetch subscription from Supabase
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (sub && sub.status === 'active') {
        setSubscription({ tier: 'pro', ...sub })
      } else {
        setSubscription({ tier: 'free', user_id: user.id })
      }

      // Count existing alerts
      try {
        const { count: ac } = await supabase
          .from('alert_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('email', user.email)
        setAlertCount(ac || 0)
      } catch { setAlertCount(0) }

      // Count existing reports
      try {
        const { count: rc } = await supabase
          .from('report_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('email', user.email)
        setReportCount(rc || 0)
      } catch { setReportCount(0) }

      // Count watchlist items
      try {
        const { count: wc } = await supabase
          .from('user_favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        setWatchlistCount(wc || 0)
      } catch { setWatchlistCount(0) }

    } catch (e) {
      console.warn('Subscription check failed:', e)
      setSubscription({ tier: 'free', user_id: user?.id })
    }
    setLoading(false)
  }, [user])

  useEffect(() => { loadSubscription() }, [loadSubscription])

  const canCreateAlert = isPro ? alertCount < limits.maxAlerts : alertCount < limits.maxAlerts
  const canCreateReport = isPro ? reportCount < limits.maxReports : reportCount < limits.maxReports
  const canAddToWatchlist = isPro || watchlistCount < limits.maxWatchlistItems
  const alertsRemaining = Math.max(0, limits.maxAlerts - alertCount)
  const reportsRemaining = Math.max(0, limits.maxReports - reportCount)

  return {
    subscription,
    tier,
    isPro,
    limits,
    loading,
    alertCount,
    reportCount,
    watchlistCount,
    canCreateAlert,
    canCreateReport,
    canAddToWatchlist,
    alertsRemaining,
    reportsRemaining,
    refresh: loadSubscription,
  }
}
