import { BarChart3, DollarSign, Package, Star, ShoppingBag, TrendingDown, Layers, Tag, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, CartesianGrid, ZAxis } from 'recharts'
import AnimatedCounter from '../components/AnimatedCounter'
import { useStats, useThemes, useBestValue, useNewProducts } from '../hooks/useData'

export default function Analytics() {
  const { stats, loading: sL } = useStats()
  const { themes, loading: tL } = useThemes()
  const { products: bestValue, loading: bL } = useBestValue(15)
  const { products: newProducts, loading: nL } = useNewProducts(10)

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl tracking-tight mb-1">
            <BarChart3 size={24} className="inline text-lego-yellow mr-1.5" /> Analytics Dashboard
          </h1>
          <p className="text-gray-500 text-xs">Live insights across the entire LEGO catalog</p>
        </div>

        {/* Market Overview KPIs */}
        {!sL && stats && (
          <>
            <h2 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wider mb-3">Market Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              <KPI icon={<Package size={16} />} label="Products" value={<AnimatedCounter end={stats.totalProducts} />} color="text-lego-yellow" />
              <KPI icon={<Layers size={16} />} label="Themes" value={<AnimatedCounter end={stats.uniqueThemes} />} color="text-lego-blue" />
              <KPI icon={<DollarSign size={16} />} label="Avg Price" value={<AnimatedCounter end={stats.avgPrice} prefix="$" decimals={0} />} color="text-lego-yellow" />
              <KPI icon={<DollarSign size={16} />} label="Median Price" value={<AnimatedCounter end={stats.medianPrice} prefix="$" decimals={0} />} color="text-orange-400" />
              <KPI icon={<DollarSign size={16} />} label="Catalog Value" value={<AnimatedCounter end={stats.totalCatalogValue} prefix="$" />} color="text-green-400" />
              <KPI icon={<Package size={16} />} label="Total Pieces" value={<AnimatedCounter end={stats.totalPieces} />} color="text-purple-400" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
              <KPI icon={<Star size={16} />} label="Avg Rating" value={<AnimatedCounter end={stats.avgRating} decimals={1} suffix="★" />} color="text-lego-yellow" />
              <KPI icon={<ShoppingBag size={16} />} label="In Stock" value={<AnimatedCounter end={stats.inStockPct} suffix="%" />} color="text-green-400" />
              <KPI icon={<TrendingDown size={16} />} label="On Sale" value={<AnimatedCounter end={stats.onSaleCount} />} color="text-lego-red" />
              <KPI icon={<Zap size={16} />} label="New" value={<AnimatedCounter end={stats.newCount} />} color="text-lego-blue" />
              <KPI icon={<Tag size={16} />} label="Price Range" value={`$${stats.minPrice}–$${stats.maxPrice}`} color="text-gray-300" small />
              <KPI icon={<Package size={16} />} label="Avg Pieces" value={<AnimatedCounter end={stats.avgPieces} />} color="text-purple-400" />
            </div>
          </>
        )}

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          {!tL && <ThemeBarChart themes={themes} />}
          {!tL && <AvailabilityPie themes={themes} />}
        </div>
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          {!tL && <PriceByThemeChart themes={themes} />}
          {!tL && <PricePerPieceChart themes={themes} />}
        </div>
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          {!bL && <BestValueTable products={bestValue} />}
          {!nL && <NewProductsTable products={newProducts} />}
        </div>
        {!tL && <ThemeComparisonTable themes={themes} />}
      </div>
    </main>
  )
}

function KPI({ icon, label, value, color = 'text-white', small }) {
  return (
    <div className="glass rounded-lg p-3.5 glass-hover transition-all">
      <div className={`mb-1.5 ${color}`}>{icon}</div>
      <div className={`font-display font-bold ${small ? 'text-sm' : 'text-xl'} ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

function ThemeBarChart({ themes }) {
  const data = themes.filter(t => t.theme && t.product_count > 5).slice(0, 15)
    .map(t => ({ name: t.theme?.length > 20 ? t.theme.slice(0, 20) + '…' : t.theme, count: Number(t.product_count) }))
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display font-semibold text-sm mb-1">Products by Theme</h3>
      <p className="text-[10px] text-gray-500 mb-4">Top 15 themes</p>
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 5, right: 15 }}>
            <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fill: '#888', fontSize: 10, fontFamily: 'DM Sans' }} />
            <Tooltip contentStyle={{ background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '11px' }} />
            <Bar dataKey="count" fill="#E3000B" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function AvailabilityPie({ themes }) {
  const inStock = themes.reduce((a, t) => a + Number(t.in_stock_count || 0), 0)
  const total = themes.reduce((a, t) => a + Number(t.product_count || 0), 0)
  const data = [{ name: 'In Stock', value: inStock }, { name: 'Out of Stock', value: total - inStock }]
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display font-semibold text-sm mb-1">Stock Availability</h3>
      <p className="text-[10px] text-gray-500 mb-4">Across all tracked products</p>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" stroke="none">
            <Cell fill="#34d399" /><Cell fill="#f87171" />
          </Pie><Tooltip contentStyle={{ background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '11px' }} /></PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-2">
        <Legend color="bg-green-400" label={`In Stock (${inStock})`} />
        <Legend color="bg-red-400" label={`Out of Stock (${total - inStock})`} />
      </div>
    </div>
  )
}

function PriceByThemeChart({ themes }) {
  const data = themes.filter(t => t.theme && t.avg_price).sort((a, b) => Number(b.avg_price) - Number(a.avg_price)).slice(0, 12)
    .map(t => ({ name: t.theme?.length > 18 ? t.theme.slice(0, 18) + '…' : t.theme, avg: Number(Number(t.avg_price).toFixed(0)) }))
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display font-semibold text-sm mb-1">Avg Price by Theme</h3>
      <p className="text-[10px] text-gray-500 mb-4">Top 12 most expensive</p>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 60 }}>
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={{ background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '11px' }} formatter={v => [`$${v}`]} />
            <Bar dataKey="avg" fill="#FFD500" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PricePerPieceChart({ themes }) {
  const data = themes.filter(t => t.theme && t.avg_price_per_piece && Number(t.avg_price_per_piece) < 1)
    .sort((a, b) => Number(a.avg_price_per_piece) - Number(b.avg_price_per_piece)).slice(0, 12)
    .map(t => ({ name: t.theme?.length > 18 ? t.theme.slice(0, 18) + '…' : t.theme, ppp: Number(Number(t.avg_price_per_piece).toFixed(3)) }))
  if (!data.length) return null
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display font-semibold text-sm mb-1">Avg Price/Piece by Theme</h3>
      <p className="text-[10px] text-gray-500 mb-4">Best value themes</p>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 60 }}>
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={{ background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '11px' }} formatter={v => [`$${v}`]} />
            <Bar dataKey="ppp" fill="#006CB7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function BestValueTable({ products }) {
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display font-semibold text-sm mb-1">Best Value Sets</h3>
      <p className="text-[10px] text-gray-500 mb-3">Lowest price per piece (in stock)</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-lego-border">
            <th className="text-left py-2 px-2 text-[10px] font-mono text-gray-500 uppercase">#</th>
            <th className="text-left py-2 px-2 text-[10px] font-mono text-gray-500 uppercase">Set</th>
            <th className="text-right py-2 px-2 text-[10px] font-mono text-gray-500 uppercase">Price</th>
            <th className="text-right py-2 px-2 text-[10px] font-mono text-gray-500 uppercase">Pcs</th>
            <th className="text-right py-2 px-2 text-[10px] font-mono text-gray-500 uppercase">$/Pc</th>
          </tr></thead>
          <tbody>{products.slice(0, 10).map((p, i) => (
            <tr key={p.product_code} className="border-b border-lego-border/30 hover:bg-white/[0.02]">
              <td className="py-2 px-2 text-gray-600">{i + 1}</td>
              <td className="py-2 px-2"><span className="text-white">{p.product_name}</span><br /><span className="text-[10px] text-gray-600">{p.theme}</span></td>
              <td className="py-2 px-2 text-right font-mono text-lego-yellow">${Number(p.price_usd).toFixed(2)}</td>
              <td className="py-2 px-2 text-right font-mono text-gray-400">{Number(p.piece_count).toLocaleString()}</td>
              <td className="py-2 px-2 text-right font-mono text-green-400 font-semibold">${Number(p.price_per_piece).toFixed(3)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function NewProductsTable({ products }) {
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display font-semibold text-sm mb-1">Latest Products</h3>
      <p className="text-[10px] text-gray-500 mb-3">Recently added to the catalog</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-lego-border">
            <th className="text-left py-2 px-2 text-[10px] font-mono text-gray-500 uppercase">Set</th>
            <th className="text-left py-2 px-2 text-[10px] font-mono text-gray-500 uppercase">Theme</th>
            <th className="text-right py-2 px-2 text-[10px] font-mono text-gray-500 uppercase">Price</th>
            <th className="text-right py-2 px-2 text-[10px] font-mono text-gray-500 uppercase">Rating</th>
          </tr></thead>
          <tbody>{products.slice(0, 10).map(p => (
            <tr key={p.product_code} className="border-b border-lego-border/30 hover:bg-white/[0.02]">
              <td className="py-2 px-2 text-white">{p.product_name}</td>
              <td className="py-2 px-2 text-gray-500">{p.theme}</td>
              <td className="py-2 px-2 text-right font-mono text-lego-yellow">${Number(p.price_usd).toFixed(2)}</td>
              <td className="py-2 px-2 text-right">{p.rating ? <span className="flex items-center justify-end gap-0.5"><Star size={10} className="text-lego-yellow fill-lego-yellow" />{Number(p.rating).toFixed(1)}</span> : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function ThemeComparisonTable({ themes }) {
  const data = themes.filter(t => t.theme).slice(0, 20)
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display font-semibold text-sm mb-1">Theme Comparison</h3>
      <p className="text-[10px] text-gray-500 mb-3">Head-to-head stats across all themes</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-lego-border">
            {['Theme', 'Sets', 'Avg $', 'Min $', 'Max $', 'Avg Rating', 'In Stock', 'On Sale', '$/Piece'].map(h => (
              <th key={h} className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-right first:text-left">{h}</th>
            ))}
          </tr></thead>
          <tbody>{data.map(t => (
            <tr key={t.theme} className="border-b border-lego-border/30 hover:bg-white/[0.02]">
              <td className="py-2 px-2 text-white font-medium text-left">{t.theme}</td>
              <td className="py-2 px-2 text-right font-mono">{t.product_count}</td>
              <td className="py-2 px-2 text-right font-mono text-lego-yellow">${Number(t.avg_price).toFixed(0)}</td>
              <td className="py-2 px-2 text-right font-mono text-gray-400">${Number(t.min_price).toFixed(0)}</td>
              <td className="py-2 px-2 text-right font-mono text-gray-400">${Number(t.max_price).toFixed(0)}</td>
              <td className="py-2 px-2 text-right font-mono">{t.avg_rating ? Number(t.avg_rating).toFixed(1) : '—'}</td>
              <td className="py-2 px-2 text-right font-mono text-green-400">{t.in_stock_count}</td>
              <td className="py-2 px-2 text-right font-mono text-lego-red">{t.on_sale_count}</td>
              <td className="py-2 px-2 text-right font-mono text-lego-blue">{t.avg_price_per_piece ? `$${Number(t.avg_price_per_piece).toFixed(2)}` : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return <div className="flex items-center gap-2 text-[10px]"><div className={`w-2.5 h-2.5 rounded-full ${color}`} /><span className="text-gray-400">{label}</span></div>
}
