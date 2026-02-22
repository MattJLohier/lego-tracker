import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { normalizeStatus, getStatusDisplay, getStatusShortLabel } from '../lib/stockStatus'

// Batch-fetch price/stock history for a list of product codes (for card sparklines)
export function useProductHistories(productCodes = []) {
  const [histories, setHistories] = useState({})
  const [loading, setLoading] = useState(false)
  const key = useMemo(() => [...productCodes].sort().join(','), [productCodes])

  useEffect(() => {
    if (!productCodes.length) { setHistories({}); return }
    let cancelled = false
    async function fetchAll() {
      setLoading(true)
      // Supabase .in() has a practical limit; batch in chunks of 30
      const chunks = []
      for (let i = 0; i < productCodes.length; i += 30) {
        chunks.push(productCodes.slice(i, i + 30))
      }
      let allRows = []
      for (const chunk of chunks) {
        const { data } = await supabase
          .from('v_snapshot_timeseries')
          .select('product_code, price_usd, in_stock, availability_status, scraped_date')
          .in('product_code', chunk)
          .order('scraped_date', { ascending: true })
        if (data) allRows = allRows.concat(data)
      }
      if (cancelled) return
      // Group by product_code
      const grouped = {}
      for (const row of allRows) {
        if (!grouped[row.product_code]) grouped[row.product_code] = []
        grouped[row.product_code].push(row)
      }
      setHistories(grouped)
      setLoading(false)
    }
    fetchAll()
    return () => { cancelled = true }
  }, [key])

  return { histories, loading }
}

export function useStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const [productRes, runRes] = await Promise.all([
        supabase.from('raw_product_details').select('slug', { count: 'exact', head: true }),
        supabase.from('raw_ingest_run').select('*', { count: 'exact', head: true }),
      ])

      // Use the materialized view (one row per product) instead of full table scan
      const { data: snap } = await supabase
        .from('v_latest_products')
        .select('product_code, price_usd, enriched_price_usd, rating, enriched_rating, in_stock, on_sale, theme, is_new, piece_count, enriched_piece_count, scraped_date')

      if (snap) {
        const products = snap
        const prices = products.map(r => Number(r.enriched_price_usd || r.price_usd)).filter(p => p > 0)
        const ratings = products.map(r => Number(r.enriched_rating || r.rating)).filter(r => r > 0)
        const pieces = products.map(r => Number(r.enriched_piece_count || r.piece_count)).filter(p => p > 0)
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

    const page = filters.page || 1
    const perPage = filters.perPage || 40
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // Try the enriched view first; fall back to raw snapshot table
    let query = supabase
      .from('v_latest_products')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters.search) query = query.ilike('product_name', `%${filters.search}%`)
    if (filters.theme && filters.theme !== 'all') query = query.eq('theme', filters.theme)
    if (filters.minPrice) query = query.or(`price_usd.gte.${filters.minPrice},enriched_price_usd.gte.${filters.minPrice}`)
    if (filters.maxPrice) query = query.or(`price_usd.lte.${filters.maxPrice},enriched_price_usd.lte.${filters.maxPrice}`)
    if (filters.minPieces) query = query.gte('piece_count', filters.minPieces)
    if (filters.maxPieces) query = query.lte('piece_count', filters.maxPieces)
    if (filters.minRating) query = query.gte('rating', filters.minRating)
    if (filters.ageRange && filters.ageRange !== 'all') query = query.eq('age_range', filters.ageRange)
    if (filters.inStock === true) query = query.eq('in_stock', true)
    if (filters.onSale === true) query = query.eq('on_sale', true)
    if (filters.isNew === true) query = query.eq('is_new', true)
    if (filters.availability && filters.availability !== 'all') query = query.eq('availability_status', filters.availability)

    // Server-side sort — use enriched columns for reliable ordering
    const sortBy = filters.sortBy || 'product_name'
    const ascending = filters.sortDir === 'asc'
    
    // price_usd is often null; enriched_price_usd is always populated
    const effectiveSortCol = sortBy === 'price_usd' ? 'enriched_price_usd' : sortBy
    query = query.order(effectiveSortCol, { ascending, nullsFirst: false })

    // Paginate
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error && error.code === '42P01') {
      // View doesn't exist yet — fall back to old approach
      return fetchProductsFallback(filters, setProducts, setTotal, setLoading)
    }

    // Enrich: swap in enriched fields where originals are missing
    const enriched = (data || []).map(row => ({
      ...row,
      price_usd: (row.price_usd && Number(row.price_usd) > 0) ? row.price_usd : row.enriched_price_usd,
      list_price_usd: (row.list_price_usd && Number(row.list_price_usd) > 0) ? row.list_price_usd : row.enriched_list_price_usd,
      piece_count: row.piece_count || row.enriched_piece_count,
      rating: row.rating || row.enriched_rating,
      age_range: row.age_range || row.enriched_age_range,
    }))

    setProducts(enriched)
    setTotal(count || 0)
    setLoading(false)
  }, [JSON.stringify(filters)])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  return { products, loading, total, refetch: fetchProducts }
}

// Fallback if the SQL view hasn't been created yet
async function fetchProductsFallback(filters, setProducts, setTotal, setLoading) {
  const page = filters.page || 1
  const perPage = filters.perPage || 40
  // We need to over-fetch because we deduplicate client-side
  const fetchLimit = perPage * 8

  let query = supabase
    .from('v_snapshot_timeseries')
    .select('*', { count: 'exact' })
    .order('scraped_date', { ascending: false })

  if (filters.search) query = query.ilike('product_name', `%${filters.search}%`)
  if (filters.theme && filters.theme !== 'all') query = query.eq('theme', filters.theme)
  if (filters.minPieces) query = query.gte('piece_count', filters.minPieces)
  if (filters.maxPieces) query = query.lte('piece_count', filters.maxPieces)
  if (filters.minRating) query = query.gte('rating', filters.minRating)
  if (filters.ageRange && filters.ageRange !== 'all') query = query.eq('age_range', filters.ageRange)
  if (filters.inStock === true) query = query.eq('in_stock', true)
  if (filters.onSale === true) query = query.eq('on_sale', true)
  if (filters.isNew === true) query = query.eq('is_new', true)
  if (filters.availability && filters.availability !== 'all') query = query.eq('availability_status', filters.availability)

  query = query.range(0, fetchLimit - 1)

  const { data, count } = await query
  const seen = new Map()
  for (const row of (data || [])) {
    if (!seen.has(row.product_code)) seen.set(row.product_code, row)
  }

  let result = Array.from(seen.values())

  if (filters.sortBy) {
    const key = filters.sortBy
    const dir = filters.sortDir === 'asc' ? 1 : -1
    result.sort((a, b) => {
      // Use enriched values for price to handle nulls
      let av, bv
      if (key === 'price_usd') {
        av = Number(a.enriched_price_usd || a.price_usd) || 0
        bv = Number(b.enriched_price_usd || b.price_usd) || 0
      } else {
        av = Number(a[key]) || 0
        bv = Number(b[key]) || 0
      }
      return (av - bv) * dir
    })
  }

  // Client-side pagination of deduplicated results
  const start = (page - 1) * perPage
  const paged = result.slice(start, start + perPage)

  setProducts(paged)
  setTotal(result.length)
  setLoading(false)
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
          .from('v_snapshot_timeseries')
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

        // Extract nested pricing from raw_product_details if top-level price is missing/zero
        const nested = details?.details?.product || details?.details || null
        if (nested) {
          const variant = nested.variants?.[0]
          const variantPrice = variant?.price
          if ((!latest.price_usd || Number(latest.price_usd) === 0) && variantPrice) {
            latest.price_usd = variantPrice.formattedValue ?? (variantPrice.centAmount ? variantPrice.centAmount / 100 : null)
          }
          if ((!latest.list_price_usd || Number(latest.list_price_usd) === 0) && variant?.listPrice) {
            latest.list_price_usd = variant.listPrice.formattedValue ?? (variant.listPrice.centAmount ? variant.listPrice.centAmount / 100 : null)
          }
          if (!latest.piece_count && nested.pieceCount) latest.piece_count = nested.pieceCount
          if (!latest.rating && nested.rating?.overallRating) latest.rating = nested.rating.overallRating
          if (!latest.age_range && nested.ageRange) latest.age_range = nested.ageRange
          if (!latest.in_stock && variant?.attributes?.availabilityStatus) {
            latest.availability_status = variant.attributes.availabilityStatus
            latest.in_stock = /available|in stock/i.test(variant.attributes.availabilityStatus)
          }
          // Extract availability_text from nested variant attributes
          if (!latest.availability_text && variant?.attributes?.availabilityText) {
            latest.availability_text = variant.attributes.availabilityText
          }
          if (!latest._resolved_image_url) {
            latest._resolved_image_url = 
              nested.primaryImage || 
              nested.baseImgUrl || 
              nested.variants?.[0]?.primaryImage ||
              null
          }
        }

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
        .from('v_snapshot_timeseries')
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
      const { data } = await supabase.from('v_latest_products').select('availability_status')
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
      const { data } = await supabase.from('v_latest_products').select('age_range, enriched_age_range')
      const unique = [...new Set((data || []).map(d => d.enriched_age_range || d.age_range).filter(Boolean))]
      setRanges(unique.sort())
    }
    fetch()
  }, [])
  return ranges
}

// Fetch all snapshots for time-series analytics
export function useAllSnapshots() {
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      // Fetch snapshots in small pages to avoid Supabase statement timeout
      let allData = []
      let from = 0
      const pageSize = 500
      let keepGoing = true

      while (keepGoing) {
        const { data, error } = await supabase
          .from('v_snapshot_timeseries')
          .select('product_code, product_name, theme, price_usd, piece_count, rating, in_stock, on_sale, is_new, availability_status, availability_text, age_range, scraped_date, price_per_piece, vip_points, discount_usd, list_price_usd, sale_percentage, slug')
          .order('product_code', { ascending: true })
          .order('scraped_date', { ascending: true })
          .range(from, from + pageSize - 1)

        if (error || !data || data.length === 0) {
          keepGoing = false
        } else {
          allData = allData.concat(data)
          from += pageSize
          if (data.length < pageSize) keepGoing = false
        }
      }

      setSnapshots(allData)
      setLoading(false)
    }
    fetch()
  }, [])

  return { snapshots, loading }
}

// Get alert-worthy data: price swings, new debuts, status changes, discontinued
export function useAlerts() {
  const [alerts, setAlerts] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      // Fetch all snapshots in small pages to avoid timeout
      let allData = []
      let from = 0
      const pageSize = 500
      let keepGoing = true

      while (keepGoing) {
        const { data, error } = await supabase
          .from('v_snapshot_timeseries')
          .select('product_code, product_name, theme, price_usd, list_price_usd, in_stock, on_sale, is_new, availability_status, availability_text, scraped_date, slug, piece_count, rating, discount_usd, sale_percentage')
          .order('product_code', { ascending: true })
          .order('scraped_date', { ascending: true })
          .range(from, from + pageSize - 1)

        if (error || !data || data.length === 0) {
          keepGoing = false
        } else {
          allData = allData.concat(data)
          from += pageSize
          if (data.length < pageSize) keepGoing = false
        }
      }

      // Group by product_code
      const byProduct = new Map()
      for (const s of allData) {
        if (!byProduct.has(s.product_code)) byProduct.set(s.product_code, [])
        byProduct.get(s.product_code).push(s)
      }

      // Calculate price swings
      const priceSwings = []
      for (const [code, snaps] of byProduct) {
        if (snaps.length < 2) continue
        const sorted = snaps.sort((a, b) => a.scraped_date.localeCompare(b.scraped_date))
        const prices = sorted.filter(s => s.price_usd).map(s => Number(s.price_usd))
        if (prices.length < 2) continue
        const first = prices[0]
        const last = prices[prices.length - 1]
        const change = last - first
        const changePct = first > 0 ? (change / first) * 100 : 0
        const maxPrice = Math.max(...prices)
        const minPrice = Math.min(...prices)
        const latest = sorted[sorted.length - 1]
        priceSwings.push({
          product_code: code,
          product_name: latest.product_name,
          theme: latest.theme,
          slug: latest.slug,
          firstPrice: first,
          lastPrice: last,
          change,
          changePct,
          maxPrice,
          minPrice,
          absChange: Math.abs(change),
          absPct: Math.abs(changePct),
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
        })
      }
      priceSwings.sort((a, b) => b.absPct - a.absPct)

      // New debuts: products first seen in the most recent scrape dates
      const allDates = [...new Set(allData.map(s => s.scraped_date))].sort()
      const recentDates = allDates.slice(-3)
      const newDebuts = []
      for (const [code, snaps] of byProduct) {
        const sorted = snaps.sort((a, b) => a.scraped_date.localeCompare(b.scraped_date))
        const firstDate = sorted[0].scraped_date
        if (recentDates.includes(firstDate)) {
          const latest = sorted[sorted.length - 1]
          newDebuts.push({
            product_code: code,
            product_name: latest.product_name,
            theme: latest.theme,
            slug: latest.slug,
            price: Number(latest.price_usd) || 0,
            piece_count: Number(latest.piece_count) || 0,
            rating: latest.rating ? Number(latest.rating) : null,
            firstSeen: firstDate,
            is_new: latest.is_new,
          })
        }
      }
      newDebuts.sort((a, b) => b.price - a.price)

      // Status changes (availability_status changed between snapshots)
      // Compare NORMALIZED categories so F_BACKORDER_FOR_DATE ≠ G_BACKORDER
      const statusChanges = []
      for (const [code, snaps] of byProduct) {
        if (snaps.length < 2) continue
        const sorted = snaps.sort((a, b) => a.scraped_date.localeCompare(b.scraped_date))
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1]
          const curr = sorted[i]
          const prevCategory = normalizeStatus(prev.availability_status, prev.in_stock)
          const currCategory = normalizeStatus(curr.availability_status, curr.in_stock)
          // Only report when the normalized category actually changed
          if (prevCategory !== currCategory) {
            const prevDisplay = getStatusDisplay(prev.availability_status, prev.in_stock, prev.availability_text)
            const currDisplay = getStatusDisplay(curr.availability_status, curr.in_stock, curr.availability_text)
            statusChanges.push({
              product_code: code,
              product_name: curr.product_name,
              theme: curr.theme,
              slug: curr.slug,
              fromStatus: prevDisplay.displayLabel,
              toStatus: currDisplay.displayLabel,
              fromCategory: prevCategory,
              toCategory: currCategory,
              date: curr.scraped_date,
              price: Number(curr.price_usd) || 0,
            })
          }
        }
      }
      statusChanges.sort((a, b) => b.date.localeCompare(a.date))

      // Discontinued / retiring products
      const discontinued = statusChanges.filter(
        sc => sc.toCategory === 'retired' ||
              sc.toCategory === 'sold_out' ||
              (sc.toCategory === 'out_of_stock' && sc.fromCategory === 'in_stock')
      )

      // Status distribution over time — use normalized labels for clean chart legends
      const statusByDate = new Map()
      const allStatusLabels = new Set()
      for (const s of allData) {
        if (!s.scraped_date) continue
        const label = getStatusShortLabel(s.availability_status)
        allStatusLabels.add(label)
        if (!statusByDate.has(s.scraped_date)) statusByDate.set(s.scraped_date, {})
        const obj = statusByDate.get(s.scraped_date)
        obj[label] = (obj[label] || 0) + 1
      }
      const statuses = [...allStatusLabels].sort()
      const statusOverTime = {
        data: Array.from(statusByDate.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, obj]) => {
            const row = { date }
            for (const s of statuses) row[s] = obj[s] || 0
            return row
          }),
        statuses,
      }

      // Recently went on sale
      const newSales = []
      for (const [code, snaps] of byProduct) {
        if (snaps.length < 2) continue
        const sorted = snaps.sort((a, b) => a.scraped_date.localeCompare(b.scraped_date))
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].on_sale && !sorted[i - 1].on_sale) {
            newSales.push({
              product_code: code,
              product_name: sorted[i].product_name,
              theme: sorted[i].theme,
              slug: sorted[i].slug,
              price: Number(sorted[i].price_usd) || 0,
              listPrice: Number(sorted[i].list_price_usd) || 0,
              discount: Number(sorted[i].discount_usd) || 0,
              salePct: Number(sorted[i].sale_percentage) || 0,
              date: sorted[i].scraped_date,
            })
          }
        }
      }
      newSales.sort((a, b) => b.date.localeCompare(a.date))

      setAlerts({
        priceSwings: priceSwings.slice(0, 50),
        newDebuts: newDebuts.slice(0, 50),
        statusChanges: statusChanges.slice(0, 50),
        discontinued: discontinued.slice(0, 50),
        statusOverTime,
        newSales: newSales.slice(0, 50),
        totalProducts: byProduct.size,
        dateRange: allDates.length > 0 ? { first: allDates[0], last: allDates[allDates.length - 1] } : null,
      })
      setLoading(false)
    }
    fetch()
  }, [])

  return { alerts, loading }
}

// Get the most expensive sets (latest snapshot per product, sorted by price)
export function useMostExpensiveSets(limit = 20) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('v_latest_products')
        .select('*')
        .order('enriched_price_usd', { ascending: false, nullsFirst: false })
        .limit(limit)

      if (data) {
        const enriched = data.map(row => ({
          ...row,
          price_usd: row.enriched_price_usd || row.price_usd,
        }))
        setProducts(enriched)
      }
      setLoading(false)
    }
    fetch()
  }, [limit])

  return { products, loading }
}