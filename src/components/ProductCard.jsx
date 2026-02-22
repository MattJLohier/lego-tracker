import { Link } from 'react-router-dom'
import { Star, Package, Tag, TrendingDown, TrendingUp, Minus, Heart, ExternalLink, Clock, ShoppingBag } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useMemo } from 'react'
import { getStatusDisplay, isStatusInStock } from '../lib/stockStatus'

function legoStoreUrl(product) {
  if (product.product_url) return product.product_url
  if (product.web_url) return product.web_url
  if (product.url) return product.url
  if (product.product_code) return `https://www.lego.com/en-us/product/${product.slug || product.product_code}`
  return null
}

// Tiny SVG sparkline — no recharts dependency, renders instantly
function Sparkline({ data, width = 100, height = 28, color = '#FFD500', fillColor = 'rgba(255,213,0,0.15)' }) {
  if (!data || data.length < 2) return null
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const padY = 2

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - padY - ((v - min) / range) * (height - padY * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const linePath = `M${points.join(' L')}`
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <path d={fillPath} fill={fillColor} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={parseFloat(points[points.length - 1].split(',')[0])}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r="2" fill={color}
      />
    </svg>
  )
}

// Tiny stock availability bar
function StockBar({ data, height = 6 }) {
  if (!data || data.length < 1) return null
  return (
    <div className="flex gap-px rounded-full overflow-hidden" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1"
          style={{ backgroundColor: d.color || (d.inStock ? '#34d399' : '#f87171'), opacity: 0.8 }}
        />
      ))}
    </div>
  )
}

export default function ProductCard({ product, history, isFavorite, onToggleFavorite, showCompare, isCompared, onToggleCompare }) {
  const { user } = useAuth()
  const {
    product_name, product_code, slug, theme, price_usd, list_price_usd,
    piece_count, rating, in_stock, on_sale, is_new, discount_usd, price_per_piece,
    sale_percentage, availability_status,
  } = product

  const imageUrl = product.image_url || product.img_url || product.primary_image_url
    || product.thumbnail_url || product.image || product.product_image_url || null

  const storeUrl = legoStoreUrl(product)
  const hasDiscount = !!discount_usd && Number(discount_usd) > 0
  const salePct = sale_percentage ? Number(sale_percentage) : (hasDiscount && list_price_usd && Number(list_price_usd) > 0)
    ? Math.round((Number(discount_usd) / Number(list_price_usd)) * 100) : 0

  // Derive sparkline and stock data from history
  const { priceData, stockData, daysTracked, priceChange, priceChangePct, daysInStock, daysTotal } = useMemo(() => {
    if (!history || history.length === 0) {
      return { priceData: [], stockData: [], daysTracked: 0, priceChange: 0, priceChangePct: 0, daysInStock: 0, daysTotal: 0 }
    }

    const priceData = history
      .filter(h => h.price_usd && Number(h.price_usd) > 0)
      .map(h => ({ value: Number(h.price_usd) }))

    const stockData = history.map(h => {
      const available = isStatusInStock(h.availability_status, h.in_stock)
      const statusInfo = getStatusDisplay(h.availability_status, h.in_stock)
      return { inStock: available, color: statusInfo.color }
    })

    const first = history[0]
    const last = history[history.length - 1]
    const daysTracked = history.length > 1
      ? Math.round((new Date(last.scraped_date) - new Date(first.scraped_date)) / 86400000)
      : 0

    const firstPrice = priceData.length > 0 ? priceData[0].value : 0
    const lastPrice = priceData.length > 0 ? priceData[priceData.length - 1].value : 0
    const priceChange = lastPrice - firstPrice
    const priceChangePct = firstPrice > 0 ? ((priceChange / firstPrice) * 100) : 0

    const daysInStock = history.filter(h => isStatusInStock(h.availability_status, h.in_stock)).length
    const daysTotal = history.length

    return { priceData, stockData, daysTracked, priceChange, priceChangePct, daysInStock, daysTotal }
  }, [history])

  const sparkColor = priceChange > 0 ? '#f87171' : priceChange < 0 ? '#34d399' : '#FFD500'
  const sparkFill = priceChange > 0 ? 'rgba(248,113,113,0.1)' : priceChange < 0 ? 'rgba(52,211,153,0.1)' : 'rgba(255,213,0,0.1)'

  return (
    <div className="glass rounded-xl overflow-hidden card-shine glass-hover transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group relative flex flex-col">
      {/* Favorite button */}
      {user && onToggleFavorite && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(product_code, slug) }}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all"
        >
          <Heart size={14} className={isFavorite ? 'fill-lego-red text-lego-red' : 'text-white/60'} />
        </button>
      )}

      {/* Compare checkbox */}
      {showCompare && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare?.(slug) }}
          className={`absolute top-3 ${user && onToggleFavorite ? 'right-12' : 'right-3'} z-10 p-1.5 rounded-full backdrop-blur-sm transition-all
            ${isCompared ? 'bg-lego-blue/80 text-white' : 'bg-black/40 text-white/60 hover:bg-black/60'}`}
          title="Add to compare"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
          </svg>
        </button>
      )}

      <Link to={`/product/${slug}`} className="flex flex-col flex-1">
        {/* Image area */}
        <div className="relative bg-gradient-to-b from-lego-surface2 to-lego-surface p-4 aspect-square flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product_name || `Set ${product_code}`}
              className="max-h-full max-w-full object-contain drop-shadow-lg"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null
                e.target.style.display = 'none'
                e.target.parentElement.querySelector('.fallback-code').style.display = 'block'
              }}
            />
          ) : null}
          <div className={`fallback-code text-4xl font-display font-bold text-gray-700/30${imageUrl ? ' hidden' : ''}`}>{product_code}</div>

          {/* Badges top-left */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {is_new && <span className="px-2 py-0.5 bg-lego-blue text-white text-[9px] font-bold uppercase tracking-wider rounded-full">New</span>}
            {on_sale && (
              <span className="px-2 py-0.5 bg-lego-red text-white text-[9px] font-bold uppercase tracking-wider rounded-full flex items-center gap-0.5">
                <TrendingDown size={9} /> Sale
              </span>
            )}
          </div>

          {/* Discount badge bottom-right of image */}
          {hasDiscount && salePct > 0 && (
            <div className="absolute bottom-3 right-3 px-2 py-1 bg-lego-red rounded-lg shadow-lg shadow-lego-red/20">
              <span className="text-white text-[11px] font-display font-bold">−{salePct}%</span>
            </div>
          )}

          {/* Stock dot + label bottom-left */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            {(() => {
              const statusInfo = getStatusDisplay(availability_status, in_stock)
              return (
                <>
                  <div className={`w-2 h-2 rounded-full shadow-sm ${statusInfo.dotClass}`} style={{ boxShadow: `0 0 4px ${statusInfo.color}40` }} />
                  <span className={`text-[9px] font-semibold ${statusInfo.textClass}`}>
                    {statusInfo.displayLabel}
                  </span>
                </>
              )
            })()}
          </div>
        </div>

        {/* Info section */}
        <div className="p-3.5 flex flex-col flex-1">
          {theme && <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-0.5">{theme}</p>}
          <h3 className="font-display font-semibold text-xs leading-snug text-white mb-2 line-clamp-2 min-h-[2rem]">
            {product_name || `Set ${product_code}`}
          </h3>

          {/* Price block */}
          <div className="mb-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-base text-lego-yellow">
                ${Number(price_usd || 0).toFixed(2)}
              </span>
              {hasDiscount && list_price_usd && (
                <span className="text-[10px] text-gray-500 line-through">${Number(list_price_usd).toFixed(2)}</span>
              )}
            </div>
            {hasDiscount && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold text-green-400">Save ${Number(discount_usd).toFixed(2)}</span>
                {salePct > 0 && <span className="text-[9px] font-mono text-green-400/60">({salePct}% off)</span>}
              </div>
            )}
          </div>

          {/* Micro stats row */}
          <div className="flex items-center gap-2.5 text-[10px] text-gray-400 mb-3">
            {!!piece_count && Number(piece_count) > 0 && (
              <span className="flex items-center gap-0.5"><Package size={10} />{Number(piece_count).toLocaleString()}</span>
            )}
            {!!rating && <span className="flex items-center gap-0.5"><Star size={10} className="text-lego-yellow fill-lego-yellow" />{Number(rating).toFixed(1)}</span>}
            {price_per_piece && Number(price_per_piece) > 0 && Number(price_per_piece) < 50 && (
              <span className="flex items-center gap-0.5"><Tag size={10} />${Number(price_per_piece).toFixed(2)}/pc</span>
            )}
          </div>

          {/* Sparkline chart + stock bar section */}
          {(priceData.length > 1 || stockData.length > 1) && (
            <div className="mt-auto pt-2.5 border-t border-lego-border/30 space-y-2.5">
              {/* Price sparkline */}
              {priceData.length > 1 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-gray-600">Price</span>
                    <div className="flex items-center gap-0.5">
                      {priceChange !== 0 ? (
                        priceChange > 0
                          ? <TrendingUp size={9} className="text-red-400" />
                          : <TrendingDown size={9} className="text-green-400" />
                      ) : <Minus size={9} className="text-gray-500" />}
                      <span className={`text-[9px] font-bold font-mono ${
                        priceChange > 0 ? 'text-red-400' : priceChange < 0 ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        {priceChange >= 0 ? '+' : ''}{priceChangePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Sparkline data={priceData} width={160} height={32} color={sparkColor} fillColor={sparkFill} />
                </div>
              )}

              {/* Stock availability bar */}
              {stockData.length > 1 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-gray-600">Stock</span>
                    <span className="text-[9px] font-mono text-gray-500">
                      {daysInStock}/{daysTotal}d
                    </span>
                  </div>
                  <StockBar data={stockData} height={5} />
                </div>
              )}

              {/* Days tracked + stock % footer */}
              <div className="flex items-center justify-between text-[9px] text-gray-500 pt-0.5">
                <span className="flex items-center gap-1">
                  <Clock size={9} className="text-gray-600" />
                  {daysTracked}d tracked
                </span>
                {daysTotal > 0 && (
                  <span className="flex items-center gap-1">
                    <ShoppingBag size={9} className="text-gray-600" />
                    {Math.round((daysInStock / daysTotal) * 100)}% avail
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Store URL bar */}
      {storeUrl && (
        <a href={storeUrl} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 px-3 py-2 border-t border-lego-border/50 text-[10px] text-gray-500 hover:text-lego-blue hover:bg-white/[0.02] transition-colors">
          <ExternalLink size={10} />
          <span>View on LEGO.com</span>
        </a>
      )}
    </div>
  )
}