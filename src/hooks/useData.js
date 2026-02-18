import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const [productRes, runRes] = await Promise.all([
        supabase.from('raw_product_details').select('slug', { count: 'exact', head: true }),
        supabase.from('raw_ingest_run').select('*', { count: 'exact', head: true }),
      ])

      const { data: snap } = await supabase
        .from('fact_product_daily_snapshot')
        .select('product_code, price_usd, rating, in_stock, on_sale, theme, is_new, piece_count, scraped_date')

      if (snap) {
        const latest = new Map()
        for (const r of snap) {
          if (!latest.has(r.product_code) || r.scraped_date > latest.get(r.product_code).scraped_date) {
            latest.set(r.product_code, r)
          }
        }
        const products = Array.from(latest.values())
        const prices = products.filter(r => r.price_usd).map(r => Number(r.price_usd))
        const ratings = products.filter(r => r.rating).map(r => Number(r.rating))
        const pieces = products.filter(r => r.piece_count).map(r => Number(r.piece_count))
        const totalValue = prices.reduce((a, b) => a + b, 0)

        setStats({
          totalProducts: products.length,
          totalRuns: runRes.count || 0,
          totalSnapshots: productRes.count || 0,
          uniqueThemes: new Set(products.filter(r => r.theme).map(r => r.theme)).size,
          avgPrice: prices.length ? Number((totalValue / prices.length).toFixed(2)) : 0,
          medianPrice: prices.length ? Number(prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)].toFixed(2)) : 0,
          totalCatalogValue: Math.round(totalValue),
          inStockCount: products.filter(r => r.in_stock).length,
          inStockPct: products.length ? Math.round((products.filter(r => r.in_stock).length / products.length) * 100) : 0,
          onSaleCount: products.filter(r => r.on_sale).length,
          newCount: products.filter(r => r.is_new).length,
          avgRating: ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 0,
          avgPieces: pieces.length ? Math.round(pieces.reduce((a, b) => a + b, 0) / pieces.length) : 0,
          totalPieces: pieces.reduce((a, b) => a + b, 0),
          minPrice: prices.length ? Math.min(...prices) : 0,
          maxPrice: prices.length ? Math.max(...prices) : 0,
        })
      }
      setLoading(false)
    }
    fetch()
  }, [])
  return { stats, loading }
}

export function useProducts(filters = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('fact_product_daily_snapshot')
      .select('*', { count: 'exact' })
      .order('scraped_date', { ascending: false })

    if (filters.search) query = query.ilike('product_name', `%${filters.search}%`)
    if (filters.theme && filters.theme !== 'all') query = query.eq('theme', filters.theme)
    if (filters.minPrice) query = query.gte('price_usd', filters.minPrice)
    if (filters.maxPrice) query = query.lte('price_usd', filters.maxPrice)
    if (filters.minPieces) query = query.gte('piece_count', filters.minPieces)
    if (filters.maxPieces) query = query.lte('piece_count', filters.maxPieces)
    if (filters.minRating) query = query.gte('rating', filters.minRating)
    if (filters.ageRange && filters.ageRange !== 'all') query = query.eq('age_range', filters.ageRange)
    if (filters.inStock === true) query = query.eq('in_stock', true)
    if (filters.onSale === true) query = query.eq('on_sale', true)
    if (filters.isNew === true) query = query.eq('is_new', true)
    if (filters.availability && filters.availability !== 'all') query = query.eq('availability_status', filters.availability)

    const limit = filters.limit || 200
    query = query.range(0, limit - 1)

    const { data, count } = await query
    const seen = new Map()
    for (const row of (data || [])) {
      if (!seen.has(row.product_code)) seen.set(row.product_code, row)
    }

    let result = Array.from(seen.values())

    // Client-side sort
    if (filters.sortBy) {
      const key = filters.sortBy
      const dir = filters.sortDir === 'asc' ? 1 : -1
      result.sort((a, b) => {
        const av = Number(a[key]) || 0
        const bv = Number(b[key]) || 0
        return (av - bv) * dir
      })
    }

    setProducts(result)
    setTotal(count || 0)
    setLoading(false)
  }, [JSON.stringify(filters)])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  return { products, loading, total, refetch: fetchProducts }
}

export function useProductDetail(slug) {
  const [product, setProduct] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    async function fetch() {
      setLoading(true)
      const [snapshotRes, detailRes] = await Promise.all([
        supabase
          .from('fact_product_daily_snapshot')
          .select('*')
          .eq('slug', slug)
          .order('scraped_date', { ascending: true }),
        supabase
          .from('raw_product_details')
          .select('*')
          .eq('slug', slug)
          .limit(1)
          .single()
      ])

      const { data } = snapshotRes
      const { data: details } = detailRes

      if (data && data.length > 0) {
        // Merge raw_product_details (which may have image_url) into the latest snapshot
        const latest = { ...data[data.length - 1], ...(details || {}) }
        setProduct(latest)
        setHistory(data)
      }
      setLoading(false)
    }
    fetch()
  }, [slug])

  return { product, history, loading }
}

export function useCompareProducts(slugs = []) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (slugs.length === 0) { setProducts([]); return }
    async function fetch() {
      setLoading(true)
      const { data } = await supabase
        .from('fact_product_daily_snapshot')
        .select('*')
        .in('slug', slugs)
        .order('scraped_date', { ascending: false })

      const seen = new Map()
      for (const r of (data || [])) {
        if (!seen.has(r.slug)) seen.set(r.slug, r)
      }
      setProducts(Array.from(seen.values()))
      setLoading(false)
    }
    fetch()
  }, [slugs.join(',')])

  return { products, loading }
}

export function useThemes() {
  const [themes, setThemes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('mart_theme_summary').select('*').order('product_count', { ascending: false })
      setThemes(data || [])
      setLoading(false)
    }
    fetch()
  }, [])
  return { themes, loading }
}

export function useBestValue(limit = 10) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('mart_best_value').select('*').limit(limit)
      setProducts(data || [])
      setLoading(false)
    }
    fetch()
  }, [limit])
  return { products, loading }
}

export function useNewProducts(limit = 12) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('mart_new_products').select('*').limit(limit)
      setProducts(data || [])
      setLoading(false)
    }
    fetch()
  }, [limit])
  return { products, loading }
}

export function useThemeList() {
  const [themes, setThemes] = useState([])
  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('mart_theme_summary').select('theme, product_count').order('product_count', { ascending: false })
      setThemes((data || []).filter(t => t.theme))
    }
    fetch()
  }, [])
  return themes
}

export function useAvailabilityStatuses() {
  const [statuses, setStatuses] = useState([])
  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('fact_product_daily_snapshot').select('availability_status')
      const unique = [...new Set((data || []).map(d => d.availability_status).filter(Boolean))]
      setStatuses(unique.sort())
    }
    fetch()
  }, [])
  return statuses
}

export function useAgeRanges() {
  const [ranges, setRanges] = useState([])
  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('fact_product_daily_snapshot').select('age_range')
      const unique = [...new Set((data || []).map(d => d.age_range).filter(Boolean))]
      setRanges(unique.sort())
    }
    fetch()
  }, [])
  return ranges
}