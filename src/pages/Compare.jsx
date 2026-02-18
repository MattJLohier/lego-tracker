import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Star, Package, Tag, DollarSign, Clock, ShoppingBag, TrendingDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { supabase } from '../lib/supabase'

const COLORS = ['#FFD500', '#E3000B', '#006CB7', '#00963F']

export default function Compare() {
  const [searchParams] = useSearchParams()
  const slugsParam = searchParams.get('slugs') || ''
  const slugs = slugsParam.split(',').filter(Boolean)
  const [products, setProducts] = useState([])
  const [histories, setHistories] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (slugs.length === 0) { setLoading(false); return }
    async function fetch() {
      setLoading(true)
      // Get latest snapshot per slug
      const { data: all } = await supabase
        .from('fact_product_daily_snapshot')
        .select('*')
        .in('slug', slugs)
        .order('scraped_date', { ascending: false })

      const latest = new Map()
      const histMap = {}
      for (const r of (all || [])) {
        if (!latest.has(r.slug)) latest.set(r.slug, r)
        if (!histMap[r.slug]) histMap[r.slug] = []
        histMap[r.slug].push(r)
      }
      // Sort histories ascending
      for (const s of Object.keys(histMap)) {
        histMap[s].sort((a, b) => new Date(a.scraped_date) - new Date(b.scraped_date))
      }

      setProducts(slugs.map(s => latest.get(s)).filter(Boolean))
      setHistories(histMap)
      setLoading(false)
    }
    fetch()
  }, [slugsParam])

  if (!slugs.length) {
    return (
      <main className="pt-20 pb-16 px-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 font-display text-lg mb-2">No products to compare</p>
          <p className="text-gray-600 text-sm mb-4">Go to the Explorer, enable Compare Mode, select 2-4 products</p>
          <Link to="/explore" className="text-lego-red text-sm hover:underline">← Go to Explorer</Link>
        </div>
      </main>
    )
  }

  if (loading) return (
    <main className="pt-20 pb-16 px-6 min-h-screen">
      <div className="max-w-6xl mx-auto pt-10 animate-pulse space-y-6">
        <div className="h-6 bg-lego-surface2 rounded w-1/4" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-40 bg-lego-surface2 rounded-xl" />)}</div>
      </div>
    </main>
  )

  const rows = [
    { label: 'Theme', key: 'theme' },
    { label: 'Price', key: 'price_usd', fmt: v => `$${Number(v).toFixed(2)}`, highlight: 'lowest' },
    { label: 'List Price', key: 'list_price_usd', fmt: v => v ? `$${Number(v).toFixed(2)}` : '—' },
    { label: 'Discount', key: 'discount_usd', fmt: v => v && Number(v) > 0 ? `−$${Number(v).toFixed(0)}` : '—', highlight: 'highest' },
    { label: 'Pieces', key: 'piece_count', fmt: v => v ? Number(v).toLocaleString() : '—', highlight: 'highest' },
    { label: '$/Piece', key: 'price_per_piece', fmt: v => v && Number(v) < 50 ? `$${Number(v).toFixed(3)}` : '—', highlight: 'lowest' },
    { label: 'Rating', key: 'rating', fmt: v => v ? `${Number(v).toFixed(1)} ★` : '—', highlight: 'highest' },
    { label: 'Age Range', key: 'age_range' },
    { label: 'In Stock', key: 'in_stock', fmt: v => v ? '✓ Yes' : '✗ No' },
    { label: 'On Sale', key: 'on_sale', fmt: v => v ? '✓ Yes' : 'No' },
    { label: 'VIP Points', key: 'vip_points', fmt: v => v || '—' },
    { label: 'Status', key: 'availability_status' },
  ]

  const getHighlight = (row, products) => {
    if (!row.highlight) return null
    const vals = products.map(p => Number(p[row.key]) || 0)
    if (row.highlight === 'lowest') return vals.indexOf(Math.min(...vals.filter(v => v > 0)))
    return vals.indexOf(Math.max(...vals))
  }

  // Build combined chart data
  const allDates = new Set()
  for (const slug of Object.keys(histories)) {
    for (const h of histories[slug]) allDates.add(h.scraped_date)
  }
  const sortedDates = [...allDates].sort()
  const chartData = sortedDates.map(d => {
    const point = { date: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    products.forEach(p => {
      const entry = histories[p.slug]?.find(h => h.scraped_date === d)
      point[p.slug] = entry ? Number(entry.price_usd) : null
    })
    return point
  })

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <Link to="/explore" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to Explorer
        </Link>

        <h1 className="font-display font-bold text-2xl tracking-tight mb-6">Compare Products</h1>

        {/* Product headers */}
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: `120px repeat(${products.length}, 1fr)` }}>
          <div />
          {products.map((p, i) => (
            <Link key={p.slug} to={`/product/${p.slug}`} className="glass rounded-xl p-4 glass-hover transition-all text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: COLORS[i] }} />
              <h3 className="font-display font-semibold text-xs leading-snug line-clamp-2 mb-1">{p.product_name}</h3>
              <p className="text-[10px] text-gray-500 font-mono">{p.product_code}</p>
            </Link>
          ))}
        </div>

        {/* Comparison table */}
        <div className="glass rounded-xl overflow-hidden mb-6">
          {rows.map((row, ri) => {
            const bestIdx = getHighlight(row, products)
            return (
              <div key={row.key} className={`grid items-center border-b border-lego-border/30 ${ri % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                style={{ gridTemplateColumns: `120px repeat(${products.length}, 1fr)` }}>
                <div className="px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-gray-500">{row.label}</div>
                {products.map((p, i) => {
                  const val = row.fmt ? row.fmt(p[row.key]) : (p[row.key] || '—')
                  const isBest = bestIdx === i
                  return (
                    <div key={p.slug} className={`px-4 py-3 text-xs text-center font-medium ${isBest ? 'text-green-400 font-semibold' : 'text-gray-300'}`}>
                      {val}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Price history overlay chart */}
        {chartData.length > 1 && (
          <div className="glass rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm mb-4">Price History Comparison</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" />
                  <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '11px' }} formatter={v => v ? [`$${v.toFixed(2)}`] : ['—']} />
                  <Legend />
                  {products.map((p, i) => (
                    <Line key={p.slug} type="monotone" dataKey={p.slug} name={p.product_name?.slice(0, 25)} stroke={COLORS[i]} strokeWidth={2} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
