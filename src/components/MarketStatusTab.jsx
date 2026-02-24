import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, PackageX, PackageCheck, Clock, Search, Sparkles,
  ChevronDown, ChevronUp, X
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend as RLegend
} from 'recharts'
import { getStatusDisplay } from '../lib/stockStatus'

const CHART_COLORS = ['#E3000B', '#FFD500', '#006CB7', '#00963F', '#FF6B6B', '#a78bfa', '#f97316', '#06b6d4', '#ec4899', '#84cc16']
const TOOLTIP_STYLE = { background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '11px' }

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isWithinDays(dateStr, days) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const diff = (now - d) / (1000 * 60 * 60 * 24)
  return diff <= days
}

function norm(s) {
  if (!s) return ''
  const lower = s.toLowerCase().trim()
  if (lower.includes('sold out') || lower.includes('out of stock')) return 'sold_out'
  if (lower.includes('in stock') || lower.includes('available now')) return 'in_stock'
  if (lower.includes('backorder') || lower.includes('back order')) return 'backorder'
  if (lower.includes('retiring') || lower.includes('hard to find')) return 'retiring'
  if (lower.includes('discontinued') || lower.includes('no longer available')) return 'discontinued'
  if (lower.includes('pre-order') || lower.includes('preorder') || lower.includes('coming soon')) return 'preorder'
  if (lower.includes('temporarily') || lower.includes('temp')) return 'temp_unavailable'
  return lower
}

function StatusBadge({ status }) {
  const info = getStatusDisplay(status, undefined)
  return (
    <span className={`inline-flex px-2 py-0.5 text-[9px] font-semibold rounded-full border ${info.bgClass} ${info.textClass} ${info.borderClass} whitespace-nowrap`}>
      {info.displayLabel}
    </span>
  )
}

// ── Categorization Logic ────────────────────────────────────────────────────

function categorizeChanges(statusChanges, discontinued) {
  const allChanges = [...statusChanges].filter(sc => isWithinDays(sc.date, 7))

  const soldOut = []
  const restocked = []
  const backorders = []

  for (const sc of allChanges) {
    const from = norm(sc.fromStatus)
    const to = norm(sc.toStatus)

    if (['sold_out', 'discontinued', 'retiring'].includes(to)) {
      soldOut.push(sc)
    } else if (to === 'in_stock' && ['sold_out', 'backorder', 'temp_unavailable', 'discontinued'].includes(from)) {
      restocked.push(sc)
    } else if (to === 'backorder') {
      backorders.push(sc)
    }
  }

  // Merge dedicated discontinued list, deduped
  const discRecent = (discontinued || []).filter(sc => isWithinDays(sc.date, 7))
  const soldOutCodes = new Set(soldOut.map(s => `${s.product_code}-${s.date}`))
  for (const d of discRecent) {
    const key = `${d.product_code}-${d.date}`
    if (!soldOutCodes.has(key)) {
      soldOut.push(d)
      soldOutCodes.add(key)
    }
  }

  // Sort by price high → low
  const byPriceDesc = (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)
  soldOut.sort(byPriceDesc)
  restocked.sort(byPriceDesc)
  backorders.sort(byPriceDesc)

  return { soldOut, restocked, backorders }
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function MarketStatusTab({ statusChanges, discontinued, statusOverTime, newDebuts = [] }) {
  const { soldOut, restocked, backorders } = useMemo(
    () => categorizeChanges(statusChanges, discontinued),
    [statusChanges, discontinued]
  )

  // Filter newDebuts to last 7 days, sorted by price desc
  const recentNewSets = useMemo(() => {
    return [...newDebuts]
      .filter(d => isWithinDays(d.firstSeen, 7))
      .sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
  }, [newDebuts])

  const totalChanges = soldOut.length + restocked.length + backorders.length + recentNewSets.length

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className="font-display font-semibold text-base text-white">Status Changes</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {totalChanges} change{totalChanges !== 1 ? 's' : ''} in the last 7 days
        </p>
      </div>

      {/* ── Summary Counters ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={<PackageX size={18} />} label="Sold Out" count={soldOut.length} accent="text-red-400" bgAccent="bg-red-400/10" borderAccent="border-red-500/20" />
        <SummaryCard icon={<PackageCheck size={18} />} label="Restocked" count={restocked.length} accent="text-emerald-400" bgAccent="bg-emerald-400/10" borderAccent="border-emerald-500/20" />
        <SummaryCard icon={<Clock size={18} />} label="New Backorders" count={backorders.length} accent="text-amber-400" bgAccent="bg-amber-400/10" borderAccent="border-amber-500/20" />
        <SummaryCard icon={<Sparkles size={18} />} label="New Sets" count={recentNewSets.length} accent="text-blue-400" bgAccent="bg-blue-400/10" borderAccent="border-blue-500/20" />
      </div>

      {/* ── Category Sections ──────────────────────────────────────────── */}
      <StatusSection
        icon={<PackageX size={16} className="text-red-400" />}
        title="Just Went Sold Out"
        subtitle="Sets that moved to Sold Out, Retiring, or Discontinued"
        accent="border-red-500/30"
        items={soldOut}
        emptyMsg="No sets went sold out this week"
      />

      <StatusSection
        icon={<PackageCheck size={16} className="text-emerald-400" />}
        title="Restocked"
        subtitle="Previously sold-out sets that are back in stock"
        accent="border-emerald-500/30"
        items={restocked}
        emptyMsg="No restocks detected this week"
      />

      <StatusSection
        icon={<Clock size={16} className="text-amber-400" />}
        title="New Backorders"
        subtitle="Sets that moved to Backorder status"
        accent="border-amber-500/30"
        items={backorders}
        emptyMsg="No new backorders this week"
      />

      <NewSetsSection items={recentNewSets} />

      {/* ── All Status Changes Table ───────────────────────────────────── */}
      <AllStatusChangesTable statusChanges={statusChanges} />

      {/* ── Status Distribution Chart ──────────────────────────────────── */}
      {statusOverTime.data.length > 1 && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-sm mb-0.5">Status Distribution Over Time</h3>
          <p className="text-[10px] text-gray-500 mb-4">Catalog-wide availability trends</p>
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
        </div>
      )}
    </div>
  )
}

// ── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, count, accent, bgAccent, borderAccent }) {
  return (
    <div className={`glass rounded-xl p-4 text-left border ${borderAccent} ${bgAccent}`}>
      <div className={`mb-2 ${accent}`}>{icon}</div>
      <div className={`font-display font-bold text-2xl ${accent}`}>{count}</div>
      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

// ── Collapsible Status Section (8 default, expandable) ──────────────────────

function StatusSection({ icon, title, subtitle, accent, items, emptyMsg }) {
  const [expanded, setExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)

  const INITIAL_COUNT = 8
  const displayItems = showAll ? items : items.slice(0, INITIAL_COUNT)
  const hasMore = items.length > INITIAL_COUNT

  return (
    <div className={`glass rounded-xl overflow-hidden transition-all border-l-2 ${accent}`}>
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-sm text-white">{title}</h3>
            <span className="text-[10px] font-mono text-gray-500 bg-lego-surface2 px-1.5 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-gray-500 shrink-0" />
          : <ChevronDown size={16} className="text-gray-500 shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-lego-border/30">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-gray-600">{emptyMsg}</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-lego-border/20">
                {displayItems.map((sc, i) => (
                  <Link
                    key={`${sc.product_code}-${sc.date}-${i}`}
                    to={`/product/${sc.slug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white font-semibold truncate group-hover:text-lego-yellow transition-colors">
                        {sc.product_name}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{sc.theme}</span>
                        <span className="text-gray-700">·</span>
                        <span>{fmtDate(sc.date)}</span>
                        {sc.price > 0 && (
                          <>
                            <span className="text-gray-700">·</span>
                            <span className="text-lego-yellow font-mono">${sc.price.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={sc.fromStatus} />
                      <ArrowRight size={10} className="text-gray-600" />
                      <StatusBadge status={sc.toStatus} />
                    </div>
                  </Link>
                ))}
              </div>
              {hasMore && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAll(prev => !prev) }}
                  className="w-full px-4 py-2.5 text-center text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.02] transition-colors border-t border-lego-border/20"
                >
                  {showAll ? 'Show less' : `Show all ${items.length} changes`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── New Sets Section ────────────────────────────────────────────────────────

function NewSetsSection({ items }) {
  const [expanded, setExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)

  const INITIAL_COUNT = 8
  const displayItems = showAll ? items : items.slice(0, INITIAL_COUNT)
  const hasMore = items.length > INITIAL_COUNT

  return (
    <div className="glass rounded-xl overflow-hidden transition-all border-l-2 border-blue-500/30">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <Sparkles size={16} className="text-blue-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-sm text-white">New Sets</h3>
            <span className="text-[10px] font-mono text-gray-500 bg-lego-surface2 px-1.5 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">Products first seen in the catalog this week</p>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-gray-500 shrink-0" />
          : <ChevronDown size={16} className="text-gray-500 shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-lego-border/30">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-gray-600">No new sets added this week</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-lego-border/20">
                {displayItems.map((item, i) => (
                  <Link
                    key={`${item.product_code}-${i}`}
                    to={`/product/${item.slug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white font-semibold truncate group-hover:text-lego-yellow transition-colors">
                        {item.product_name}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{item.theme}</span>
                        <span className="text-gray-700">·</span>
                        <span>First seen {fmtDate(item.firstSeen)}</span>
                        {item.piece_count > 0 && (
                          <>
                            <span className="text-gray-700">·</span>
                            <span>{item.piece_count.toLocaleString()} pcs</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.rating && (
                        <span className="text-[10px] text-lego-yellow font-mono">{Number(item.rating).toFixed(1)}★</span>
                      )}
                      {item.price > 0 && (
                        <span className="text-xs text-lego-yellow font-mono font-semibold">${item.price.toFixed(2)}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {hasMore && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAll(prev => !prev) }}
                  className="w-full px-4 py-2.5 text-center text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.02] transition-colors border-t border-lego-border/20"
                >
                  {showAll ? 'Show less' : `Show all ${items.length} new sets`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── All Status Changes Table with Search & Theme Filter ─────────────────────

function AllStatusChangesTable({ statusChanges }) {
  const [search, setSearch] = useState('')
  const [themeFilter, setThemeFilter] = useState('')
  const [showCount, setShowCount] = useState(30)

  const themes = useMemo(() => {
    const set = new Set()
    for (const sc of statusChanges) {
      if (sc.theme) set.add(sc.theme)
    }
    return [...set].sort()
  }, [statusChanges])

  const filtered = useMemo(() => {
    let result = statusChanges
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(sc =>
        (sc.product_name || '').toLowerCase().includes(q) ||
        (sc.product_code || '').toLowerCase().includes(q)
      )
    }
    if (themeFilter) {
      result = result.filter(sc => sc.theme === themeFilter)
    }
    return result
  }, [statusChanges, search, themeFilter])

  const displayed = filtered.slice(0, showCount)
  const hasMore = filtered.length > showCount

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-semibold text-sm text-white">All Status Changes</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {filtered.length} transition{filtered.length !== 1 ? 's' : ''} total
            {(search || themeFilter) && ` (filtered from ${statusChanges.length})`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowCount(30) }}
              placeholder="Search products…"
              className="bg-lego-surface2 border border-lego-border rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-lego-blue transition-colors w-48"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={themeFilter}
              onChange={(e) => { setThemeFilter(e.target.value); setShowCount(30) }}
              className="appearance-none bg-lego-surface2 border border-lego-border rounded-lg px-3 py-1.5 pr-7 text-xs text-white cursor-pointer focus:outline-none focus:border-lego-blue transition-colors"
            >
              <option value="">All Themes</option>
              {themes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          {(search || themeFilter) && (
            <button
              onClick={() => { setSearch(''); setThemeFilter(''); setShowCount(30) }}
              className="text-[10px] text-gray-500 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-lego-border">
              {['Date', 'Product', 'Theme', 'From', '', 'To', 'Price'].map((h, i) => (
                <th key={i} className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-600 text-xs">
                  {search || themeFilter ? 'No results match your filters' : 'No status changes recorded'}
                </td>
              </tr>
            ) : (
              displayed.map((sc, i) => (
                <tr key={`${sc.product_code}-${sc.date}-${i}`} className="border-b border-lego-border/30 hover:bg-white/[0.02]">
                  <td className="py-2 px-2 text-gray-500 whitespace-nowrap">{fmtDate(sc.date)}</td>
                  <td className="py-2 px-2">
                    <Link to={`/product/${sc.slug}`} className="text-white hover:text-lego-yellow font-medium transition-colors">
                      {sc.product_name}
                    </Link>
                  </td>
                  <td className="py-2 px-2 text-gray-500 whitespace-nowrap">{sc.theme}</td>
                  <td className="py-2 px-2"><StatusBadge status={sc.fromStatus} /></td>
                  <td className="py-1 px-1"><ArrowRight size={10} className="text-gray-600" /></td>
                  <td className="py-2 px-2"><StatusBadge status={sc.toStatus} /></td>
                  <td className="py-2 px-2 font-mono text-lego-yellow whitespace-nowrap">
                    {sc.price > 0 ? `$${sc.price.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          onClick={() => setShowCount(prev => prev + 30)}
          className="w-full mt-3 py-2 text-center text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.02] rounded-lg transition-colors border border-lego-border/30"
        >
          Show more ({filtered.length - showCount} remaining)
        </button>
      )}
    </div>
  )
}