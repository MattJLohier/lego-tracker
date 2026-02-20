import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState(new Set())
  const [favoriteProducts, setFavoriteProducts] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchFavorites = useCallback(async () => {
    if (!user) { setFavorites(new Set()); setFavoriteProducts([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('user_favorites')
      .select('product_code, slug')
      .eq('user_id', user.id)
    const codes = new Set((data || []).map(d => d.product_code))
    setFavorites(codes)

    // Fetch full product details for favorites
    if (codes.size > 0) {
      const { data: products } = await supabase
        .from('fact_product_daily_snapshot')
        .select('*')
        .in('product_code', Array.from(codes))
        .order('scraped_date', { ascending: false })

      // Dedup to latest per product
      const seen = new Map()
      for (const p of (products || [])) {
        if (!seen.has(p.product_code)) seen.set(p.product_code, p)
      }
      setFavoriteProducts(Array.from(seen.values()))
    } else {
      setFavoriteProducts([])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  const toggleFavorite = async (productCode, slug) => {
    if (!user) return false
    // Adding — check handled at component level
    if (favorites.has(productCode)) {
      await supabase.from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_code', productCode)
      setFavorites(prev => { const n = new Set(prev); n.delete(productCode); return n })
    } else {
      await supabase.from('user_favorites')
        .insert({ user_id: user.id, product_code: productCode, slug })
      setFavorites(prev => new Set(prev).add(productCode))
    }
    fetchFavorites()
    return true
  }

  const isFavorite = (productCode) => favorites.has(productCode)

  return { favorites, favoriteProducts, loading, toggleFavorite, isFavorite, refetch: fetchFavorites }
}
