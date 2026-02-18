import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Heart, Star, Package, Tag, Clock, TrendingDown, TrendingUp, ShoppingBag, CalendarDays } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useProductDetail } from '../hooks/useData'
import { useFavorites } from '../hooks/useFavorites'
import { useAuth } from '../hooks/useAuth'

export default function ProductDetail() {
  const { slug } = useParams()
  const { product, history, loading } = useProductDetail(slug)
  const { user } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()

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

  // Try common image field names from the database
  const imageUrl = product.image_url || product.img_url || product.primary_image_url
    || product.thumbnail_url || product.image || product.product_image_url || null

  // Debug: log all product keys so we can find the image field
  console.log('Product fields:', Object.keys(product))
  console.log('Product data sample:', JSON.stringify(product, null, 2))

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
        {/* Back */}
        <Link to="/explore" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to Explorer
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: image placeholder + quick stats */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-xl aspect-square flex items-center justify-center relative overflow-hidden">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product_name || `Set ${product_code}`}
                  className="max-h-full max-w-full object-contain drop-shadow-lg p-4"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.style.display = 'none'
                    e.target.parentElement.querySelector('.fallback-code').style.display = 'block'
                  }}
                />
              ) : null}
              <div className={`fallback-code text-6xl font-display font-bold text-gray-700/20${imageUrl ? ' hidden' : ''}`}>{product_code}</div>
              {/* Badges */}
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

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <MiniStat icon={<Clock size={13} />} label="Days Tracked" value={daysTracked} />
              <MiniStat icon={<CalendarDays size={13} />} label="First Seen" value={firstSeen ? new Date(firstSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} />
              <MiniStat icon={<ShoppingBag size={13} />} label="Status" value={availability_status || (in_stock ? 'In Stock' : 'Out of Stock')} color={in_stock ? 'text-green-400' : 'text-red-400'} />
              <MiniStat icon={<Star size={13} />} label="VIP Points" value={vip_points || '—'} />
            </div>
          </div>

          {/* Right: details */}
          <div className="lg:col-span-3 space-y-6">
            {theme && <p className="text-xs font-mono uppercase tracking-wider text-gray-500">{theme}</p>}
            <h1 className="font-display font-bold text-2xl sm:text-3xl leading-tight">{product_name}</h1>

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
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-1 text-xl font-display font-bold
                    ${priceChange > 0 ? 'text-red-400' : priceChange < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {priceChange > 0 ? <TrendingUp size={20} /> : priceChange < 0 ? <TrendingDown size={20} /> : null}
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
                <h3 className="font-display font-semibold text-sm mb-4">Price History</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" />
                      <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `$${v}`} domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip
                        contentStyle={{ background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(v) => [`$${v.toFixed(2)}`, 'Price']}
                      />
                      <Line type="monotone" dataKey="price" stroke="#FFD500" strokeWidth={2} dot={{ fill: '#FFD500', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
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

            {/* Featured flags */}
            {featured_flags && (
              <div className="flex flex-wrap gap-2">
                {String(featured_flags).split(',').filter(Boolean).map(flag => (
                  <span key={flag} className="px-2.5 py-1 glass rounded-full text-[10px] font-mono text-gray-400">{flag.trim()}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
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