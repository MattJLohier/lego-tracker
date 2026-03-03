import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Heart, Star, Package, Tag, Clock, TrendingDown, TrendingUp, ShoppingBag, CalendarDays, ExternalLink, Minus, BarChart3, Store, ChevronDown, ChevronUp, CheckCircle2, XCircle, Truck, AlertTriangle } from 'lucide-react'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, BarChart, Bar, Cell, LineChart, Line, Legend } from 'recharts'
import { useProductDetail, RETAILER_CONFIG } from '../hooks/useData'
import { useFavorites } from '../hooks/useFavorites'
import { useAuth } from '../hooks/useAuth'
import { useMemo, useEffect, useState } from 'react'
import { getStatusDisplay, isStatusInStock, getStatusChartColor } from '../lib/stockStatus'
import { trackProductView } from '../lib/analytics'
import SEO from '../components/SEO'

const TOOLTIP_STYLE = { background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '12px' }

function legoStoreUrl(product) {
  if (product.product_url) return product.product_url
  if (product.web_url) return product.web_url
  if (product.url) return product.url
  if (product.product_code) return `https://www.lego.com/en-us/product/${product.slug || product.product_code}`
  return null
}

function ProductSEO({ product, slug, priceStats }) {
  const currentPrice = Number(product.price_usd)
  const imageUrl = product._resolved_image_url || product.image_url || product.img_url || product.primary_image_url
    || product.thumbnail_url || product.image || product.product_image_url || product.enriched_image_url || null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `LEGO ${product.product_name} (${product.product_code})`,
    image: imageUrl,
    description: `Price tracking and market data for LEGO ${product.product_name} — Set #${product.product_code}.${product.piece_count ? ` ${Number(product.piece_count).toLocaleString()} pieces.` : ''}${product.theme ? ` ${product.theme} theme.` : ''}`,
    sku: product.product_code,
    brand: {
      '@type': 'Brand',
      name: 'LEGO',
    },
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: priceStats ? priceStats.min.toFixed(2) : currentPrice.toFixed(2),
      highPrice: priceStats ? priceStats.max.toFixed(2) : currentPrice.toFixed(2),
      priceCurrency: 'USD',
      availability: product.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      offerCount: 1,
    },
    ...(product.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(product.rating).toFixed(1),
        bestRating: '5',
        ratingCount: 1,
      },
    }),
  }

  const titleParts = [
    `LEGO ${product.product_name}`,
    product.product_code ? `(${product.product_code})` : '',
    '— Price History & Deals',
  ].filter(Boolean).join(' ')

  const descParts = [
    `Current price: $${currentPrice.toFixed(2)}.`,
    `Track price history, get deal alerts, and compare market values for LEGO ${product.product_name} Set #${product.product_code}.`,
    product.piece_count ? `${Number(product.piece_count).toLocaleString()} pieces.` : '',
    product.theme ? `${product.theme} theme.` : '',
  ].filter(Boolean).join(' ')

  return (
    <SEO
      title={titleParts}
      description={descParts}
      path={`/product/${slug}`}
      image={imageUrl || undefined}
      type="product"
      jsonLd={jsonLd}
    />
  )
}

// ── Helper: normalize a retailer price row to { date, price } ──
function normalizeRetailerPrice(source, row) {
  switch (source) {
    case 'bestbuy': return { date: row.scraped_date, price: Number(row.sale_price) || null }
    case 'amazon':  return { date: row.scraped_date, price: Number(row.price) || null }
    case 'target':  return { date: row.scraped_date, price: Number(row.sale_price) || null }
    case 'walmart': return { date: row.scraped_date, price: Number(row.sale_price) || null }
    default:        return { date: row.scraped_date, price: null }
  }
}

// ── Helper: get latest row from a retailer history array ──
function getLatestRetailer(source, rows) {
  if (!rows || rows.length === 0) return null
  const latest = rows[rows.length - 1]
  switch (source) {
    case 'bestbuy': return {
      source: 'bestbuy',
      name: latest.product_name,
      price: Number(latest.sale_price) || null,
      regularPrice: Number(latest.regular_price) || null,
      onSale: latest.on_sale,
      salePct: Number(latest.percent_savings) || null,
      available: latest.online_available,
      inStore: latest.in_store_available,
      freeShipping: latest.free_shipping,
      reviewAvg: Number(latest.review_avg) || null,
      reviewCount: Number(latest.review_count) || 0,
      url: latest.product_url,
      date: latest.scraped_date,
      dataPoints: rows.length,
    }
    case 'walmart': return {
      source: 'walmart',
      name: latest.product_name,
      price: Number(latest.sale_price) || null,
      regularPrice: Number(latest.regular_price) || null,
      onSale: latest.on_sale,
      salePct: Number(latest.percent_savings) || null,
      available: latest.availability_status === 'IN_STOCK' || latest.availability_status === 'AVAILABLE',
      inStore: null,
      freeShipping: null,
      reviewAvg: Number(latest.review_avg) || null,
      reviewCount: Number(latest.review_count) || 0,
      url: latest.product_url,
      date: latest.scraped_date,
      dataPoints: rows.length,
    }
    case 'amazon': return {
      source: 'amazon',
      name: latest.product_name,
      price: Number(latest.price) || null,
      regularPrice: null,
      onSale: false,
      salePct: null,
      available: latest.price > 0,
      inStore: null,
      freeShipping: null,
      reviewAvg: Number(latest.review_avg) || null,
      reviewCount: Number(latest.review_count) || 0,
      url: latest.product_url,
      date: latest.scraped_date,
      dataPoints: rows.length,
    }
    case 'target': return {
      source: 'target',
      name: latest.product_name,
      price: Number(latest.sale_price) || null,
      regularPrice: Number(latest.regular_price) || null,
      onSale: latest.on_sale,
      salePct: Number(latest.percent_savings) || null,
      available: true, // Target doesn't give us stock boolean; presence = available
      inStore: null,
      freeShipping: latest.free_shipping,
      reviewAvg: Number(latest.review_avg) || null,
      reviewCount: Number(latest.review_count) || 0,
      url: latest.product_url,
      date: latest.scraped_date,
      dataPoints: rows.length,
    }
    default: return null
  }
}


export default function ProductDetail() {
  const { slug } = useParams()
  const { product, history, loading, retailerPrices, retailerHistory, retailerLoading } = useProductDetail(slug)
  const { user } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [showAllRetailers, setShowAllRetailers] = useState(false)

  // ── Which retailer lines to show on chart ──
  const [enabledLines, setEnabledLines] = useState({ lego: true, bestbuy: true, amazon: true, target: true, walmart: true })
  const toggleLine = (key) => setEnabledLines(prev => ({ ...prev, [key]: !prev[key] }))

  const priceStats = useMemo(() => {
    const prices = history.filter(h => h.price_usd).map(h => Number(h.price_usd))
    if (prices.length === 0) return null
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    const minDate = history.find(h => Number(h.price_usd) === min)?.scraped_date
    const maxDate = history.find(h => Number(h.price_usd) === max)?.scraped_date
    return { min, max, avg, minDate, maxDate, dataPoints: prices.length }
  }, [history])

  const statusTimeline = useMemo(() => {
    if (history.length < 2) return []
    const changes = []
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1]
      const curr = history[i]
      const prevDisplay = getStatusDisplay(prev.availability_status, prev.in_stock, prev.availability_text)
      const currDisplay = getStatusDisplay(curr.availability_status, curr.in_stock, curr.availability_text)
      if (prevDisplay.category !== currDisplay.category) {
        changes.push({ from: prevDisplay.displayLabel, to: currDisplay.displayLabel, date: curr.scraped_date })
      }
    }
    return changes
  }, [history])

  const stockChartData = useMemo(() => {
    return history.map(h => {
      const statusInfo = getStatusDisplay(h.availability_status, h.in_stock, h.availability_text)
      return {
        date: new Date(h.scraped_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        status: statusInfo.displayLabel,
        inStock: 1,
        color: statusInfo.color,
      }
    })
  }, [history])

  // ── Build unified multi-source chart data ──
  const multiSourceChartData = useMemo(() => {
    // Collect all dates across all sources
    const dateMap = new Map() // date string → { lego, bestbuy, amazon, target }

    // LEGO.com data
    for (const h of history) {
      const dateKey = h.scraped_date
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, {})
      dateMap.get(dateKey).lego = Number(h.price_usd) || null
    }

    // Retailer data
    for (const [source, rows] of Object.entries(retailerHistory)) {
      for (const row of rows) {
        const dateKey = row.scraped_date
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, {})
        const normalized = normalizeRetailerPrice(source, row)
        dateMap.get(dateKey)[source] = normalized.price
      }
    }

    // Sort by date and format
    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, prices]) => ({
        date: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        rawDate: dateKey,
        lego: prices.lego ?? null,
        bestbuy: prices.bestbuy ?? null,
        amazon: prices.amazon ?? null,
        target: prices.target ?? null,
        walmart: prices.walmart ?? null,
      }))
  }, [history, retailerHistory])

  // ── Which sources actually have data for the chart ──
  const activeSources = useMemo(() => {
    const sources = ['lego']
    for (const s of ['bestbuy', 'amazon', 'target', 'walmart']) {
      if (retailerHistory[s]?.length > 0) sources.push(s)
    }
    return sources
  }, [retailerHistory])

  // ── Get all-source price range for chart Y axis ──
  const allSourcePriceStats = useMemo(() => {
    const allPrices = multiSourceChartData.flatMap(d =>
      [d.lego, d.bestbuy, d.amazon, d.target, d.walmart].filter(p => p != null && p > 0)
    )
    if (allPrices.length === 0) return null
    return {
      min: Math.min(...allPrices),
      max: Math.max(...allPrices),
      dataPoints: multiSourceChartData.length,
    }
  }, [multiSourceChartData])

  // ── Retailer summary cards ──
  const retailerCards = useMemo(() => {
    const cards = []
    for (const [source, rows] of Object.entries(retailerHistory)) {
      const info = getLatestRetailer(source, rows)
      if (info) cards.push(info)
    }
    // Sort: cheapest first
    cards.sort((a, b) => (a.price || 999999) - (b.price || 999999))
    return cards
  }, [retailerHistory])

  // ── Best price across all sources ──
  const bestPrice = useMemo(() => {
    const currentLego = Number(product?.price_usd) || 999999
    const candidates = [{ source: 'lego', price: currentLego }]
    for (const card of retailerCards) {
      if (card.price) candidates.push({ source: card.source, price: card.price })
    }
    candidates.sort((a, b) => a.price - b.price)
    return candidates[0] || null
  }, [product, retailerCards])

  // ── Retailer stock chart data (multi-source) ──
  const retailerStockChartData = useMemo(() => {
    // Build date-indexed availability per source
    const dateMap = new Map()

    // LEGO.com
    for (const h of history) {
      const dateKey = h.scraped_date
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, {})
      dateMap.get(dateKey).lego = h.in_stock
    }

    // Best Buy
    if (retailerHistory.bestbuy) {
      for (const row of retailerHistory.bestbuy) {
        const dateKey = row.scraped_date
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, {})
        dateMap.get(dateKey).bestbuy = row.online_available
      }
    }

    // Amazon (available if price > 0)
    if (retailerHistory.amazon) {
      for (const row of retailerHistory.amazon) {
        const dateKey = row.scraped_date
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, {})
        dateMap.get(dateKey).amazon = Number(row.price) > 0
      }
    }

    // Target (present = available)
    if (retailerHistory.target) {
      for (const row of retailerHistory.target) {
        const dateKey = row.scraped_date
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, {})
        dateMap.get(dateKey).target = true
      }
    }

    // Walmart
    if (retailerHistory.walmart) {
      for (const row of retailerHistory.walmart) {
        const dateKey = row.scraped_date
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, {})
        dateMap.get(dateKey).walmart = row.availability_status === 'IN_STOCK' || row.availability_status === 'AVAILABLE'
      }
    }

    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, avail]) => ({
        date: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        rawDate: dateKey,
        ...avail,
      }))
  }, [history, retailerHistory])

  // Track product view — must be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (product?.product_name) {
      trackProductView(slug, product.product_name, product.theme, Number(product.price_usd))
    }
  }, [slug, product?.product_name])

  if (loading) return (
    <main className="pt-20 pb-16 px-6 min-h-screen">
      <SEO
        title="Loading set..."
        description="Loading LEGO set details on StudMetrics."
        path={`/product/${slug}`}
        noindex={true}
      />
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6 pt-10">
          <div className="h-8 bg-lego-surface2 rounded w-1/3" />
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-lego-surface2 rounded-xl" />
            <div className="space-y-4"><div className="h-6 bg-lego-surface2 rounded w-1/2" /><div className="h-10 bg-lego-surface2 rounded w-1/3" /></div>
          </div>
        </div>
      </div>
    </main>
  )

  if (!product) return (
    <main className="pt-20 pb-16 px-6 min-h-screen flex items-center justify-center">
      <SEO
        title="Set Not Found"
        description="This LEGO set could not be found on StudMetrics."
        path={`/product/${slug}`}
        noindex={true}
      />
      <div className="text-center">
        <p className="text-gray-500 font-display text-lg mb-4">Product not found</p>
        <Link to="/explore" className="text-lego-red text-sm hover:underline">← Back to Explorer</Link>
      </div>
    </main>
  )

  const {
    product_name, product_code, theme, price_usd, list_price_usd, piece_count,
    rating, age_range, in_stock, on_sale, is_new, discount_usd, price_per_piece,
    availability_status, vip_points, sale_percentage, featured_flags, scraped_date,
  } = product

  const imageUrl = product._resolved_image_url || product.image_url || product.img_url || product.primary_image_url
    || product.thumbnail_url || product.image || product.product_image_url || product.enriched_image_url || null

  const storeUrl = legoStoreUrl(product)

  const hasDiscount = Number(discount_usd) > 0
  const firstSeen = history.length > 0 ? history[0].scraped_date : scraped_date
  const daysTracked = history.length > 1
    ? Math.round((new Date(history[history.length - 1].scraped_date) - new Date(history[0].scraped_date)) / 86400000)
    : 0
  const firstPrice = history.length > 0 ? Number(history[0].price_usd) : Number(price_usd)
  const currentPrice = Number(price_usd)
  const priceChange = currentPrice - firstPrice
  const priceChangePct = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(1) : 0

  const hasMultipleSources = activeSources.length > 1
  const chartData = hasMultipleSources ? multiSourceChartData : history.map(h => ({
    date: new Date(h.scraped_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    price: Number(h.price_usd),
    inStock: h.in_stock,
  }))

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <ProductSEO product={product} slug={slug} priceStats={priceStats} />

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/explore" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back to Explorer
          </Link>
          {storeUrl && (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lego-blue hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
              <ExternalLink size={13} /> View on LEGO.com
            </a>
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: image + quick stats */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-xl aspect-square flex items-center justify-center relative overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt={`LEGO ${product_name || 'Set'} ${product_code} — ${theme || 'product'} box and pieces`}
                  className="max-h-full max-w-full object-contain drop-shadow-lg p-4"
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentElement.querySelector('.fallback-code').style.display = 'block' }}
                />
              ) : null}
              <div className={`fallback-code text-6xl font-display font-bold text-gray-700/20${imageUrl ? ' hidden' : ''}`}>{product_code}</div>
              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                {is_new && <span className="px-2.5 py-0.5 bg-lego-blue text-white text-[10px] font-bold uppercase rounded-full">New</span>}
                {on_sale && <span className="px-2.5 py-0.5 bg-lego-red text-white text-[10px] font-bold uppercase rounded-full">Sale</span>}
              </div>
              {user && (
                <button onClick={() => toggleFavorite(product_code, slug)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all">
                  <Heart size={18} className={isFavorite(product_code) ? 'fill-lego-red text-lego-red' : 'text-white/60'} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MiniStat icon={<Clock size={13} />} label="Days Tracked" value={daysTracked} />
              <MiniStat icon={<CalendarDays size={13} />} label="First Seen" value={firstSeen ? new Date(firstSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—'} />
              <MiniStat icon={<ShoppingBag size={13} />} label="Status" 
                value={getStatusDisplay(availability_status, in_stock, product.availability_text).displayLabel} 
                color={getStatusDisplay(availability_status, in_stock, product.availability_text).textClass} />
              <MiniStat icon={<Star size={13} />} label="VIP Points" value={vip_points || '—'} />
            </div>

            {/* Price statistics card */}
            {priceStats && priceStats.dataPoints > 1 && (
              <div className="glass rounded-xl p-4">
                <h3 className="font-display font-semibold text-xs mb-3 flex items-center gap-1.5">
                  <BarChart3 size={13} className="text-lego-yellow" /> Price Statistics
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[9px] font-mono text-gray-500 uppercase">Low</div>
                    <div className="text-sm font-bold text-green-400">${priceStats.min.toFixed(2)}</div>
                    {priceStats.minDate && <div className="text-[9px] text-gray-600">{new Date(priceStats.minDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</div>}
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-gray-500 uppercase">Average</div>
                    <div className="text-sm font-bold text-lego-yellow">${priceStats.avg.toFixed(2)}</div>
                    <div className="text-[9px] text-gray-600">{priceStats.dataPoints} data pts</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-gray-500 uppercase">High</div>
                    <div className="text-sm font-bold text-red-400">${priceStats.max.toFixed(2)}</div>
                    {priceStats.maxDate && <div className="text-[9px] text-gray-600">{new Date(priceStats.maxDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</div>}
                  </div>
                </div>
                {/* Price range visual bar */}
                <div className="mt-3">
                  <div className="relative h-2 bg-lego-surface2 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-green-500 via-lego-yellow to-red-500 rounded-full" />
                    {priceStats.max > priceStats.min && (
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-lego-surface shadow-lg"
                        style={{ left: `${Math.min(95, Math.max(5, ((currentPrice - priceStats.min) / (priceStats.max - priceStats.min)) * 100))}%` }}
                        title={`Current: $${currentPrice.toFixed(2)}`}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-1 text-[8px] text-gray-600">
                    <span>${priceStats.min.toFixed(2)}</span>
                    <span className="text-white font-semibold">Now: ${currentPrice.toFixed(2)}</span>
                    <span>${priceStats.max.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Retailer Price Cards (left sidebar) ── */}
            {retailerCards.length > 0 && (
              <div className="glass rounded-xl p-4">
                <h3 className="font-display font-semibold text-xs mb-3 flex items-center gap-1.5">
                  <Store size={13} className="text-lego-blue" /> Where to Buy
                </h3>

                {/* Best price banner */}
                {bestPrice && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="text-[9px] font-mono text-green-400 uppercase tracking-wider mb-0.5">Best Price</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-green-400">${bestPrice.price.toFixed(2)}</span>
                      <span className="text-[10px] text-gray-400">at {RETAILER_CONFIG[bestPrice.source]?.label}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {/* Always show LEGO.com */}
                  <RetailerCard
                    source="lego"
                    price={currentPrice}
                    regularPrice={Number(list_price_usd) || null}
                    onSale={on_sale}
                    available={in_stock}
                    url={storeUrl}
                    reviewAvg={rating ? Number(rating) : null}
                    isBest={bestPrice?.source === 'lego'}
                    date={scraped_date}
                  />
                  {/* Other retailers */}
                  {retailerCards.map(card => (
                    <RetailerCard
                      key={card.source}
                      source={card.source}
                      price={card.price}
                      regularPrice={card.regularPrice}
                      onSale={card.onSale}
                      salePct={card.salePct}
                      available={card.available}
                      freeShipping={card.freeShipping}
                      url={card.url}
                      reviewAvg={card.reviewAvg}
                      reviewCount={card.reviewCount}
                      isBest={bestPrice?.source === card.source}
                      date={card.date}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: details */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                {theme && <p className="text-xs font-mono uppercase tracking-wider text-gray-500">{theme}</p>}
                <h1 className="font-display font-bold text-2xl sm:text-3xl leading-tight">{product_name}</h1>
              </div>
              {storeUrl && (
                <a href={storeUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 p-2 rounded-lg glass text-gray-400 hover:text-lego-blue hover:border-lego-blue/30 transition-all" title="View on LEGO.com">
                  <ExternalLink size={16} />
                </a>
              )}
            </div>

            {/* Price block */}
            <div className="glass rounded-xl p-5">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-display font-bold text-3xl text-lego-yellow">${currentPrice.toFixed(2)}</span>
                {hasDiscount && <span className="text-base text-gray-500 line-through">${Number(list_price_usd).toFixed(2)}</span>}
                {hasDiscount && <span className="px-2 py-0.5 bg-lego-red/20 text-lego-red text-xs font-bold rounded-full">−{Number(sale_percentage).toFixed(0)}%</span>}
                {/* Source count badge */}
                {retailerCards.length > 0 && (
                  <span className="px-2 py-0.5 bg-lego-surface2 text-gray-400 text-[10px] font-mono rounded-full">
                    {retailerCards.length + 1} sources
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InfoItem icon={<Package size={14} />} label="Pieces" value={piece_count ? Number(piece_count).toLocaleString() : '—'} />
                <InfoItem icon={<Tag size={14} />} label="Price/Piece" value={price_per_piece && Number(price_per_piece) < 50 ? `$${Number(price_per_piece).toFixed(3)}` : '—'} />
                <InfoItem icon={<Star size={14} />} label="Rating" value={rating ? `${Number(rating).toFixed(1)} / 5` : '—'} />
                <InfoItem label="Age" value={age_range || '—'} />
              </div>
            </div>

            {/* Price change since listed */}
            {history.length > 1 && (
              <div className="glass rounded-xl p-5">
                <h3 className="font-display font-semibold text-sm mb-3">Price Change Since First Tracked</h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className={`flex items-center gap-1 text-xl font-display font-bold
                    ${priceChange > 0 ? 'text-red-400' : priceChange < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {priceChange > 0 ? <TrendingUp size={20} /> : priceChange < 0 ? <TrendingDown size={20} /> : <Minus size={20} />}
                    {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}
                  </div>
                  <span className={`text-sm font-mono ${priceChange > 0 ? 'text-red-400' : priceChange < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    ({priceChangePct > 0 ? '+' : ''}{priceChangePct}%)
                  </span>
                  <span className="text-xs text-gray-500">from ${firstPrice.toFixed(2)} → ${currentPrice.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                PRICE HISTORY CHART — multi-source when retailers exist
               ══════════════════════════════════════════════════════════ */}
            {chartData.length > 1 && (
              <div className="glass rounded-xl p-5">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-display font-semibold text-sm">Price History</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {hasMultipleSources
                        ? `${multiSourceChartData.length} data points · ${activeSources.length} sources tracked`
                        : `${chartData.length} data points tracked`}
                      {priceStats && ` · Range: $${(allSourcePriceStats || priceStats).min.toFixed(2)} – $${(allSourcePriceStats || priceStats).max.toFixed(2)}`}
                    </p>
                  </div>
                </div>

                {/* Source toggle pills (only when multiple sources) */}
                {hasMultipleSources && (
                  <div className="flex flex-wrap gap-1.5 mb-4 mt-2">
                    {activeSources.map(source => {
                      const cfg = RETAILER_CONFIG[source]
                      const enabled = enabledLines[source]
                      return (
                        <button
                          key={source}
                          onClick={() => toggleLine(source)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                            enabled
                              ? 'border-transparent'
                              : 'border-lego-border opacity-40 bg-transparent'
                          }`}
                          style={enabled ? { backgroundColor: cfg.color + '20', color: cfg.color, borderColor: cfg.color + '40' } : {}}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: enabled ? cfg.color : '#555' }} />
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {hasMultipleSources ? (
                      /* ── Multi-source line chart ── */
                      <LineChart data={multiSourceChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" />
                        <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `$${v}`}
                          domain={[
                            (allSourcePriceStats?.min || 0) * 0.95,
                            (allSourcePriceStats?.max || 100) * 1.05
                          ]}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null
                            return (
                              <div className="glass rounded-lg p-3 border border-lego-border text-xs min-w-[160px]">
                                <div className="text-white font-semibold mb-2">{label}</div>
                                {payload
                                  .filter(p => p.value != null)
                                  .sort((a, b) => a.value - b.value)
                                  .map(p => {
                                    const cfg = RETAILER_CONFIG[p.dataKey]
                                    return (
                                      <div key={p.dataKey} className="flex items-center justify-between gap-3 py-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg?.color }} />
                                          <span className="text-gray-400">{cfg?.label}</span>
                                        </div>
                                        <span className="font-bold" style={{ color: cfg?.color }}>${p.value.toFixed(2)}</span>
                                      </div>
                                    )
                                  })}
                              </div>
                            )
                          }}
                        />
                        {activeSources.map(source => {
                          const cfg = RETAILER_CONFIG[source]
                          if (!enabledLines[source]) return null
                          return (
                            <Line
                              key={source}
                              type="monotone"
                              dataKey={source}
                              stroke={cfg.stroke}
                              strokeWidth={source === 'lego' ? 2.5 : 1.8}
                              dot={{ fill: cfg.color, r: 2.5, strokeWidth: 0 }}
                              activeDot={{ r: 5, strokeWidth: 2, stroke: '#16161F' }}
                              connectNulls={true}
                              strokeDasharray={source === 'lego' ? undefined : undefined}
                            />
                          )
                        })}
                      </LineChart>
                    ) : (
                      /* ── Single-source area chart (original) ── */
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFD500" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#FFD500" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" />
                        <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `$${v}`} domain={['dataMin - 5', 'dataMax + 5']} />
                        <Tooltip contentStyle={TOOLTIP_STYLE}
                          content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null
                            const d = payload[0].payload
                            return (
                              <div className="glass rounded-lg p-3 border border-lego-border text-xs">
                                <div className="text-white font-semibold mb-1">{d.date}</div>
                                <div className="text-lego-yellow font-bold">${d.price.toFixed(2)}</div>
                                <div className={`text-[10px] ${d.inStock ? 'text-green-400' : 'text-red-400'}`}>
                                  {d.inStock ? '● In Stock' : '● Out of Stock'}
                                </div>
                              </div>
                            )
                          }}
                        />
                        <Area type="monotone" dataKey="price" stroke="#FFD500" fill="url(#priceGrad)" strokeWidth={2} dot={{ fill: '#FFD500', r: 3 }} activeDot={{ r: 5 }} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {chartData.length <= 1 && (
              <div className="glass rounded-xl p-8 text-center">
                <Clock size={24} className="mx-auto text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">Price history will appear after 2+ days of tracking</p>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STOCK AVAILABILITY — multi-source when retailers exist
               ══════════════════════════════════════════════════════════ */}
            {stockChartData.length > 1 && !hasMultipleSources && (
              /* Original single-source stock chart (LEGO.com only) */
              <div className="glass rounded-xl p-5">
                <h3 className="font-display font-semibold text-sm mb-1">Stock Availability Over Time</h3>
                <p className="text-[10px] text-gray-500 mb-4">Green = available · Orange = backorder/limited · Red = out of stock</p>
                <div className="h-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockChartData} barCategoryGap={0}>
                      <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 9 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE}
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null
                          const d = payload[0].payload
                          return (
                            <div className="glass rounded-lg p-2 border border-lego-border text-xs">
                              <div className="text-white font-semibold">{d.date}</div>
                              <div style={{ color: d.color }}>{d.status}</div>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="inStock" radius={[2, 2, 0, 0]}>
                        {stockChartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Multi-source stock availability grid ── */}
            {hasMultipleSources && retailerStockChartData.length > 1 && (
              <div className="glass rounded-xl p-5">
                <h3 className="font-display font-semibold text-sm mb-1">Stock Availability by Retailer</h3>
                <p className="text-[10px] text-gray-500 mb-4">Tracking availability across {activeSources.length} sources</p>

                {/* Heatmap-style grid */}
                <div className="overflow-x-auto">
                  <div className="min-w-[400px]">
                    {/* Header row: dates */}
                    <div className="flex items-center gap-0 mb-1">
                      <div className="w-20 shrink-0" />
                      {retailerStockChartData.map((d, i) => (
                        <div key={i} className="flex-1 text-center text-[8px] text-gray-600 font-mono truncate px-0.5">
                          {/* Show every Nth label to avoid crowding */}
                          {i % Math.max(1, Math.floor(retailerStockChartData.length / 8)) === 0 ? d.date : ''}
                        </div>
                      ))}
                    </div>

                    {/* One row per source */}
                    {activeSources.map(source => {
                      const cfg = RETAILER_CONFIG[source]
                      return (
                        <div key={source} className="flex items-center gap-0 mb-1">
                          <div className="w-20 shrink-0 text-[10px] font-semibold truncate pr-2" style={{ color: cfg.color }}>
                            {cfg.label}
                          </div>
                          {retailerStockChartData.map((d, i) => {
                            const val = d[source]
                            const hasData = val !== undefined
                            const isAvailable = val === true
                            return (
                              <div
                                key={i}
                                className="flex-1 h-5 mx-px rounded-sm transition-colors"
                                style={{
                                  backgroundColor: !hasData ? '#1a1a26' : isAvailable ? '#22c55e40' : '#ef444440',
                                  border: hasData ? `1px solid ${isAvailable ? '#22c55e30' : '#ef444430'}` : '1px solid #1a1a26',
                                }}
                                title={`${cfg.label} — ${d.date}: ${!hasData ? 'No data' : isAvailable ? 'Available' : 'Unavailable'}`}
                              />
                            )
                          })}
                        </div>
                      )
                    })}

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-3 text-[9px] text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500/40 border border-green-500/30" /> Available</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500/25 border border-red-500/20" /> Unavailable</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#1a1a26] border border-[#1a1a26]" /> No data</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status timeline */}
            {statusTimeline.length > 0 && (
              <div className="glass rounded-xl p-5">
                <h3 className="font-display font-semibold text-sm mb-4">Status Timeline</h3>
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-lego-border" />
                  <div className="space-y-4">
                    {statusTimeline.map((change, i) => (
                      <div key={i} className="flex items-start gap-3 pl-1">
                        <div className="relative z-10 w-5 h-5 rounded-full bg-lego-surface2 border-2 border-lego-border flex items-center justify-center shrink-0 mt-0.5">
                        <div className={`w-2 h-2 rounded-full ${getStatusDisplay(change.to).dotClass}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={change.from} />
                            <span className="text-gray-600 text-[10px]">→</span>
                            <StatusBadge status={change.to} />
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">
                            {new Date(change.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Featured flags */}
            {featured_flags && (
              <div className="flex flex-wrap gap-2">
                {String(featured_flags).split(',').filter(Boolean).map(flag => (
                  <span key={flag} className="px-2.5 py-1 glass rounded-full text-[10px] font-mono text-gray-400">{flag.trim()}</span>
                ))}
              </div>
            )}

            {/* Store link footer */}
            {storeUrl && (
              <a href={storeUrl} target="_blank" rel="noopener noreferrer"
                className="block glass rounded-xl p-4 hover:bg-white/[0.03] transition-colors text-center group">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400 group-hover:text-lego-blue transition-colors">
                  <ExternalLink size={15} />
                  <span className="font-semibold">View on LEGO.com</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-xs font-mono text-gray-500">Set #{product_code}</span>
                </div>
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

// ══════════════════════════════════════════════════════════════
// RETAILER CARD — compact card for "Where to Buy" sidebar
// ══════════════════════════════════════════════════════════════
function RetailerCard({ source, price, regularPrice, onSale, salePct, available, freeShipping, url, reviewAvg, reviewCount, isBest, date }) {
  const cfg = RETAILER_CONFIG[source]
  if (!cfg) return null

  const hasPrice = price != null && price > 0

  return (
    <a
      href={url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-lg p-3 transition-all border hover:bg-white/[0.03] ${
        isBest ? 'border-green-500/30 bg-green-500/5' : 'border-lego-border bg-lego-surface/50'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
          <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          {isBest && <span className="text-[8px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full uppercase">Best</span>}
        </div>
        <ExternalLink size={11} className="text-gray-600" />
      </div>

      <div className="flex items-baseline gap-2">
        {hasPrice ? (
          <>
            <span className="text-base font-bold text-white">${price.toFixed(2)}</span>
            {onSale && regularPrice && regularPrice > price && (
              <span className="text-[10px] text-gray-500 line-through">${regularPrice.toFixed(2)}</span>
            )}
            {onSale && salePct > 0 && (
              <span className="text-[9px] font-bold text-lego-red">−{salePct.toFixed(0)}%</span>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-500">Price unavailable</span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {/* Availability */}
        {available != null && (
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium ${available ? 'text-green-400' : 'text-red-400'}`}>
            {available ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
            {available ? 'In Stock' : 'Out of Stock'}
          </span>
        )}
        {/* Free shipping */}
        {freeShipping && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-blue-400">
            <Truck size={9} /> Free Ship
          </span>
        )}
        {/* Rating */}
        {reviewAvg > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[9px] text-gray-500">
            <Star size={8} className="text-lego-yellow fill-lego-yellow" /> {reviewAvg.toFixed(1)}
            {reviewCount > 0 && <span>({reviewCount.toLocaleString()})</span>}
          </span>
        )}
      </div>

      {/* Last updated */}
      {date && (
        <div className="text-[8px] text-gray-600 mt-1.5">
          Updated {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
        </div>
      )}
    </a>
  )
}

function StatusBadge({ status, availabilityText }) {
  const info = getStatusDisplay(status, undefined, availabilityText)
  // Preserve enriched labels like "Backorder (Mar 7)" that were already resolved
  const isEnrichedLabel = status && status.startsWith('Backorder (') && status !== 'Backorder (Dated)'
  const label = isEnrichedLabel ? status : info.displayLabel
  return (
    <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full border ${info.bgClass} ${info.textClass} ${info.borderClass} whitespace-nowrap`}>
      {label}
    </span>
  )
}

function MiniStat({ icon, label, value, color = 'text-white' }) {
  return (
    <div className="glass rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">{icon}<span className="text-[10px] font-mono uppercase tracking-wider">{label}</span></div>
      <div className={`text-sm font-semibold ${color}`}>{value}</div>
    </div>
  )
}

function InfoItem({ icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-gray-500 mb-0.5">{icon}<span className="text-[10px] font-mono uppercase tracking-wider">{label}</span></div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}