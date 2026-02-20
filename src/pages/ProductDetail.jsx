import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Heart, Star, Package, Tag, Clock, TrendingDown, TrendingUp, ShoppingBag, CalendarDays, ExternalLink, Minus, BarChart3 } from 'lucide-react'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, BarChart, Bar, Cell } from 'recharts'
import { useProductDetail } from '../hooks/useData'
import { useFavorites } from '../hooks/useFavorites'
import { useAuth } from '../hooks/useAuth'
import { useMemo, useEffect } from 'react'
import { getStatusDisplay, isStatusInStock, getStatusChartColor } from '../lib/stockStatus'
import { trackProductView } from '../lib/analytics'

const TOOLTIP_STYLE = { background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '12px' }

function legoStoreUrl(product) {
  if (product.product_url) return product.product_url
  if (product.web_url) return product.web_url
  if (product.url) return product.url
  if (product.product_code) return `https://www.lego.com/en-us/product/${product.slug || product.product_code}`
  return null
}

export default function ProductDetail() {
  const { slug } = useParams()
  const { product, history, loading } = useProductDetail(slug)
  const { user } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()

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
      const prevDisplay = getStatusDisplay(prev.availability_status, prev.in_stock)
      const currDisplay = getStatusDisplay(curr.availability_status, curr.in_stock)
      if (prevDisplay.category !== currDisplay.category) {
        changes.push({ from: prevDisplay.displayLabel, to: currDisplay.displayLabel, date: curr.scraped_date })
      }
    }
    return changes
  }, [history])

  const stockChartData = useMemo(() => {
    return history.map(h => {
      const statusInfo = getStatusDisplay(h.availability_status, h.in_stock)
      return {
        date: new Date(h.scraped_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        status: statusInfo.displayLabel,
        inStock: statusInfo.isAvailable ? 1 : 0,
        color: statusInfo.color,
      }
    })
  }, [history])

  // Track product view — must be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (product?.product_name) {
      trackProductView(slug, product.product_name, product.theme, Number(product.price_usd))
    }
  }, [slug, product?.product_name])

  if (loading) return (
    <main className="pt-20 pb-16 px-6 min-h-screen">
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

  const hasDiscount = discount_usd && Number(discount_usd) > 0
  const firstSeen = history.length > 0 ? history[0].scraped_date : scraped_date
  const daysTracked = history.length > 1
    ? Math.round((new Date(history[history.length - 1].scraped_date) - new Date(history[0].scraped_date)) / 86400000)
    : 0
  const firstPrice = history.length > 0 ? Number(history[0].price_usd) : Number(price_usd)
  const currentPrice = Number(price_usd)
  const priceChange = currentPrice - firstPrice
  const priceChangePct = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(1) : 0

  const chartData = history.map(h => ({
    date: new Date(h.scraped_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: Number(h.price_usd),
    inStock: h.in_stock,
  }))

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
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
                <img src={imageUrl} alt={product_name || `Set ${product_code}`}
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
              <MiniStat icon={<CalendarDays size={13} />} label="First Seen" value={firstSeen ? new Date(firstSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} />
              <MiniStat icon={<ShoppingBag size={13} />} label="Status" 
                value={getStatusDisplay(availability_status, in_stock).displayLabel} 
                color={getStatusDisplay(availability_status, in_stock).textClass} />
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
                    {priceStats.minDate && <div className="text-[9px] text-gray-600">{new Date(priceStats.minDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-gray-500 uppercase">Average</div>
                    <div className="text-sm font-bold text-lego-yellow">${priceStats.avg.toFixed(2)}</div>
                    <div className="text-[9px] text-gray-600">{priceStats.dataPoints} data pts</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-gray-500 uppercase">High</div>
                    <div className="text-sm font-bold text-red-400">${priceStats.max.toFixed(2)}</div>
                    {priceStats.maxDate && <div className="text-[9px] text-gray-600">{new Date(priceStats.maxDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
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

            {/* Price history chart */}
            {chartData.length > 1 && (
              <div className="glass rounded-xl p-5">
                <h3 className="font-display font-semibold text-sm mb-1">Price History</h3>
                <p className="text-[10px] text-gray-500 mb-4">
                  {chartData.length} data points tracked
                  {priceStats && ` · Range: $${priceStats.min.toFixed(2)} – $${priceStats.max.toFixed(2)}`}
                </p>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
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

            {/* Stock availability chart */}
            {stockChartData.length > 1 && (
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
                            {new Date(change.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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

function StatusBadge({ status }) {
  const info = getStatusDisplay(status)
  return (
    <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full border ${info.bgClass} ${info.textClass} ${info.borderClass} whitespace-nowrap`}>
      {info.displayLabel}
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