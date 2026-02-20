import { useState, useMemo, useRef, useCallback } from 'react'
import {
  BarChart3, DollarSign, Package, Star, ShoppingBag, TrendingDown, Layers, Tag, Zap,
  Clock, GripVertical, Plus, X, ChevronDown, PieChart as PieIcon, LineChart as LineIcon, BarChart as BarIcon,
  Save, FolderOpen, Trash2, Edit2, Check, BookOpen
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area, CartesianGrid, Legend as RLegend
} from 'recharts'
import AnimatedCounter from '../components/AnimatedCounter'
import { useStats, useThemes, useBestValue, useNewProducts, useAllSnapshots, useMostExpensiveSets } from '../hooks/useData'
import { useSavedDashboards } from '../hooks/useSavedDashboards'
import { trackTabSwitch, trackChartCreated, trackDashboardSaved } from '../lib/analytics'
import { normalizeStatus, getStatusInfo } from '../lib/stockStatus'

const CHART_COLORS = ['#E3000B', '#FFD500', '#006CB7', '#00963F', '#FF6B6B', '#a78bfa', '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#f59e0b', '#8b5cf6', '#14b8a6', '#ef4444', '#6366f1', '#22c55e']
const TOOLTIP_STYLE = { background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '11px' }

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'timeseries', label: 'Time Series', icon: Clock },
  { id: 'custom', label: 'Custom Builder', icon: Plus },
  { id: 'saved', label: 'Saved Reports', icon: BookOpen },
]

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('overview')
  const { stats, loading: sL } = useStats()
  const { themes, loading: tL } = useThemes()
  const { products: bestValue, loading: bL } = useBestValue(15)
  const { products: newProducts, loading: nL } = useNewProducts(10)
  const { snapshots, loading: snapL } = useAllSnapshots()
  const { products: expensiveSets, loading: eL } = useMostExpensiveSets(25)
  const savedDashboardsHook = useSavedDashboards()

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    trackTabSwitch(tab, 'analytics')
  }

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl tracking-tight mb-1">
            <BarChart3 size={24} className="inline text-lego-yellow mr-1.5" /> Analytics Dashboard
          </h1>
          <p className="text-gray-500 text-xs">Live insights across the entire LEGO catalog</p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 glass rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabSwitch(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all
                ${activeTab === id
                  ? 'bg-lego-red text-white shadow-lg shadow-lego-red/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Icon size={14} />
              {label}
              {id === 'saved' && savedDashboardsHook.dashboards.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/10 rounded-full text-[9px]">
                  {savedDashboardsHook.dashboards.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <OverviewTab stats={stats} sL={sL} themes={themes} tL={tL} bestValue={bestValue} bL={bL} newProducts={newProducts} nL={nL} expensiveSets={expensiveSets} eL={eL} />
        )}
        {activeTab === 'timeseries' && (
          <TimeSeriesTab snapshots={snapshots} loading={snapL} />
        )}
        {activeTab === 'custom' && (
          <CustomBuilderTab snapshots={snapshots} loading={snapL} savedDashboardsHook={savedDashboardsHook} />
        )}
        {activeTab === 'saved' && (
          <SavedReportsTab snapshots={snapshots} loading={snapL} savedDashboardsHook={savedDashboardsHook} onSwitchToBuilder={() => handleTabSwitch('custom')} />
        )}
      </div>
    </main>
  )
}

/* ========================= OVERVIEW TAB ========================= */

function OverviewTab({ stats, sL, themes, tL, bestValue, bL, newProducts, nL, expensiveSets, eL }) {
  return (
    <>
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

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        {!tL && <ThemeBarChart themes={themes} />}
        {!tL && <AvailabilityPie themes={themes} />}
      </div>

      {!eL && <MostExpensiveSetsChart products={expensiveSets} />}

      <div className="grid lg:grid-cols-2 gap-5 mb-5 mt-5">
        {!tL && <PriceByThemeChart themes={themes} />}
        {!tL && <PricePerPieceChart themes={themes} />}
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        {!bL && <BestValueTable products={bestValue} />}
        {!nL && <NewProductsTable products={newProducts} />}
      </div>
      {!tL && <ThemeComparisonTable themes={themes} />}
    </>
  )
}

/* ========================= TIME SERIES TAB ========================= */

function TimeSeriesTab({ snapshots, loading }) {
  if (loading) return <LoadingSkeleton />

  const dates = [...new Set(snapshots.map(s => s.scraped_date))].sort()
  const hasTimeSeries = dates.length > 1

  const catalogValueByDateTheme = useMemo(() => {
    const map = new Map()
    for (const s of snapshots) {
      if (!s.scraped_date || !s.theme || !s.price_usd) continue
      const key = s.scraped_date
      if (!map.has(key)) map.set(key, {})
      const obj = map.get(key)
      obj[s.theme] = (obj[s.theme] || 0) + Number(s.price_usd)
    }
    const themeTotals = {}
    for (const obj of map.values()) {
      for (const [t, v] of Object.entries(obj)) {
        themeTotals[t] = (themeTotals[t] || 0) + v
      }
    }
    const topThemes = Object.entries(themeTotals).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0])
    return {
      data: Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, obj]) => {
        const row = { date: fmtDate(date) }
        for (const t of topThemes) row[t] = Math.round(obj[t] || 0)
        return row
      }),
      themes: topThemes
    }
  }, [snapshots])

  const releaseTimeline = useMemo(() => {
    const firstSeen = new Map()
    for (const s of snapshots) {
      if (!firstSeen.has(s.product_code) || s.scraped_date < firstSeen.get(s.product_code).date) {
        firstSeen.set(s.product_code, { date: s.scraped_date, theme: s.theme, name: s.product_name, price: Number(s.price_usd) || 0 })
      }
    }
    const byDate = new Map()
    for (const [, info] of firstSeen) {
      const d = info.date
      if (!byDate.has(d)) byDate.set(d, { count: 0, totalValue: 0, themes: {} })
      const entry = byDate.get(d)
      entry.count++
      entry.totalValue += info.price
      entry.themes[info.theme] = (entry.themes[info.theme] || 0) + 1
    }
    return Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, info]) => ({
      date: fmtDate(date),
      count: info.count,
      totalValue: Math.round(info.totalValue),
      topTheme: Object.entries(info.themes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'
    }))
  }, [snapshots])

  const availabilityOverTime = useMemo(() => {
    const map = new Map()
    const allCategories = new Set()
    for (const s of snapshots) {
      if (!s.scraped_date) continue
      const category = normalizeStatus(s.availability_status, s.in_stock)
      const info = getStatusInfo(category)
      const label = info.label
      allCategories.add(label)
      const key = s.scraped_date
      if (!map.has(key)) map.set(key, {})
      const obj = map.get(key)
      obj[label] = (obj[label] || 0) + 1
    }
    const statuses = [...allCategories].sort()
    // Build a color map for the normalized statuses
    const statusColorMap = {}
    for (const s of allCategories) {
      const match = Object.values({
        'In Stock': '#34d399',
        'Pre-Order': '#fbbf24',
        'Backorder': '#f97316',
        'Temporarily Unavailable': '#f97316',
        'Out of Stock': '#f87171',
        'Retiring Soon': '#fb923c',
        'Discontinued': '#ef4444',
        'Unknown': '#6b7280',
      })
      // Map label to color
      statusColorMap[s] = {
        'In Stock': '#34d399',
        'Pre-Order': '#fbbf24',
        'Backorder': '#f97316',
        'Temporarily Unavailable': '#f97316',
        'Out of Stock': '#f87171',
        'Retiring Soon': '#fb923c',
        'Discontinued': '#ef4444',
        'Unknown': '#6b7280',
      }[s] || CHART_COLORS[statuses.indexOf(s) % CHART_COLORS.length]
    }
    return {
      data: Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, obj]) => {
        const row = { date: fmtDate(date) }
        for (const s of statuses) row[s] = obj[s] || 0
        return row
      }),
      statuses,
      colorMap: statusColorMap,
    }
  }, [snapshots])

  const totalValueOverTime = useMemo(() => {
    const map = new Map()
    for (const s of snapshots) {
      if (!s.scraped_date || !s.price_usd) continue
      const key = s.scraped_date
      map.set(key, (map.get(key) || 0) + Number(s.price_usd))
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({
      date: fmtDate(date),
      value: Math.round(value)
    }))
  }, [snapshots])

  // ─── Market-level KPI Time Series ───
  const marketMetrics = useMemo(() => {
    const byDate = new Map()
    for (const s of snapshots) {
      if (!s.scraped_date) continue
      const d = s.scraped_date
      if (!byDate.has(d)) byDate.set(d, { prices: [], pieces: [], ratings: [], themes: new Set(), codes: new Set(), inStock: 0, total: 0, onSale: 0, isNew: 0 })
      const b = byDate.get(d)
      b.codes.add(s.product_code)
      b.total++
      if (s.theme) b.themes.add(s.theme)
      const price = Number(s.price_usd)
      if (price > 0) b.prices.push(price)
      const pc = Number(s.piece_count)
      if (pc > 0) b.pieces.push(pc)
      const rating = Number(s.avg_rating || s.rating)
      if (rating > 0) b.ratings.push(rating)
      if (s.in_stock) b.inStock++
      if (s.is_on_sale || s.sale_percentage > 0) b.onSale++
      if (s.is_new) b.isNew++
    }
    const median = (arr) => { if (!arr.length) return 0; const sorted = [...arr].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2 }
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    return Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, b]) => ({
      date: fmtDate(date),
      totalProducts: b.codes.size,
      uniqueThemes: b.themes.size,
      avgPrice: Math.round(avg(b.prices) * 100) / 100,
      medianPrice: Math.round(median(b.prices) * 100) / 100,
      totalValue: Math.round(b.prices.reduce((a, c) => a + c, 0)),
      avgPieces: Math.round(avg(b.pieces)),
      totalPieces: b.pieces.reduce((a, c) => a + c, 0),
      avgRating: Math.round(avg(b.ratings) * 10) / 10,
      inStockPct: b.total > 0 ? Math.round(b.inStock / b.total * 100) : 0,
      onSaleCount: b.onSale,
      newCount: b.isNew,
      minPrice: b.prices.length ? Math.min(...b.prices) : 0,
      maxPrice: b.prices.length ? Math.max(...b.prices) : 0,
    }))
  }, [snapshots])

  return (
    <div className="space-y-5">
      {!hasTimeSeries && (
        <div className="glass rounded-xl p-8 text-center">
          <Clock size={32} className="text-gray-600 mx-auto mb-3" />
          <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">Time Series Building Up</h3>
          <p className="text-[11px] text-gray-500">Time series charts will be richer with 2+ days of tracked data. The charts below show what's available so far.</p>
        </div>
      )}

      {/* ─── Market KPI Sparkline Grid ─── */}
      {marketMetrics.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SparklineCard data={marketMetrics} dataKey="totalProducts" label="Total Products" color="#FFD500" fmt={v => v.toLocaleString()} />
          <SparklineCard data={marketMetrics} dataKey="uniqueThemes" label="Unique Themes" color="#006CB7" fmt={v => v} />
          <SparklineCard data={marketMetrics} dataKey="avgPrice" label="Avg Price" color="#FFD500" fmt={v => `$${v.toFixed(2)}`} />
          <SparklineCard data={marketMetrics} dataKey="medianPrice" label="Median Price" color="#f97316" fmt={v => `$${v.toFixed(2)}`} />
          <SparklineCard data={marketMetrics} dataKey="totalValue" label="Catalog Value" color="#34d399" fmt={v => `$${(v/1000).toFixed(0)}k`} />
          <SparklineCard data={marketMetrics} dataKey="totalPieces" label="Total Pieces" color="#a78bfa" fmt={v => v.toLocaleString()} />
          <SparklineCard data={marketMetrics} dataKey="avgRating" label="Avg Rating" color="#FFD500" fmt={v => `${v.toFixed(1)}★`} />
          <SparklineCard data={marketMetrics} dataKey="inStockPct" label="In Stock %" color="#34d399" fmt={v => `${v}%`} />
          <SparklineCard data={marketMetrics} dataKey="onSaleCount" label="On Sale" color="#E3000B" fmt={v => v} />
          <SparklineCard data={marketMetrics} dataKey="newCount" label="New Products" color="#006CB7" fmt={v => v} />
          <SparklineCard data={marketMetrics} dataKey="avgPieces" label="Avg Pieces" color="#a78bfa" fmt={v => Math.round(v)} />
          <SparklineCard data={marketMetrics} dataKey="maxPrice" label="Max Price" color="#f87171" fmt={v => `$${v.toFixed(0)}`} />
        </div>
      )}

      {totalValueOverTime.length > 0 && (
        <ChartCard title="Total Catalog Value Over Time" subtitle="Sum of all tracked product prices per day">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={totalValueOverTime}>
                <defs>
                  <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFD500" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FFD500" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`$${Number(v).toLocaleString()}`, 'Total Value']} />
                <Area type="monotone" dataKey="value" stroke="#FFD500" fill="url(#valueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {catalogValueByDateTheme.data.length > 0 && (
        <ChartCard title="Inventory Value by Theme Over Time" subtitle={`Top ${catalogValueByDateTheme.themes.length} themes by total catalog value`}>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={catalogValueByDateTheme.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`$${Number(v).toLocaleString()}`]} />
                <RLegend wrapperStyle={{ fontSize: '10px', color: '#888' }} />
                {catalogValueByDateTheme.themes.map((t, i) => (
                  <Area key={t} type="monotone" dataKey={t} stackId="1" fill={CHART_COLORS[i % CHART_COLORS.length]} stroke={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.6} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <ChartCard title="Set Release Timeline" subtitle="Number of new sets first seen per day">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={releaseTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis tick={{ fill: '#555', fontSize: 10 }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload
                  return (
                    <div className="glass rounded-lg p-3 border border-lego-border text-xs">
                      <div className="text-white font-semibold mb-1">{d.date}</div>
                      <div className="text-gray-400">{d.count} new sets</div>
                      <div className="text-lego-yellow">${d.totalValue.toLocaleString()} total value</div>
                      <div className="text-gray-500 mt-1">Top theme: {d.topTheme}</div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" fill="#006CB7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {availabilityOverTime.data.length > 0 && (
        <ChartCard title="Availability Status Over Time" subtitle="Product count by availability status per day (normalized)">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={availabilityOverTime.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <RLegend wrapperStyle={{ fontSize: '10px', color: '#888' }} />
                {availabilityOverTime.statuses.map((s) => (
                  <Area key={s} type="monotone" dataKey={s} stackId="1"
                    fill={availabilityOverTime.colorMap[s]}
                    stroke={availabilityOverTime.colorMap[s]}
                    fillOpacity={0.6} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <AvailabilityByThemeOverTime snapshots={snapshots} />
      <InStockPctByThemeOverTime snapshots={snapshots} />
    </div>
  )
}

/* ========================= AVAILABILITY BY THEME OVER TIME ========================= */

function AvailabilityByThemeOverTime({ snapshots }) {
  const data = useMemo(() => {
    const dates = [...new Set(snapshots.map(s => s.scraped_date))].sort()
    if (dates.length < 2) return { chartData: [], themes: [] }

    // Get top 10 themes by product count
    const themeCounts = {}
    const latestDate = dates[dates.length - 1]
    for (const s of snapshots) {
      if (s.scraped_date === latestDate && s.theme) {
        themeCounts[s.theme] = (themeCounts[s.theme] || 0) + 1
      }
    }
    const topThemes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(e => e[0])

    // Build: for each date, count in-stock products per theme
    const map = new Map()
    for (const s of snapshots) {
      if (!s.scraped_date || !s.theme || !topThemes.includes(s.theme)) continue
      if (!map.has(s.scraped_date)) map.set(s.scraped_date, {})
      const obj = map.get(s.scraped_date)
      if (!obj[s.theme]) obj[s.theme] = { total: 0, inStock: 0 }
      obj[s.theme].total++
      if (s.in_stock) obj[s.theme].inStock++
    }

    const chartData = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, obj]) => {
        const row = { date: fmtDate(date) }
        for (const t of topThemes) {
          row[t] = obj[t]?.inStock || 0
        }
        return row
      })

    return { chartData, themes: topThemes }
  }, [snapshots])

  if (data.chartData.length < 2) return null

  return (
    <ChartCard title="Product Availability by Theme Over Time" subtitle="In-stock product count per theme (top 10 themes)">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
            <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <RLegend wrapperStyle={{ fontSize: '10px', color: '#888' }} />
            {data.themes.map((t, i) => (
              <Area key={t} type="monotone" dataKey={t} stackId="1" fill={CHART_COLORS[i % CHART_COLORS.length]} stroke={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.6} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

function InStockPctByThemeOverTime({ snapshots }) {
  const data = useMemo(() => {
    const dates = [...new Set(snapshots.map(s => s.scraped_date))].sort()
    if (dates.length < 2) return { chartData: [], themes: [] }

    const themeCounts = {}
    const latestDate = dates[dates.length - 1]
    for (const s of snapshots) {
      if (s.scraped_date === latestDate && s.theme) {
        themeCounts[s.theme] = (themeCounts[s.theme] || 0) + 1
      }
    }
    const topThemes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(e => e[0])

    const map = new Map()
    for (const s of snapshots) {
      if (!s.scraped_date || !s.theme || !topThemes.includes(s.theme)) continue
      if (!map.has(s.scraped_date)) map.set(s.scraped_date, {})
      const obj = map.get(s.scraped_date)
      if (!obj[s.theme]) obj[s.theme] = { total: 0, inStock: 0 }
      obj[s.theme].total++
      if (s.in_stock) obj[s.theme].inStock++
    }

    const chartData = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, obj]) => {
        const row = { date: fmtDate(date) }
        for (const t of topThemes) {
          const entry = obj[t]
          row[t] = entry && entry.total > 0 ? Math.round((entry.inStock / entry.total) * 100) : 0
        }
        return row
      })

    return { chartData, themes: topThemes }
  }, [snapshots])

  if (data.chartData.length < 2) return null

  return (
    <ChartCard title="In-Stock % by Theme Over Time" subtitle="Percentage of products available per theme (top 8)">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
            <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`]} />
            <RLegend wrapperStyle={{ fontSize: '10px', color: '#888' }} />
            {data.themes.map((t, i) => (
              <Line key={t} type="monotone" dataKey={t} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/* ========================= CUSTOM BUILDER TAB ========================= */

const NUMERIC_FIELDS = [
  { key: 'price_usd', label: 'Price ($)' },
  { key: 'piece_count', label: 'Piece Count' },
  { key: 'rating', label: 'Rating' },
  { key: 'price_per_piece', label: 'Price/Piece' },
  { key: 'vip_points', label: 'VIP Points' },
  { key: 'discount_usd', label: 'Discount ($)' },
  { key: 'list_price_usd', label: 'List Price ($)' },
  { key: 'sale_percentage', label: 'Sale %' },
]

const GROUP_BY_FIELDS = [
  { key: 'theme', label: 'Theme' },
  { key: 'age_range', label: 'Age Range' },
  { key: 'availability_status', label: 'Availability Status' },
  { key: 'in_stock', label: 'In Stock' },
  { key: 'on_sale', label: 'On Sale' },
  { key: 'is_new', label: 'Is New' },
  { key: 'scraped_date', label: 'Date' },
]

const AGG_FUNCTIONS = [
  { key: 'avg', label: 'Average' },
  { key: 'sum', label: 'Sum' },
  { key: 'min', label: 'Min' },
  { key: 'max', label: 'Max' },
  { key: 'count', label: 'Count' },
]

const CHART_TYPES = [
  { key: 'bar', label: 'Bar', icon: BarIcon },
  { key: 'line', label: 'Line', icon: LineIcon },
  { key: 'area', label: 'Area', icon: BarChart3 },
  { key: 'pie', label: 'Pie', icon: PieIcon },
]

function CustomBuilderTab({ snapshots, loading, savedDashboardsHook }) {
  const [charts, setCharts] = useState([
    { id: 1, metric: 'price_usd', groupBy: 'theme', agg: 'avg', chartType: 'bar', label: 'Average Price ($) by Theme' },
    { id: 2, metric: 'piece_count', groupBy: 'theme', agg: 'sum', chartType: 'bar', label: 'Sum Piece Count by Theme' },
  ])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveStatus, setSaveStatus] = useState(null) // 'saving' | 'saved' | 'error'

  const { saveDashboard } = savedDashboardsHook

  const addChart = () => {
    const newChart = {
      id: Date.now(),
      metric: 'price_usd',
      groupBy: 'theme',
      agg: 'avg',
      chartType: 'bar',
      label: 'Average Price ($) by Theme'
    }
    setCharts(prev => [...prev, newChart])
    trackChartCreated(newChart.metric, newChart.groupBy, newChart.agg, newChart.chartType)
  }

  const removeChart = (id) => setCharts(prev => prev.filter(c => c.id !== id))

  const updateChart = (id, field, value) => {
    setCharts(prev => prev.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, [field]: value }
      const metricLabel = NUMERIC_FIELDS.find(f => f.key === updated.metric)?.label || updated.metric
      const aggLabel = AGG_FUNCTIONS.find(f => f.key === updated.agg)?.label || updated.agg
      const groupLabel = GROUP_BY_FIELDS.find(f => f.key === updated.groupBy)?.label || updated.groupBy
      updated.label = `${aggLabel} ${metricLabel} by ${groupLabel}`
      return updated
    }))
  }

  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  const handleDragStart = (idx) => { dragItem.current = idx }
  const handleDragOver = (e, idx) => { e.preventDefault(); dragOverItem.current = idx }
  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const copy = [...charts]
    const dragged = copy.splice(dragItem.current, 1)[0]
    copy.splice(dragOverItem.current, 0, dragged)
    setCharts(copy)
    dragItem.current = null
    dragOverItem.current = null
  }

  if (loading) return <LoadingSkeleton />

  const latestSnapshots = useMemo(() => {
    const seen = new Map()
    const sorted = [...snapshots].sort((a, b) => (b.scraped_date || '').localeCompare(a.scraped_date || ''))
    for (const s of sorted) {
      if (!seen.has(s.product_code)) seen.set(s.product_code, s)
    }
    return Array.from(seen.values())
  }, [snapshots])

  const handleSave = async () => {
    if (!saveName.trim()) return
    setSaveStatus('saving')
    try {
      await saveDashboard(saveName.trim(), charts)
      setSaveStatus('saved')
      trackDashboardSaved(saveName.trim(), charts.length)
      setTimeout(() => {
        setSaveDialogOpen(false)
        setSaveStatus(null)
        setSaveName('')
      }, 1200)
    } catch (e) {
      setSaveStatus('error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-display font-semibold text-sm text-gray-300">Custom Analytics Builder</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">Drag to reorder charts • Pick any metric, aggregation, grouping, and chart type</p>
        </div>
        <div className="flex items-center gap-2">
          {charts.length > 0 && (
            <button
              onClick={() => setSaveDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 glass glass-hover text-gray-300 text-xs font-semibold rounded-lg transition-colors"
            >
              <Save size={14} /> Save Dashboard
            </button>
          )}
          <button
            onClick={addChart}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-lego-blue hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus size={14} /> Add Chart
          </button>
        </div>
      </div>

      {/* Save Dialog */}
      {saveDialogOpen && (
        <div className="glass rounded-xl p-5 border border-lego-blue/30 animate-fade-in">
          <div className="flex items-center gap-3">
            <Save size={16} className="text-lego-blue shrink-0" />
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Dashboard name (e.g., 'My Price Analysis')"
              className="flex-1 bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-lego-blue"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim() || saveStatus === 'saving'}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all
                ${saveStatus === 'saved'
                  ? 'bg-green-600 text-white'
                  : 'bg-lego-blue hover:bg-blue-700 text-white disabled:opacity-50'}`}
            >
              {saveStatus === 'saving' ? (
                <span className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
              ) : saveStatus === 'saved' ? (
                <><Check size={14} /> Saved!</>
              ) : (
                <><Save size={14} /> Save</>
              )}
            </button>
            <button onClick={() => { setSaveDialogOpen(false); setSaveName(''); setSaveStatus(null) }}
              className="p-2 text-gray-500 hover:text-white rounded-lg transition-colors">
              <X size={14} />
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-2 ml-7">
            {charts.length} chart{charts.length !== 1 ? 's' : ''} will be saved. Find them in the Saved Reports tab.
          </p>
        </div>
      )}

      {charts.map((chart, idx) => (
        <div
          key={chart.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={handleDrop}
          className="glass rounded-xl overflow-hidden transition-all"
        >
          {/* Config Bar */}
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-lego-border/50">
            <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 transition-colors mr-1">
              <GripVertical size={16} />
            </div>
            <FieldSelect label="Metric" value={chart.metric} options={NUMERIC_FIELDS} onChange={(v) => updateChart(chart.id, 'metric', v)} />
            <FieldSelect label="Aggregate" value={chart.agg} options={AGG_FUNCTIONS} onChange={(v) => updateChart(chart.id, 'agg', v)} />
            <FieldSelect label="Group By" value={chart.groupBy} options={GROUP_BY_FIELDS} onChange={(v) => updateChart(chart.id, 'groupBy', v)} />
            <div className="flex items-center gap-0.5 ml-1 bg-lego-surface2 rounded-lg p-0.5">
              {CHART_TYPES.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => updateChart(chart.id, 'chartType', key)}
                  className={`p-1.5 rounded-md transition-all ${chart.chartType === key ? 'bg-lego-red text-white' : 'text-gray-500 hover:text-white'}`}
                  title={label}><Icon size={13} /></button>
              ))}
            </div>
            <button onClick={() => removeChart(chart.id)}
              className="ml-auto p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><X size={14} /></button>
          </div>

          {/* Chart */}
          <div className="p-5">
            <h3 className="font-display font-semibold text-sm mb-1 text-white">{chart.label}</h3>
            <p className="text-[10px] text-gray-500 mb-4">
              {AGG_FUNCTIONS.find(f => f.key === chart.agg)?.label} of {NUMERIC_FIELDS.find(f => f.key === chart.metric)?.label} grouped by {GROUP_BY_FIELDS.find(f => f.key === chart.groupBy)?.label}
            </p>
            <CustomChart config={chart} snapshots={chart.groupBy === 'scraped_date' ? snapshots : latestSnapshots} />
          </div>
        </div>
      ))}

      {charts.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Plus size={32} className="text-gray-600 mx-auto mb-3" />
          <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">No Charts Yet</h3>
          <p className="text-[11px] text-gray-500 mb-4">Add a chart to start building your custom dashboard</p>
          <button onClick={addChart} className="px-4 py-2 bg-lego-blue hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus size={14} className="inline mr-1" /> Add Your First Chart
          </button>
        </div>
      )}
    </div>
  )
}

function FieldSelect({ label, value, options, onChange }) {
  return (
    <div className="relative">
      <label className="absolute -top-1.5 left-2 text-[8px] font-mono uppercase tracking-wider text-gray-600 bg-lego-surface px-1 z-10">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 pr-7 text-xs text-white cursor-pointer focus:outline-none focus:border-lego-blue transition-colors">
        {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>
  )
}

function CustomChart({ config, snapshots }) {
  const { metric, groupBy, agg, chartType } = config

  const data = useMemo(() => {
    const groups = new Map()
    for (const s of snapshots) {
      let key = s[groupBy]
      if (key === true) key = 'Yes'
      if (key === false) key = 'No'
      if (key == null || key === '') key = 'Unknown'
      if (groupBy === 'scraped_date') key = fmtDate(key)
      if (!groups.has(key)) groups.set(key, [])
      const val = Number(s[metric])
      if (!isNaN(val) && val !== 0) groups.get(key).push(val)
    }

    const result = []
    for (const [name, values] of groups) {
      if (values.length === 0) continue
      let value
      switch (agg) {
        case 'avg': value = values.reduce((a, b) => a + b, 0) / values.length; break
        case 'sum': value = values.reduce((a, b) => a + b, 0); break
        case 'min': value = Math.min(...values); break
        case 'max': value = Math.max(...values); break
        case 'count': value = values.length; break
        default: value = values.reduce((a, b) => a + b, 0) / values.length
      }
      result.push({ name, value: Number(value.toFixed(2)) })
    }

    if (groupBy !== 'scraped_date') {
      result.sort((a, b) => b.value - a.value)
    }
    if (groupBy !== 'scraped_date' && result.length > 25) return result.slice(0, 25)
    return result
  }, [snapshots, metric, groupBy, agg])

  if (data.length === 0) {
    return <div className="h-[250px] flex items-center justify-center text-gray-600 text-xs">No data for this configuration</div>
  }

  const isTimeSeries = groupBy === 'scraped_date'

  if (chartType === 'pie') {
    return (
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data.slice(0, 12)} cx="50%" cy="50%" innerRadius={60} outerRadius={110} dataKey="value" nameKey="name" stroke="none"
              label={({ name, percent }) => `${name?.length > 15 ? name.slice(0, 15) + '…' : name} (${(percent * 100).toFixed(0)}%)`}>
              {data.slice(0, 12).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartType === 'line') {
    return (
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 9 }} angle={isTimeSeries ? 0 : -45} textAnchor={isTimeSeries ? 'middle' : 'end'} interval={isTimeSeries ? 'preserveStartEnd' : 0} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line type="monotone" dataKey="value" stroke="#FFD500" strokeWidth={2} dot={{ fill: '#FFD500', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartType === 'area') {
    return (
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="customAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#006CB7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#006CB7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 9 }} angle={isTimeSeries ? 0 : -45} textAnchor={isTimeSeries ? 'middle' : 'end'} interval={isTimeSeries ? 'preserveStartEnd' : 0} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="value" stroke="#006CB7" fill="url(#customAreaGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Bar (default)
  const isHorizontal = !isTimeSeries && data.length > 8
  if (isHorizontal) {
    return (
      <div style={{ height: Math.max(300, data.length * 28) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 5, right: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
            <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#888', fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" fill="#E3000B" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={isTimeSeries ? {} : { bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
          <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 9 }} angle={isTimeSeries ? 0 : -45} textAnchor={isTimeSeries ? 'middle' : 'end'} interval={isTimeSeries ? 'preserveStartEnd' : 0} />
          <YAxis tick={{ fill: '#555', fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" fill="#E3000B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ========================= SAVED REPORTS TAB ========================= */

function SavedReportsTab({ snapshots, loading, savedDashboardsHook, onSwitchToBuilder }) {
  const { dashboards, loading: dashLoading, deleteDashboard } = savedDashboardsHook
  const [expandedDash, setExpandedDash] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Drag reorder state for dashboard cards
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)
  const [orderedDashboards, setOrderedDashboards] = useState(dashboards)

  // Sync orderedDashboards with dashboards from hook
  useMemo(() => {
    setOrderedDashboards(dashboards)
  }, [dashboards])

  const handleDragStart = (idx) => { dragItem.current = idx }
  const handleDragOver = (e, idx) => { e.preventDefault(); dragOverItem.current = idx }
  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const copy = [...orderedDashboards]
    const dragged = copy.splice(dragItem.current, 1)[0]
    copy.splice(dragOverItem.current, 0, dragged)
    setOrderedDashboards(copy)
    dragItem.current = null
    dragOverItem.current = null
  }

  const latestSnapshots = useMemo(() => {
    if (!snapshots?.length) return []
    const seen = new Map()
    const sorted = [...snapshots].sort((a, b) => (b.scraped_date || '').localeCompare(a.scraped_date || ''))
    for (const s of sorted) {
      if (!seen.has(s.product_code)) seen.set(s.product_code, s)
    }
    return Array.from(seen.values())
  }, [snapshots])

  if (dashLoading || loading) return <LoadingSkeleton />

  if (orderedDashboards.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <BookOpen size={40} className="text-gray-600 mx-auto mb-4" />
        <h3 className="font-display font-semibold text-lg text-gray-300 mb-2">No Saved Reports Yet</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          Build custom charts in the Custom Builder tab, then save them as a dashboard to access them here anytime.
        </p>
        <button
          onClick={onSwitchToBuilder}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-lego-blue hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={16} /> Create Your First Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-display font-semibold text-sm text-gray-300">Saved Reports</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {orderedDashboards.length} saved dashboard{orderedDashboards.length !== 1 ? 's' : ''} • Drag to reorder • Click to expand
          </p>
        </div>
        <button
          onClick={onSwitchToBuilder}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-lego-blue hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Plus size={14} /> New Dashboard
        </button>
      </div>

      {orderedDashboards.map((dash, idx) => (
        <div
          key={dash.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={handleDrop}
          className="glass rounded-xl overflow-hidden transition-all"
        >
          {/* Dashboard Header */}
          <div
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
            onClick={() => setExpandedDash(expandedDash === dash.id ? null : dash.id)}
          >
            <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 transition-colors">
              <GripVertical size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm text-white truncate">{dash.name}</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {dash.charts?.length || 0} chart{(dash.charts?.length || 0) !== 1 ? 's' : ''}
                {dash.updated_at && (
                  <span className="ml-2">
                    · Saved {new Date(dash.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {/* Chart type thumbnails */}
              <div className="flex gap-0.5 mr-2">
                {(dash.charts || []).slice(0, 5).map((c, i) => {
                  const ChartIcon = { bar: BarIcon, line: LineIcon, area: BarChart3, pie: PieIcon }[c.chartType] || BarIcon
                  return <ChartIcon key={i} size={11} className="text-gray-600" />
                })}
                {(dash.charts?.length || 0) > 5 && (
                  <span className="text-[9px] text-gray-600">+{dash.charts.length - 5}</span>
                )}
              </div>
              {confirmDelete === dash.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDashboard(dash.id); setConfirmDelete(null) }}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold rounded-md transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(null) }}
                    className="px-2 py-1 glass text-gray-400 text-[10px] font-semibold rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(dash.id) }}
                  className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <ChevronDown
                size={16}
                className={`text-gray-500 transition-transform ${expandedDash === dash.id ? 'rotate-180' : ''}`}
              />
            </div>
          </div>

          {/* Expanded Charts */}
          {expandedDash === dash.id && (
            <div className="border-t border-lego-border/50">
              {(dash.charts || []).map((chart, cIdx) => (
                <div key={chart.id || cIdx} className="p-5 border-b border-lego-border/30 last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono text-gray-600 bg-lego-surface2 px-1.5 py-0.5 rounded">
                      {cIdx + 1}/{dash.charts.length}
                    </span>
                  </div>
                  <h4 className="font-display font-semibold text-sm mb-1 text-white">{chart.label}</h4>
                  <p className="text-[10px] text-gray-500 mb-4">
                    {AGG_FUNCTIONS.find(f => f.key === chart.agg)?.label} of {NUMERIC_FIELDS.find(f => f.key === chart.metric)?.label} grouped by {GROUP_BY_FIELDS.find(f => f.key === chart.groupBy)?.label}
                  </p>
                  <CustomChart config={chart} snapshots={chart.groupBy === 'scraped_date' ? snapshots : latestSnapshots} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ========================= SHARED COMPONENTS ========================= */

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display font-semibold text-sm mb-0.5">{title}</h3>
      {subtitle && <p className="text-[10px] text-gray-500 mb-4">{subtitle}</p>}
      {children}
    </div>
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

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass rounded-xl p-5 animate-pulse">
          <div className="h-4 bg-lego-surface2 rounded w-48 mb-2" />
          <div className="h-3 bg-lego-surface2 rounded w-32 mb-4" />
          <div className="h-[300px] bg-lego-surface2 rounded" />
        </div>
      ))}
    </div>
  )
}

function SparklineCard({ data, dataKey, label, color, fmt }) {
  if (!data || data.length === 0) return null
  const latest = data[data.length - 1]?.[dataKey]
  const first = data[0]?.[dataKey]
  const change = first > 0 ? ((latest - first) / first * 100) : 0
  const isUp = change > 0
  return (
    <div className="glass rounded-xl p-4 glass-hover transition-all">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{label}</div>
        {data.length > 1 && change !== 0 && (
          <span className={`text-[10px] font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="font-display font-bold text-lg mb-2" style={{ color }}>{fmt(latest)}</div>
      <div className="h-[60px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${dataKey})`} strokeWidth={1.5} dot={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmt(v), label]} labelFormatter={l => l} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ========================= OVERVIEW CHARTS ========================= */

function ThemeBarChart({ themes }) {
  const data = themes.filter(t => t.theme && t.product_count > 5).slice(0, 15)
    .map(t => ({ name: t.theme?.length > 20 ? t.theme.slice(0, 20) + '…' : t.theme, count: Number(t.product_count) }))
  return (
    <ChartCard title="Products by Theme" subtitle="Top 15 themes">
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 5, right: 15 }}>
            <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fill: '#888', fontSize: 10, fontFamily: 'DM Sans' }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="#E3000B" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

function AvailabilityPie({ themes }) {
  const inStock = themes.reduce((a, t) => a + Number(t.in_stock_count || 0), 0)
  const total = themes.reduce((a, t) => a + Number(t.product_count || 0), 0)
  const data = [{ name: 'In Stock', value: inStock }, { name: 'Out of Stock', value: total - inStock }]
  return (
    <ChartCard title="Stock Availability" subtitle="Across all tracked products">
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" stroke="none">
            <Cell fill="#34d399" /><Cell fill="#f87171" />
          </Pie><Tooltip contentStyle={TOOLTIP_STYLE} /></PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-2">
        <LegendDot color="bg-green-400" label={`In Stock (${inStock})`} />
        <LegendDot color="bg-red-400" label={`Out of Stock (${total - inStock})`} />
      </div>
    </ChartCard>
  )
}

function MostExpensiveSetsChart({ products }) {
  const data = products.slice(0, 20).map(p => ({
    name: (p.product_name || `Set ${p.product_code}`).slice(0, 30),
    price: Number(p.price_usd),
    pieces: Number(p.piece_count) || 0,
    theme: p.theme || 'Unknown'
  }))
  return (
    <ChartCard title="Most Expensive Sets" subtitle="Top 20 by retail price">
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 5, right: 15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
            <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `$${v}`} />
            <YAxis type="category" dataKey="name" width={190} tick={{ fill: '#888', fontSize: 9 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const d = payload[0].payload
                return (
                  <div className="glass rounded-lg p-3 border border-lego-border text-xs">
                    <div className="text-white font-semibold mb-1">{d.name}</div>
                    <div className="text-lego-yellow font-bold">${d.price.toFixed(2)}</div>
                    <div className="text-gray-400">{d.pieces.toLocaleString()} pieces • {d.theme}</div>
                  </div>
                )
              }} />
            <Bar dataKey="price" fill="#FFD500" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

function PriceByThemeChart({ themes }) {
  const data = themes.filter(t => t.theme && t.avg_price).sort((a, b) => Number(b.avg_price) - Number(a.avg_price)).slice(0, 12)
    .map(t => ({ name: t.theme?.length > 18 ? t.theme.slice(0, 18) + '…' : t.theme, avg: Number(Number(t.avg_price).toFixed(0)) }))
  return (
    <ChartCard title="Avg Price by Theme" subtitle="Top 12 most expensive">
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 60 }}>
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`$${v}`]} />
            <Bar dataKey="avg" fill="#FFD500" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

function PricePerPieceChart({ themes }) {
  const data = themes.filter(t => t.theme && t.avg_price_per_piece && Number(t.avg_price_per_piece) < 1)
    .sort((a, b) => Number(a.avg_price_per_piece) - Number(b.avg_price_per_piece)).slice(0, 12)
    .map(t => ({ name: t.theme?.length > 18 ? t.theme.slice(0, 18) + '…' : t.theme, ppp: Number(Number(t.avg_price_per_piece).toFixed(3)) }))
  if (!data.length) return null
  return (
    <ChartCard title="Avg Price/Piece by Theme" subtitle="Best value themes">
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 60 }}>
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`$${v}`]} />
            <Bar dataKey="ppp" fill="#006CB7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

function BestValueTable({ products }) {
  return (
    <ChartCard title="Best Value Sets" subtitle="Lowest price per piece (in stock)">
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
    </ChartCard>
  )
}

function NewProductsTable({ products }) {
  return (
    <ChartCard title="Latest Products" subtitle="Recently added to the catalog">
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
    </ChartCard>
  )
}

function ThemeComparisonTable({ themes }) {
  const data = themes.filter(t => t.theme).slice(0, 20)
  return (
    <ChartCard title="Theme Comparison" subtitle="Head-to-head stats across all themes">
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
    </ChartCard>
  )
}

function LegendDot({ color, label }) {
  return <div className="flex items-center gap-2 text-[10px]"><div className={`w-2.5 h-2.5 rounded-full ${color}`} /><span className="text-gray-400">{label}</span></div>
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}