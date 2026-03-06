// src/hooks/useRetailerAnalytics.js
//
// Hooks for the multi-retailer analytics tab.
// Queries Supabase views directly — same pattern as useData.js.

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Cheapest Leaderboard — win rate per retailer (last 30 days).
 * View: mart_cheapest_leaderboard
 */
export function useCheapestLeaderboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: rows, error } = await supabase
        .from('mart_cheapest_leaderboard')
        .select('*')
        .order('win_pct', { ascending: false })

      if (error) {
        console.warn('mart_cheapest_leaderboard not available:', error.message)
        setData([])
      } else {
        setData(rows || [])
      }
      setLoading(false)
    }
    fetch()
  }, [])

  return { data, loading }
}

/**
 * 48-Hour Price Movers — biggest recent price changes across all retailers.
 * View: mart_price_movers_48h
 */
export function usePriceMovers() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: rows, error } = await supabase
        .from('mart_price_movers_48h')
        .select('*')
        .order('abs_change_pct', { ascending: false })
        .limit(50)

      if (error) {
        console.warn('mart_price_movers_48h not available:', error.message)
        setData([])
      } else {
        setData(rows || [])
      }
      setLoading(false)
    }
    fetch()
  }, [])

  return { data, loading }
}

/**
 * Retailer Discount Profiles — discount behavior summary per retailer.
 * View: mart_retailer_discount_profiles
 */
export function useDiscountProfiles() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: rows, error } = await supabase
        .from('mart_retailer_discount_profiles')
        .select('*')
        .order('pct_discounted', { ascending: false })

      if (error) {
        console.warn('mart_retailer_discount_profiles not available:', error.message)
        setData([])
      } else {
        setData(rows || [])
      }
      setLoading(false)
    }
    fetch()
  }, [])

  return { data, loading }
}

/**
 * Market Spread Index — cross-retailer price fragmentation over time.
 * View: mart_market_spread_index
 */
export function useSpreadIndex() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: rows, error } = await supabase
        .from('mart_market_spread_index')
        .select('*')
        .order('scraped_date', { ascending: true })

      if (error) {
        console.warn('mart_market_spread_index not available:', error.message)
        setData([])
      } else {
        setData(rows || [])
      }
      setLoading(false)
    }
    fetch()
  }, [])

  return { data, loading }
}