// src/components/RetailerAnalyticsTab.jsx
//
// Redesigned "Retailers" tab — simpler, deal-focused layout.
// Sections:
//   1. Retailer Deal Feed — running list of recent deals per retailer (clickable, filterable)
//   2. Cheapest Retailer Wins — leaderboard (multi-retailer products only)
//   3. Discounts by Theme — which themes are most discounted right now
//   4. Retailer Snapshot — compact profiles

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Store, Tag, Trophy, ArrowDown, Flame, ChevronDown, X
} from 'lucide-react'
import {
  useCheapestLeaderboard,
  usePriceMovers,
  useDiscountProfiles,
} from '../hooks/useRetailerAnalytics'
import { RETAILER_CONFIG } from '../hooks/useData'
import { supabase } from '../lib/supabase'

// ── Retailer color helper ──
const LABEL_TO_KEY = {
  'lego.com': 'lego',
  'Best Buy': 'bestbuy',
  'Target':   'target',
  'Walmart':  'walmart',
  'Amazon':   'amazon',
}
const getRetailerColor = (label) => {
  const key = LABEL_TO_KEY[label]
  return key ? RETAILER_CONFIG[key]?.color : '#6b7280'
}


// ═══════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════

export default function RetailerAnalyticsTab() {
  const { data: leaderboard, loading: lbL } = useCheapestLeaderboard()
  const { data: movers, loading: mvL } = usePriceMovers()
  const { data: discounts, loading: dcL } = useDiscountProfiles()

  // ── Enrich movers with theme + slug from v_latest_products ──
  const [enrichedMovers, setEnrichedMovers] = useState([])
  const [enrichLoading, setEnrichLoading] = useState(false)

  useEffect(() => {
    if (!movers?.length) { setEnrichedMovers([]); return }
    let cancelled = false

    async function enrich() {
      setEnrichLoading(true)
      // Get unique product codes from movers
      const codes = [...new Set(movers.map(m => m.product_code).filter(Boolean))]
      if (codes.length === 0) { setEnrichedMovers(movers); setEnrichLoading(false); return }

      // Fetch theme + slug for these product codes (batch in chunks)
      const themeMap = {}
      for (let i = 0; i < codes.length; i += 30) {
        const chunk = codes.slice(i, i + 30)
        const { data: rows } = await supabase
          .from('v_latest_products')
          .select('product_code, theme, slug')
          .in('product_code', chunk)
        if (rows) {
          for (const r of rows) {
            themeMap[r.product_code] = { theme: r.theme, slug: r.slug }
          }
        }
      }

      if (cancelled) return

      // Merge into movers
      const enriched = movers.map(m => ({
        ...m,
        theme: m.theme || themeMap[m.product_code]?.theme || null,
        slug: m.slug || themeMap[m.product_code]?.slug || null,
      }))
      setEnrichedMovers(enriched)
      setEnrichLoading(false)
    }

    enrich()
    return () => { cancelled = true }
  }, [movers])

  const anyLoading = lbL || mvL || dcL || enrichLoading
  const hasData = leaderboard?.length || movers?.length || discounts?.length

  if (anyLoading) return <LoadingSkeleton />

  if (!hasData) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <Store size={36} className="text-gray-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">Multi-Retailer Data Building Up</h3>
        <p className="text-[11px] text-gray-500 max-w-md mx-auto">
          Once your pipeline collects data from multiple retailers (Best Buy, Target, Walmart, Amazon),
          cross-retailer analytics will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Deal Feed */}
      {enrichedMovers.length > 0 && <DealFeed data={enrichedMovers} />}

      {/* 2. Two-column: Leaderboard + Theme Discounts */}
      <div className="grid lg:grid-cols-2 gap-5">
        {leaderboard?.length > 0 && <CheapestLeaderboard data={leaderboard} />}
        {enrichedMovers.length > 0 && <DiscountsByTheme data={enrichedMovers} />}
      </div>

      {/* 3. Retailer Profiles (compact) */}
      {discounts?.length > 0 && <RetailerProfiles data={discounts} />}
    </div>
  )
}


// ═══════════════════════════════════════════════════════
// 1. DEAL FEED — Running list of recent deals by retailer
// ═══════════════════════════════════════════════════════

function DealFeed({ data }) {
  const [selectedRetailer, setSelectedRetailer] = useState('all')
  const [selectedTheme, setSelectedTheme] = useState('all')
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false)
  const [showCount, setShowCount] = useState(15)

  // Only price drops
  const allDeals = useMemo(() => {
    return data
      .filter(d => Number(d.price_change) < 0)
      .sort((a, b) => Math.abs(Number(b.price_change)) - Math.abs(Number(a.price_change)))
  }, [data])

  // Unique retailers and themes from deals
  const retailers = useMemo(() => {
    const set = new Set(allDeals.map(d => d.retailer).filter(Boolean))
    return [...set].sort()
  }, [allDeals])

  const themes = useMemo(() => {
    const set = new Set(allDeals.map(d => d.theme).filter(Boolean))
    return [...set].sort()
  }, [allDeals])

  // Apply filters
  const deals = useMemo(() => {
    let results = allDeals
    if (selectedRetailer !== 'all') {
      results = results.filter(d => d.retailer === selectedRetailer)
    }
    if (selectedTheme !== 'all') {
      results = results.filter(d => d.theme === selectedTheme)
    }
    return results
  }, [allDeals, selectedRetailer, selectedTheme])

  const visible = deals.slice(0, showCount)

  // Reset showCount when filters change
  useEffect(() => { setShowCount(15) }, [selectedRetailer, selectedTheme])

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Tag size={18} className="text-green-400" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-white">Latest Deals</h3>
              <p className="text-[10px] text-gray-500">Price drops across all retailers in the last 48 hours</p>
            </div>
          </div>
          <span className="text-[10px] text-gray-600 font-mono">{deals.length} deal{deals.length !== 1 ? 's' : ''} found</span>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          {/* Retailer pills */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedRetailer('all')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all
                ${selectedRetailer === 'all'
                  ? 'bg-white/10 text-white ring-1 ring-white/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
              All Retailers
            </button>
            {retailers.map(r => {
              const color = getRetailerColor(r)
              const isActive = selectedRetailer === r
              return (
                <button
                  key={r}
                  onClick={() => setSelectedRetailer(r)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all
                    ${isActive
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                  style={isActive ? {
                    background: `${color}15`,
                    boxShadow: `inset 0 0 0 1px ${color}40`,
                  } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  {r}
                </button>
              )
            })}
          </div>

          {/* Theme dropdown */}
          {themes.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all
                  ${selectedTheme !== 'all'
                    ? 'bg-lego-yellow/10 text-lego-yellow ring-1 ring-lego-yellow/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 ring-1 ring-white/10'}`}
              >
                {selectedTheme !== 'all' ? (
                  <>
                    <span className="max-w-[120px] truncate">{selectedTheme}</span>
                    <X
                      size={10}
                      className="shrink-0 hover:text-white"
                      onClick={(e) => { e.stopPropagation(); setSelectedTheme('all'); setThemeDropdownOpen(false) }}
                    />
                  </>
                ) : (
                  <>
                    Filter by Theme
                    <ChevronDown size={10} className={`transition-transform ${themeDropdownOpen ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>

              {themeDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setThemeDropdownOpen(false)} />
                  {/* Dropdown */}
                  <div className="absolute top-full left-0 mt-1 z-20 w-56 max-h-64 overflow-y-auto glass rounded-lg border border-lego-border shadow-xl">
                    <button
                      onClick={() => { setSelectedTheme('all'); setThemeDropdownOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-[10px] font-semibold transition-colors
                        ${selectedTheme === 'all' ? 'text-white bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'}`}
                    >
                      All Themes
                    </button>
                    {themes.map(t => (
                      <button
                        key={t}
                        onClick={() => { setSelectedTheme(t); setThemeDropdownOpen(false) }}
                        className={`w-full text-left px-3 py-2 text-[10px] transition-colors truncate
                          ${selectedTheme === t ? 'text-lego-yellow bg-lego-yellow/5 font-semibold' : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deal cards */}
      <div className="px-5 pb-5">
        {visible.length === 0 ? (
          <div className="py-8 text-center text-gray-600 text-xs">
            No price drops found for this filter.
          </div>
        ) : (
          <div className="space-y-1.5">
            {visible.map((deal, i) => (
              <DealRow key={`${deal.product_code}-${deal.retailer}-${i}`} deal={deal} />
            ))}
          </div>
        )}

        {/* Show more */}
        {deals.length > showCount && (
          <button
            onClick={() => setShowCount(prev => prev + 15)}
            className="w-full mt-3 py-2.5 text-[10px] font-semibold text-gray-500 hover:text-gray-300 hover:bg-white/[0.02] rounded-lg transition-colors"
          >
            Show more deals ({deals.length - showCount} remaining)
          </button>
        )}
      </div>
    </div>
  )
}

function DealRow({ deal }) {
  const change = Number(deal.price_change)
  const changePct = Number(deal.change_pct)
  const oldPrice = Number(deal.old_price)
  const newPrice = Number(deal.new_price)
  const color = getRetailerColor(deal.retailer)
  const productName = deal.product_name || `Set ${deal.product_code}`

  const inner = (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer group">
      {/* Retailer accent */}
      <div
        className="w-1 h-10 rounded-full shrink-0 transition-all group-hover:h-12"
        style={{ background: color }}
      />

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-white group-hover:text-lego-yellow transition-colors line-clamp-1">
          {productName}
        </span>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            {deal.retailer}
          </span>
          {deal.theme && (
            <>
              <span className="text-gray-700">·</span>
              <span className="truncate">{deal.theme}</span>
            </>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="text-right shrink-0">
        <div className="flex items-center gap-2 justify-end">
          <span className="text-[10px] text-gray-600 line-through font-mono">
            ${oldPrice.toFixed(2)}
          </span>
          <span className="text-xs font-bold text-white font-mono">
            ${newPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1 justify-end mt-0.5">
          <ArrowDown size={10} className="text-green-400" />
          <span className="text-[10px] font-bold text-green-400 font-mono">
            ${Math.abs(change).toFixed(2)} ({Math.abs(changePct).toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  )

  // Wrap in Link if slug is available, otherwise render as-is
  if (deal.slug) {
    return <Link to={`/product/${deal.slug}`} className="block">{inner}</Link>
  }
  return inner
}


// ═══════════════════════════════════════════════════════
// 2. CHEAPEST LEADERBOARD (fixed: tie-break logic)
// ═══════════════════════════════════════════════════════

function CheapestLeaderboard({ data }) {
  const sorted = useMemo(() => {
    return [...data]
      .sort((a, b) => {
        const pctDiff = Number(b.win_pct) - Number(a.win_pct)
        if (Math.abs(pctDiff) < 0.01) {
          // On tie, push lego.com down
          const aIsLego = a.retailer?.toLowerCase().includes('lego')
          const bIsLego = b.retailer?.toLowerCase().includes('lego')
          if (aIsLego && !bIsLego) return 1
          if (!aIsLego && bIsLego) return -1
        }
        return pctDiff
      })
  }, [data])

  const maxPct = sorted.length > 0 ? Number(sorted[0].win_pct) : 100

  return (
    <ChartCard
      title="Who Has the Best Price?"
      subtitle="How often each retailer had the lowest price (products at 2+ retailers)"
      icon={<Trophy size={16} className="text-yellow-400" />}
    >
      <div className="space-y-3">
        {sorted.map((r, i) => {
          const pct = Number(r.win_pct) || 0
          const color = getRetailerColor(r.retailer)
          const isTop = i === 0

          return (
            <div key={r.retailer}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {isTop && <Trophy size={12} className="text-yellow-400" />}
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className={`text-xs font-semibold ${isTop ? 'text-white' : 'text-gray-400'}`}>
                    {r.retailer}
                  </span>
                </div>
                <span className="text-sm font-bold font-mono" style={{ color }}>
                  {pct}%
                </span>
              </div>
              <div className="h-2 bg-lego-surface2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${maxPct > 0 ? (pct / maxPct) * 100 : 0}%`,
                    background: color,
                    opacity: isTop ? 1 : 0.7,
                    boxShadow: isTop ? `0 0 10px ${color}30` : 'none',
                  }}
                />
              </div>
              <div className="text-[9px] text-gray-600 font-mono mt-0.5">
                {Number(r.win_count).toLocaleString()} wins of {Number(r.total_comparisons).toLocaleString()} comparisons
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[9px] text-gray-600 mt-4 pt-3 border-t border-lego-border/30">
        Ties broken in favor of non-LEGO retailers since LEGO.com is typically full MSRP.
      </p>
    </ChartCard>
  )
}


// ═══════════════════════════════════════════════════════
// 3. DISCOUNTS BY THEME
// ═══════════════════════════════════════════════════════

function DiscountsByTheme({ data }) {
  const themeData = useMemo(() => {
    // Only use drops that actually have a theme (enriched)
    const drops = data.filter(d => Number(d.price_change) < 0 && d.theme)
    const themes = {}

    for (const d of drops) {
      const theme = d.theme
      if (!themes[theme]) {
        themes[theme] = { count: 0, totalSaved: 0, pcts: [] }
      }
      themes[theme].count++
      themes[theme].totalSaved += Math.abs(Number(d.price_change))
      themes[theme].pcts.push(Math.abs(Number(d.change_pct)))
    }

    return Object.entries(themes)
      .map(([name, info]) => ({
        name: name.length > 22 ? name.slice(0, 22) + '…' : name,
        fullName: name,
        deals: info.count,
        totalSaved: Math.round(info.totalSaved),
        avgPct: Math.round(info.pcts.reduce((a, b) => a + b, 0) / info.pcts.length),
      }))
      .sort((a, b) => b.deals - a.deals)
      .slice(0, 12)
  }, [data])

  if (themeData.length === 0) {
    return (
      <ChartCard
        title="Deals by Theme"
        subtitle="Which themes have the most discounts right now"
        icon={<Flame size={16} className="text-orange-400" />}
      >
        <div className="py-8 text-center text-gray-600 text-xs">
          No theme discount data available yet. Theme data will appear once products are enriched.
        </div>
      </ChartCard>
    )
  }

  const THEME_COLORS = ['#34d399', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#fb923c', '#06b6d4', '#ec4899', '#84cc16', '#f59e0b', '#8b5cf6', '#14b8a6']

  return (
    <ChartCard
      title="Deals by Theme"
      subtitle="Themes with the most price drops in the last 48 hours"
      icon={<Flame size={16} className="text-orange-400" />}
    >
      <div className="space-y-2.5">
        {themeData.map((theme, i) => {
          const maxDeals = themeData[0]?.deals || 1
          const barWidth = (theme.deals / maxDeals) * 100
          const color = THEME_COLORS[i % THEME_COLORS.length]

          return (
            <div key={theme.fullName}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300 font-medium truncate mr-3">
                  {theme.name}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-gray-500 font-mono">
                    ~{theme.avgPct}% off
                  </span>
                  <span className="text-xs font-bold font-mono" style={{ color }}>
                    {theme.deals} deal{theme.deals !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-lego-surface2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, background: color, opacity: 0.8 }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-lego-border/30 flex items-center justify-between">
        <span className="text-[9px] text-gray-600">
          {themeData.reduce((a, t) => a + t.deals, 0)} total deals across {themeData.length} theme{themeData.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[9px] text-gray-600">
          ${themeData.reduce((a, t) => a + t.totalSaved, 0).toLocaleString()} total savings
        </span>
      </div>
    </ChartCard>
  )
}


// ═══════════════════════════════════════════════════════
// 4. RETAILER PROFILES (compact)
// ═══════════════════════════════════════════════════════

function RetailerProfiles({ data }) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => Number(b.pct_discounted) - Number(a.pct_discounted)),
    [data]
  )

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Store size={16} className="text-blue-400" />
        <h3 className="font-display font-semibold text-sm text-white">Retailer Snapshot</h3>
      </div>
      <p className="text-[10px] text-gray-500 mb-4">How each retailer prices and discounts their LEGO catalog</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {sorted.map((r) => {
          const color = getRetailerColor(r.retailer)
          const pctDisc = Number(r.pct_discounted) || 0
          const avgDepth = Number(r.avg_discount_depth) || 0
          const maxDisc = Number(r.max_discount) || 0
          const catalogSize = Number(r.catalog_size) || 0

          return (
            <div
              key={r.retailer}
              className="rounded-lg p-3.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-xs font-semibold text-white">{r.retailer}</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-gray-600 uppercase tracking-wider">Catalog</span>
                  <span className="text-xs font-bold text-white font-mono">{catalogSize.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-gray-600 uppercase tracking-wider">On Sale</span>
                  <span className="text-xs font-bold font-mono" style={{ color: pctDisc > 15 ? '#34d399' : '#888' }}>
                    {pctDisc}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-gray-600 uppercase tracking-wider">Avg Off</span>
                  <span className="text-xs font-bold font-mono" style={{ color: avgDepth > 10 ? '#fbbf24' : '#888' }}>
                    {avgDepth > 0 ? `${avgDepth}%` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-gray-600 uppercase tracking-wider">Best Deal</span>
                  <span className="text-xs font-bold font-mono text-red-400">
                    {maxDisc > 0 ? `${maxDisc}% off` : '—'}
                  </span>
                </div>
              </div>

              <div className="mt-3 h-1 bg-lego-surface2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(pctDisc, 1)}%`, background: color, opacity: 0.6 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════

function ChartCard({ title, subtitle, icon, children }) {
  return (
    <div className="glass rounded-xl p-5">
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-0.5">
          {icon}
          {title && <h3 className="font-display font-semibold text-sm">{title}</h3>}
        </div>
      )}
      {subtitle && <p className="text-[10px] text-gray-500 mb-4">{subtitle}</p>}
      {children}
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