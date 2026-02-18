import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, TrendingUp, TrendingDown, Sparkles, AlertTriangle, ShoppingBag,
  ArrowRight, Tag, Package, Flame, Clock, BarChart3, Minus, ExternalLink
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend as RLegend, BarChart, Bar
} from 'recharts'
import { useAlerts } from '../hooks/useAlerts'

const CHART_COLORS = ['#E3000B', '#FFD500', '#006CB7', '#00963F', '#FF6B6B', '#a78bfa', '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#f59e0b', '#8b5cf6', '#14b8a6', '#ef4444', '#6366f1', '#22c55e']
const TOOLTIP_STYLE = { background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '11px' }

const TABS = [
  { id: 'overview', label: 'Overview', icon: Bell },
  { id: 'prices', label: 'Price Swings', icon: TrendingUp },
  { id: 'debuts', label: 'New Debuts', icon: Sparkles },
  { id: 'status', label: 'Status Changes', icon: ShoppingBag },
  { id: 'sales', label: 'New Sales', icon: Tag },
]

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDateLong(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function legoStoreUrl(productCode) {
  if (!productCode) return null
  return `https://www.lego.com/en-us/product/${productCode}`
}

export default function Alerts() {
  const [activeTab, setActiveTab] = useState('overview')
  const { alerts, loading } = useAlerts()

  if (loading) return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl tracking-tight mb-1">
            <Bell size={24} className="inline text-lego-red mr-1.5" /> Alerts Center
          </h1>
          <p className="text-gray-500 text-xs">Loading alert data...</p>
        </div>
        <LoadingSkeleton />
      </div>
    </main>
  )

  if (!alerts) return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Bell size={32} className="mx-auto text-gray-600 mb-3" />
        <p className="text-gray-500 text-sm">No alert data available yet</p>
      </div>
    </main>
  )

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl tracking-tight mb-1">
            <Bell size={24} className="inline text-lego-red mr-1.5" /> Alerts Center
          </h1>
          <p className="text-gray-500 text-xs">
            Price swings, new debuts, status changes &amp; more
            {alerts.dateRange && (
              <span className="ml-2 text-gray-600">
                · Tracking {alerts.totalProducts} products from {fmtDateLong(alerts.dateRange.first)} to {fmtDateLong(alerts.dateRange.last)}
              </span>
            )}
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 glass rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all
                ${activeTab === id
                  ? 'bg-lego-red text-white shadow-lg shadow-lego-red/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <OverviewTab alerts={alerts} />}
        {activeTab === 'prices' && <PriceSwingsTab swings={alerts.priceSwings} />}
        {activeTab === 'debuts' && <DebutsTab debuts={alerts.newDebuts} />}
        {activeTab === 'status' && <StatusTab statusChanges={alerts.statusChanges} discontinued={alerts.discontinued} statusOverTime={alerts.statusOverTime} />}
        {activeTab === 'sales' && <SalesTab sales={alerts.newSales} />}
      </div>
    </main>
  )
}

/* ========================= OVERVIEW TAB ========================= */

function OverviewTab({ alerts }) {
  const { priceSwings, newDebuts, statusChanges, discontinued, newSales, statusOverTime } = alerts

  const biggestDrop = priceSwings.filter(s => s.direction === 'down').sort((a, b) => b.absPct - a.absPct)[0]
  const biggestRise = priceSwings.filter(s => s.direction === 'up').sort((a, b) => b.absPct - a.absPct)[0]

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AlertKPI icon={<TrendingUp size={16} />} label="Price Changes" value={priceSwings.filter(s => s.direction !== 'flat').length} color="text-lego-yellow" />
        <AlertKPI icon={<Sparkles size={16} />} label="New Debuts" value={newDebuts.length} color="text-lego-blue" />
        <AlertKPI icon={<ShoppingBag size={16} />} label="Status Changes" value={statusChanges.length} color="text-purple-400" />
        <AlertKPI icon={<AlertTriangle size={16} />} label="Retiring/Discontinued" value={discontinued.length} color="text-red-400" />
        <AlertKPI icon={<Tag size={16} />} label="New Sales" value={newSales.length} color="text-green-400" />
      </div>

      {/* Highlight cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {biggestDrop && (
          <HighlightCard
            icon={<TrendingDown size={18} />}
            iconBg="bg-green-500/10 text-green-400"
            title="Biggest Price Drop"
            product={biggestDrop}
            detail={
              <span className="text-green-400 font-bold">
                −${biggestDrop.absChange.toFixed(2)} ({biggestDrop.absPct.toFixed(1)}%)
              </span>
            }
            sub={`$${biggestDrop.firstPrice.toFixed(2)} → $${biggestDrop.lastPrice.toFixed(2)}`}
          />
        )}
        {biggestRise && (
          <HighlightCard
            icon={<TrendingUp size={18} />}
            iconBg="bg-red-500/10 text-red-400"
            title="Biggest Price Increase"
            product={biggestRise}
            detail={
              <span className="text-red-400 font-bold">
                +${biggestRise.absChange.toFixed(2)} (+{biggestRise.absPct.toFixed(1)}%)
              </span>
            }
            sub={`$${biggestRise.firstPrice.toFixed(2)} → $${biggestRise.lastPrice.toFixed(2)}`}
          />
        )}
      </div>

      {/* Status over time chart */}
      {statusOverTime.data.length > 1 && (
        <ChartCard title="Product Status Distribution Over Time" subtitle="How availability statuses are changing across the catalog">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={statusOverTime.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={fmtDate} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmtDate} />
                <RLegend wrapperStyle={{ fontSize: '10px', color: '#888' }} />
                {statusOverTime.statuses.map((s, i) => (
                  <Area key={s} type="monotone" dataKey={s} stackId="1" fill={CHART_COLORS[i % CHART_COLORS.length]} stroke={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.6} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Recent status changes preview */}
      {statusChanges.length > 0 && (
        <ChartCard title="Recent Status Changes" subtitle="Latest availability shifts">
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {statusChanges.slice(0, 15).map((sc, i) => (
              <Link key={`${sc.product_code}-${sc.date}-${i}`} to={`/product/${sc.slug}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-semibold truncate group-hover:text-lego-yellow transition-colors">{sc.product_name}</div>
                  <div className="text-[10px] text-gray-500">{sc.theme} · {fmtDateLong(sc.date)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={sc.fromStatus} />
                  <ArrowRight size={12} className="text-gray-600" />
                  <StatusBadge status={sc.toStatus} />
                </div>
              </Link>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Recent debuts preview */}
      {newDebuts.length > 0 && (
        <ChartCard title="Latest Product Debuts" subtitle="Most recently added to the catalog">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {newDebuts.slice(0, 6).map(d => (
              <Link key={d.product_code} to={`/product/${d.slug}`} className="glass rounded-lg p-3 hover:bg-white/[0.03] transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-white font-semibold truncate group-hover:text-lego-yellow transition-colors">{d.product_name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{d.theme}</div>
                  </div>
                  {d.is_new && <span className="px-2 py-0.5 bg-lego-blue text-white text-[8px] font-bold uppercase rounded-full shrink-0">New</span>}
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px]">
                  <span className="text-lego-yellow font-bold">${d.price.toFixed(2)}</span>
                  {d.piece_count > 0 && <span className="text-gray-400"><Package size={9} className="inline mr-0.5" />{d.piece_count.toLocaleString()}</span>}
                  <span className="text-gray-500">First seen {fmtDate(d.firstSeen)}</span>
                </div>
              </Link>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  )
}

/* ========================= PRICE SWINGS TAB ========================= */

function PriceSwingsTab({ swings }) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (filter === 'drops') return swings.filter(s => s.direction === 'down')
    if (filter === 'increases') return swings.filter(s => s.direction === 'up')
    return swings.filter(s => s.direction !== 'flat')
  }, [swings, filter])

  // Chart data: top 20 by absolute % change
  const chartData = filtered.slice(0, 20).map(s => ({
    name: (s.product_name || `Set ${s.product_code}`).slice(0, 25),
    change: Number(s.changePct.toFixed(1)),
    slug: s.slug,
  }))

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {['all', 'drops', 'increases'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-lego-red text-white' : 'glass text-gray-400 hover:text-white'}`}>
            {f === 'all' ? 'All Changes' : f === 'drops' ? 'Price Drops' : 'Price Increases'}
          </button>
        ))}
      </div>

      {chartData.length > 0 && (
        <ChartCard title="Top Price Swings by %" subtitle={`Largest ${filter === 'drops' ? 'decreases' : filter === 'increases' ? 'increases' : 'movements'} in tracked period`}>
          <div style={{ height: Math.max(300, chartData.length * 28) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 5, right: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
                <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fill: '#888', fontSize: 9 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, 'Change']} />
                <Bar dataKey="change" fill="#FFD500" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <ChartCard title="Price Swing Details" subtitle={`${filtered.length} products with price changes`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-lego-border">
                {['Product', 'Theme', 'From', 'To', 'Change', 'Min', 'Max', ''].map(h => (
                  <th key={h} className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-right first:text-left [&:nth-child(2)]:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 30).map((s, i) => (
                <tr key={s.product_code} className="border-b border-lego-border/30 hover:bg-white/[0.02]">
                  <td className="py-2 px-2 text-left">
                    <Link to={`/product/${s.slug}`} className="text-white hover:text-lego-yellow transition-colors font-medium">{s.product_name}</Link>
                  </td>
                  <td className="py-2 px-2 text-left text-gray-500">{s.theme}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-400">${s.firstPrice.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-mono text-lego-yellow">${s.lastPrice.toFixed(2)}</td>
                  <td className={`py-2 px-2 text-right font-mono font-bold ${s.direction === 'down' ? 'text-green-400' : 'text-red-400'}`}>
                    {s.direction === 'down' ? '−' : '+'}${s.absChange.toFixed(2)} ({s.absPct.toFixed(1)}%)
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-gray-500">${s.minPrice.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-500">${s.maxPrice.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">
                    <a href={legoStoreUrl(s.product_code)} target="_blank" rel="noopener noreferrer"
                      className="text-gray-600 hover:text-lego-blue transition-colors" title="View on LEGO.com">
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

/* ========================= DEBUTS TAB ========================= */

function DebutsTab({ debuts }) {
  // Group by theme for chart
  const byTheme = useMemo(() => {
    const map = new Map()
    for (const d of debuts) {
      const theme = d.theme || 'Unknown'
      if (!map.has(theme)) map.set(theme, { count: 0, totalValue: 0 })
      const entry = map.get(theme)
      entry.count++
      entry.totalValue += d.price
    }
    return Array.from(map.entries())
      .map(([name, info]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, count: info.count, value: Math.round(info.totalValue) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
  }, [debuts])

  return (
    <div className="space-y-5">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles size={16} className="text-lego-blue" />
          <span className="text-white font-semibold">{debuts.length} new products</span>
          <span className="text-gray-500">recently added to the catalog</span>
        </div>
      </div>

      {byTheme.length > 0 && (
        <ChartCard title="New Debuts by Theme" subtitle="Distribution of recently added products">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTheme} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload
                  return (
                    <div className="glass rounded-lg p-3 border border-lego-border text-xs">
                      <div className="text-white font-semibold mb-1">{d.name}</div>
                      <div className="text-lego-blue">{d.count} new sets</div>
                      <div className="text-lego-yellow">${d.value.toLocaleString()} total value</div>
                    </div>
                  )
                }} />
                <Bar dataKey="count" fill="#006CB7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <ChartCard title="All New Products" subtitle="Full list of recent debuts">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-lego-border">
                {['Product', 'Theme', 'Price', 'Pieces', 'First Seen', ''].map(h => (
                  <th key={h} className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-right first:text-left [&:nth-child(2)]:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {debuts.map(d => (
                <tr key={d.product_code} className="border-b border-lego-border/30 hover:bg-white/[0.02]">
                  <td className="py-2 px-2 text-left">
                    <Link to={`/product/${d.slug}`} className="text-white hover:text-lego-yellow transition-colors font-medium">{d.product_name}</Link>
                    {d.is_new && <span className="ml-1.5 px-1.5 py-0.5 bg-lego-blue/20 text-lego-blue text-[8px] font-bold uppercase rounded-full">New</span>}
                  </td>
                  <td className="py-2 px-2 text-left text-gray-500">{d.theme}</td>
                  <td className="py-2 px-2 text-right font-mono text-lego-yellow">${d.price.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-400">{d.piece_count > 0 ? d.piece_count.toLocaleString() : '—'}</td>
                  <td className="py-2 px-2 text-right text-gray-500">{fmtDateLong(d.firstSeen)}</td>
                  <td className="py-2 px-2 text-right">
                    <a href={legoStoreUrl(d.product_code)} target="_blank" rel="noopener noreferrer"
                      className="text-gray-600 hover:text-lego-blue transition-colors" title="View on LEGO.com">
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

/* ========================= STATUS TAB ========================= */

function StatusTab({ statusChanges, discontinued, statusOverTime }) {
  return (
    <div className="space-y-5">
      {/* Status distribution chart */}
      {statusOverTime.data.length > 1 && (
        <ChartCard title="Status Distribution Over Time" subtitle="Catalog-wide availability status trends">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={statusOverTime.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={fmtDate} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmtDate} />
                <RLegend wrapperStyle={{ fontSize: '10px', color: '#888' }} />
                {statusOverTime.statuses.map((s, i) => (
                  <Area key={s} type="monotone" dataKey={s} stackId="1" fill={CHART_COLORS[i % CHART_COLORS.length]} stroke={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.6} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Discontinued / Retiring sets */}
      {discontinued.length > 0 && (
        <ChartCard title="⚠️ Retiring / Discontinued Sets" subtitle="Sets that changed to retiring, discontinued, or went out of stock">
          <div className="space-y-2">
            {discontinued.map((sc, i) => (
              <Link key={`${sc.product_code}-${sc.date}-${i}`} to={`/product/${sc.slug}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors group">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-semibold truncate group-hover:text-lego-yellow transition-colors">{sc.product_name}</div>
                  <div className="text-[10px] text-gray-500">{sc.theme} · ${sc.price.toFixed(2)} · {fmtDateLong(sc.date)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={sc.fromStatus} />
                  <ArrowRight size={12} className="text-gray-600" />
                  <StatusBadge status={sc.toStatus} />
                </div>
              </Link>
            ))}
          </div>
        </ChartCard>
      )}

      {/* All status changes */}
      <ChartCard title="All Status Changes" subtitle={`${statusChanges.length} status transitions detected`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-lego-border">
                {['Date', 'Product', 'Theme', 'From', '', 'To', 'Price', ''].map((h, i) => (
                  <th key={`${h}-${i}`} className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statusChanges.slice(0, 40).map((sc, i) => (
                <tr key={`${sc.product_code}-${sc.date}-${i}`} className="border-b border-lego-border/30 hover:bg-white/[0.02]">
                  <td className="py-2 px-2 text-gray-500 whitespace-nowrap">{fmtDate(sc.date)}</td>
                  <td className="py-2 px-2">
                    <Link to={`/product/${sc.slug}`} className="text-white hover:text-lego-yellow transition-colors font-medium">{sc.product_name}</Link>
                  </td>
                  <td className="py-2 px-2 text-gray-500">{sc.theme}</td>
                  <td className="py-2 px-2"><StatusBadge status={sc.fromStatus} /></td>
                  <td className="py-1 px-1"><ArrowRight size={10} className="text-gray-600" /></td>
                  <td className="py-2 px-2"><StatusBadge status={sc.toStatus} /></td>
                  <td className="py-2 px-2 font-mono text-lego-yellow">${sc.price.toFixed(2)}</td>
                  <td className="py-2 px-2">
                    <a href={legoStoreUrl(sc.product_code)} target="_blank" rel="noopener noreferrer"
                      className="text-gray-600 hover:text-lego-blue transition-colors" title="View on LEGO.com">
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

/* ========================= SALES TAB ========================= */

function SalesTab({ sales }) {
  return (
    <div className="space-y-5">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm">
          <Flame size={16} className="text-lego-red" />
          <span className="text-white font-semibold">{sales.length} products</span>
          <span className="text-gray-500">recently went on sale</span>
        </div>
      </div>

      <ChartCard title="New Sales" subtitle="Products that recently started their sale">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-lego-border">
                {['Product', 'Theme', 'List Price', 'Sale Price', 'Discount', 'Date', ''].map(h => (
                  <th key={h} className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-right first:text-left [&:nth-child(2)]:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((s, i) => (
                <tr key={`${s.product_code}-${s.date}-${i}`} className="border-b border-lego-border/30 hover:bg-white/[0.02]">
                  <td className="py-2 px-2 text-left">
                    <Link to={`/product/${s.slug}`} className="text-white hover:text-lego-yellow transition-colors font-medium">{s.product_name}</Link>
                  </td>
                  <td className="py-2 px-2 text-left text-gray-500">{s.theme}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-400 line-through">${s.listPrice.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-mono text-lego-yellow font-bold">${s.price.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">
                    <span className="font-mono text-lego-red font-bold">
                      −${s.discount.toFixed(0)}
                      {s.salePct > 0 && <span className="text-gray-500 font-normal ml-1">({s.salePct.toFixed(0)}%)</span>}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-gray-500">{fmtDate(s.date)}</td>
                  <td className="py-2 px-2 text-right">
                    <a href={legoStoreUrl(s.product_code)} target="_blank" rel="noopener noreferrer"
                      className="text-gray-600 hover:text-lego-blue transition-colors" title="View on LEGO.com">
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

/* ========================= SHARED COMPONENTS ========================= */

function StatusBadge({ status }) {
  const colors = {
    'Available': 'bg-green-500/15 text-green-400 border-green-500/30',
    'In Stock': 'bg-green-500/15 text-green-400 border-green-500/30',
    'Out of Stock': 'bg-red-500/15 text-red-400 border-red-500/30',
    'Retiring Soon': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    'Sold Out': 'bg-red-500/15 text-red-400 border-red-500/30',
  }
  const defaultColor = 'bg-gray-500/15 text-gray-400 border-gray-500/30'
  const color = Object.entries(colors).find(([key]) => status?.toLowerCase()?.includes(key.toLowerCase()))?.[1] || defaultColor

  return (
    <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full border ${color} whitespace-nowrap`}>
      {status || 'Unknown'}
    </span>
  )
}

function HighlightCard({ icon, iconBg, title, product, detail, sub }) {
  return (
    <Link to={`/product/${product.slug}`} className="glass rounded-xl p-4 hover:bg-white/[0.03] transition-colors group">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-gray-500 uppercase font-mono tracking-wider mb-1">{title}</div>
          <div className="text-sm text-white font-semibold truncate group-hover:text-lego-yellow transition-colors">{product.product_name}</div>
          <div className="text-[10px] text-gray-500 mb-2">{product.theme}</div>
          <div className="text-sm">{detail}</div>
          {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
        </div>
      </div>
    </Link>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display font-semibold text-sm mb-0.5">{title}</h3>
      {subtitle && <p className="text-[10px] text-gray-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  )
}

function AlertKPI({ icon, label, value, color = 'text-white' }) {
  return (
    <div className="glass rounded-lg p-3.5 glass-hover transition-all">
      <div className={`mb-1.5 ${color}`}>{icon}</div>
      <div className={`font-display font-bold text-xl ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass rounded-xl p-5 animate-pulse">
          <div className="h-4 bg-lego-surface2 rounded w-48 mb-2" />
          <div className="h-3 bg-lego-surface2 rounded w-32 mb-4" />
          <div className="h-[200px] bg-lego-surface2 rounded" />
        </div>
      ))}
    </div>
  )
}
