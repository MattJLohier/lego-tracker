// src/components/MarketStatusTab.jsx
//
// "Status Changes" tab on the Analytics page.
// Now has two sub-tabs:
//   • LEGO.com  — the original status change feed (from useAlerts data)
//   • Retailers — stock/price status changes from Best Buy, Target, Walmart, Amazon

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, PackageX, PackageCheck, Clock, Search, Sparkles,
  ChevronDown, ChevronUp, X, Store
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend as RLegend
} from 'recharts'
import { getStatusDisplay } from '../lib/stockStatus'
import { supabase } from '../lib/supabase'
import { RETAILER_CONFIG } from '../hooks/useData'

const CHART_COLORS = ['#E3000B', '#FFD500', '#006CB7', '#00963F', '#FF6B6B', '#a78bfa', '#f97316', '#06b6d4', '#ec4899', '#84cc16']
const TOOLTIP_STYLE = { background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '11px' }

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

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isWithinDays(dateStr, days) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return (now - d) / (1000 * 60 * 60 * 24) <= days
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

function RetailerStatusBadge({ available, label }) {
  if (available === true || available === 'true') {
    return (
      <span className="inline-flex px-2 py-0.5 text-[9px] font-semibold rounded-full border bg-green-500/15 text-green-400 border-green-500/30 whitespace-nowrap">
        {label || 'In Stock'}
      </span>
    )
  }
  if (available === false || available === 'false') {
    return (
      <span className="inline-flex px-2 py-0.5 text-[9px] font-semibold rounded-full border bg-red-500/15 text-red-400 border-red-500/30 whitespace-nowrap">
        {label || 'Out of Stock'}
      </span>
    )
  }
  return (
    <span className="inline-flex px-2 py-0.5 text-[9px] font-semibold rounded-full border bg-gray-500/15 text-gray-400 border-gray-500/30 whitespace-nowrap">
      {label || 'Unknown'}
    </span>
  )
}


// ── Categorization Logic (LEGO tab) ─────────────────────────────────────────

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

  const discRecent = (discontinued || []).filter(sc => isWithinDays(sc.date, 7))
  const soldOutCodes = new Set(soldOut.map(s => `${s.product_code}-${s.date}`))
  for (const d of discRecent) {
    const key = `${d.product_code}-${d.date}`
    if (!soldOutCodes.has(key)) {
      soldOut.push(d)
      soldOutCodes.add(key)
    }
  }

  const byPriceDesc = (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)
  soldOut.sort(byPriceDesc)
  restocked.sort(byPriceDesc)
  backorders.sort(byPriceDesc)

  return { soldOut, restocked, backorders }
}


// ═══════════════════════════════════════════════════════
// MAIN EXPORT — now has sub-tabs
// ═══════════════════════════════════════════════════════

export default function MarketStatusTab({ statusChanges, discontinued, statusOverTime, newDebuts = [] }) {
  const [subTab, setSubTab] = useState('lego')

  return (
    <div className="space-y-5">
      {/* Sub-tab switcher */}
      <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
        <button
          onClick={() => setSubTab('lego')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all
            ${subTab === 'lego'
              ? 'bg-lego-yellow text-black shadow-lg shadow-lego-yellow/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          <span className="w-2 h-2 rounded-full bg-lego-yellow" />
          LEGO.com
        </button>
        <button
          onClick={() => setSubTab('retailers')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all
            ${subTab === 'retailers'
              ? 'bg-lego-blue text-white shadow-lg shadow-lego-blue/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          <Store size={13} />
          Retailers
        </button>
      </div>

      {subTab === 'lego' && (
        <LegoStatusTab
          statusChanges={statusChanges}
          discontinued={discontinued}
          statusOverTime={statusOverTime}
          newDebuts={newDebuts}
        />
      )}

      {subTab === 'retailers' && (
        <RetailerStatusTab />
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════
// LEGO.COM SUB-TAB (original, unchanged)
// ═══════════════════════════════════════════════════════

function LegoStatusTab({ statusChanges, discontinued, statusOverTime, newDebuts = [] }) {
  const { soldOut, restocked, backorders } = useMemo(
    () => categorizeChanges(statusChanges, discontinued),
    [statusChanges, discontinued]
  )

  const recentNewSets = useMemo(() => {
    return [...newDebuts]
      .filter(d => isWithinDays(d.firstSeen, 7))
      .sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
  }, [newDebuts])

  const totalChanges = soldOut.length + restocked.length + backorders.length + recentNewSets.length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-semibold text-base text-white">LEGO.com Status Changes</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {totalChanges} change{totalChanges !== 1 ? 's' : ''} in the last 7 days
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={<PackageX size={18} />} label="Sold Out" count={soldOut.length} accent="text-red-400" bgAccent="bg-red-400/10" borderAccent="border-red-500/20" />
        <SummaryCard icon={<PackageCheck size={18} />} label="Restocked" count={restocked.length} accent="text-emerald-400" bgAccent="bg-emerald-400/10" borderAccent="border-emerald-500/20" />
        <SummaryCard icon={<Clock size={18} />} label="New Backorders" count={backorders.length} accent="text-amber-400" bgAccent="bg-amber-400/10" borderAccent="border-amber-500/20" />
        <SummaryCard icon={<Sparkles size={18} />} label="New Sets" count={recentNewSets.length} accent="text-blue-400" bgAccent="bg-blue-400/10" borderAccent="border-blue-500/20" />
      </div>

      <StatusSection icon={<PackageX size={16} className="text-red-400" />} title="Just Went Sold Out" subtitle="Sets that moved to Sold Out, Retiring, or Discontinued" accent="border-red-500/30" items={soldOut} emptyMsg="No sets went sold out this week" />
      <StatusSection icon={<PackageCheck size={16} className="text-emerald-400" />} title="Restocked" subtitle="Previously sold-out sets that are back in stock" accent="border-emerald-500/30" items={restocked} emptyMsg="No restocks detected this week" />
      <StatusSection icon={<Clock size={16} className="text-amber-400" />} title="New Backorders" subtitle="Sets that moved to Backorder status" accent="border-amber-500/30" items={backorders} emptyMsg="No new backorders this week" />
      <NewSetsSection items={recentNewSets} />
      <AllStatusChangesTable statusChanges={statusChanges} />

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


// ═══════════════════════════════════════════════════════
// RETAILERS SUB-TAB
// ═══════════════════════════════════════════════════════

function RetailerStatusTab() {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRetailer, setSelectedRetailer] = useState('all')

  useEffect(() => {
    let cancelled = false

    async function fetchRetailerChanges() {
      setLoading(true)
      const allChanges = []

      // ── Best Buy: track online_available changes ──
      try {
        const { data: bbRows } = await supabase
          .from('v_bestbuy_timeseries')
          .select('sku, product_name, sale_price, regular_price, on_sale, online_available, in_store_available, product_url, scraped_date')
          .order('sku', { ascending: true })
          .order('scraped_date', { ascending: true })

        if (bbRows && bbRows.length > 0) {
          const byProduct = new Map()
          for (const row of bbRows) {
            if (!byProduct.has(row.sku)) byProduct.set(row.sku, [])
            byProduct.get(row.sku).push(row)
          }

          for (const [sku, snaps] of byProduct) {
            for (let i = 1; i < snaps.length; i++) {
              const prev = snaps[i - 1]
              const curr = snaps[i]
              // Stock change
              if (prev.online_available !== curr.online_available) {
                allChanges.push({
                  retailer: 'Best Buy',
                  product_code: sku,
                  product_name: curr.product_name,
                  date: curr.scraped_date,
                  fromAvailable: prev.online_available,
                  toAvailable: curr.online_available,
                  fromLabel: prev.online_available ? 'In Stock' : 'Out of Stock',
                  toLabel: curr.online_available ? 'In Stock' : 'Out of Stock',
                  price: Number(curr.sale_price || curr.regular_price) || 0,
                  url: curr.product_url,
                  changeType: curr.online_available ? 'restocked' : 'sold_out',
                })
              }
            }
          }
        }
      } catch (e) { console.warn('Best Buy status fetch error:', e) }

      // ── Walmart: track availability_status changes ──
      try {
        const { data: wmRows } = await supabase
          .from('v_walmart_timeseries')
          .select('us_item_id, product_name, sale_price, regular_price, on_sale, availability_status, availability_display, product_url, scraped_date')
          .order('us_item_id', { ascending: true })
          .order('scraped_date', { ascending: true })

        if (wmRows && wmRows.length > 0) {
          const byProduct = new Map()
          for (const row of wmRows) {
            if (!byProduct.has(row.us_item_id)) byProduct.set(row.us_item_id, [])
            byProduct.get(row.us_item_id).push(row)
          }

          for (const [id, snaps] of byProduct) {
            for (let i = 1; i < snaps.length; i++) {
              const prev = snaps[i - 1]
              const curr = snaps[i]
              const prevStatus = (prev.availability_status || '').toLowerCase()
              const currStatus = (curr.availability_status || '').toLowerCase()
              if (prevStatus !== currStatus && currStatus) {
                const wasAvailable = /available|in.?stock/i.test(prevStatus)
                const nowAvailable = /available|in.?stock/i.test(currStatus)
                allChanges.push({
                  retailer: 'Walmart',
                  product_code: id,
                  product_name: curr.product_name,
                  date: curr.scraped_date,
                  fromAvailable: wasAvailable,
                  toAvailable: nowAvailable,
                  fromLabel: curr.availability_display || prev.availability_status || 'Unknown',
                  toLabel: curr.availability_display || curr.availability_status || 'Unknown',
                  price: Number(curr.sale_price || curr.regular_price) || 0,
                  url: curr.product_url,
                  changeType: nowAvailable ? 'restocked' : 'sold_out',
                })
              }
            }
          }
        }
      } catch (e) { console.warn('Walmart status fetch error:', e) }

      // ── Amazon: track price appearing/disappearing (proxy for stock) ──
      try {
        const { data: azRows } = await supabase
          .from('v_amazon_timeseries')
          .select('asin, product_name, price, product_url, scraped_date')
          .order('asin', { ascending: true })
          .order('scraped_date', { ascending: true })

        if (azRows && azRows.length > 0) {
          const byProduct = new Map()
          for (const row of azRows) {
            if (!byProduct.has(row.asin)) byProduct.set(row.asin, [])
            byProduct.get(row.asin).push(row)
          }

          for (const [asin, snaps] of byProduct) {
            for (let i = 1; i < snaps.length; i++) {
              const prev = snaps[i - 1]
              const curr = snaps[i]
              const hadPrice = Number(prev.price) > 0
              const hasPrice = Number(curr.price) > 0
              if (hadPrice !== hasPrice) {
                allChanges.push({
                  retailer: 'Amazon',
                  product_code: asin,
                  product_name: curr.product_name,
                  date: curr.scraped_date,
                  fromAvailable: hadPrice,
                  toAvailable: hasPrice,
                  fromLabel: hadPrice ? 'Available' : 'Unavailable',
                  toLabel: hasPrice ? 'Available' : 'Unavailable',
                  price: Number(curr.price) || 0,
                  url: curr.product_url,
                  changeType: hasPrice ? 'restocked' : 'sold_out',
                })
              }
            }
          }
        }
      } catch (e) { console.warn('Amazon status fetch error:', e) }

      // ── Target: track on_sale changes and price drops as signals ──
      try {
        const { data: tgRows } = await supabase
          .from('v_target_timeseries')
          .select('tcin, product_name, sale_price, regular_price, on_sale, product_url, scraped_date')
          .order('tcin', { ascending: true })
          .order('scraped_date', { ascending: true })

        if (tgRows && tgRows.length > 0) {
          const byProduct = new Map()
          for (const row of tgRows) {
            if (!byProduct.has(row.tcin)) byProduct.set(row.tcin, [])
            byProduct.get(row.tcin).push(row)
          }

          for (const [tcin, snaps] of byProduct) {
            for (let i = 1; i < snaps.length; i++) {
              const prev = snaps[i - 1]
              const curr = snaps[i]
              const hadPrice = Number(prev.sale_price || prev.regular_price) > 0
              const hasPrice = Number(curr.sale_price || curr.regular_price) > 0
              if (hadPrice !== hasPrice) {
                allChanges.push({
                  retailer: 'Target',
                  product_code: tcin,
                  product_name: curr.product_name,
                  date: curr.scraped_date,
                  fromAvailable: hadPrice,
                  toAvailable: hasPrice,
                  fromLabel: hadPrice ? 'Available' : 'Unavailable',
                  toLabel: hasPrice ? 'Available' : 'Unavailable',
                  price: Number(curr.sale_price || curr.regular_price) || 0,
                  url: curr.product_url,
                  changeType: hasPrice ? 'restocked' : 'sold_out',
                })
              }
            }
          }
        }
      } catch (e) { console.warn('Target status fetch error:', e) }

      if (cancelled) return

      // Enrich with slug from product_source_map → v_latest_products
      const productCodes = [...new Set(allChanges.map(c => c.product_code))]
      const slugMap = {}

      // Try to match retailer IDs back to LEGO product codes via product_source_map
      if (productCodes.length > 0) {
        for (let i = 0; i < productCodes.length; i += 30) {
          const chunk = productCodes.slice(i, i + 30)
          const { data: mappings } = await supabase
            .from('product_source_map')
            .select('source_product_id, product_code')
            .in('source_product_id', chunk)
            .eq('active', true)

          if (mappings) {
            const legoCodes = [...new Set(mappings.map(m => m.product_code))]
            if (legoCodes.length > 0) {
              const { data: products } = await supabase
                .from('v_latest_products')
                .select('product_code, slug, theme')
                .in('product_code', legoCodes)

              if (products) {
                // Build source_product_id → { slug, theme }
                for (const m of mappings) {
                  const p = products.find(pr => pr.product_code === m.product_code)
                  if (p) {
                    slugMap[m.source_product_id] = { slug: p.slug, theme: p.theme }
                  }
                }
              }
            }
          }
        }
      }

      // Attach slug + theme
      for (const c of allChanges) {
        const match = slugMap[c.product_code]
        if (match) {
          c.slug = match.slug
          c.theme = match.theme
        }
      }

      // Sort by date descending
      allChanges.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

      setChanges(allChanges)
      setLoading(false)
    }

    fetchRetailerChanges()
    return () => { cancelled = true }
  }, [])

  // Compute summary stats
  const summary = useMemo(() => {
    const recent = changes.filter(c => isWithinDays(c.date, 7))
    return {
      total: recent.length,
      restocked: recent.filter(c => c.changeType === 'restocked').length,
      soldOut: recent.filter(c => c.changeType === 'sold_out').length,
      retailers: [...new Set(recent.map(c => c.retailer))],
    }
  }, [changes])

  const retailers = useMemo(() => [...new Set(changes.map(c => c.retailer))].sort(), [changes])

  const filtered = useMemo(() => {
    let result = changes
    if (selectedRetailer !== 'all') {
      result = result.filter(c => c.retailer === selectedRetailer)
    }
    return result
  }, [changes, selectedRetailer])

  if (loading) return <LoadingSkeleton />

  if (changes.length === 0) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <Store size={36} className="text-gray-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">No Retailer Status Changes Yet</h3>
        <p className="text-[11px] text-gray-500 max-w-md mx-auto">
          Status changes will appear here once your pipeline has collected multiple days of data from retailers.
          Stock changes from Best Buy, Walmart, Amazon, and Target will be tracked automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-semibold text-base text-white">Retailer Status Changes</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Stock and availability changes across {summary.retailers.length} retailer{summary.retailers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Summary counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={<Store size={18} />}
          label="Total Changes"
          count={summary.total}
          accent="text-blue-400"
          bgAccent="bg-blue-400/10"
          borderAccent="border-blue-500/20"
        />
        <SummaryCard
          icon={<PackageCheck size={18} />}
          label="Restocked"
          count={summary.restocked}
          accent="text-emerald-400"
          bgAccent="bg-emerald-400/10"
          borderAccent="border-emerald-500/20"
        />
        <SummaryCard
          icon={<PackageX size={18} />}
          label="Went OOS"
          count={summary.soldOut}
          accent="text-red-400"
          bgAccent="bg-red-400/10"
          borderAccent="border-red-500/20"
        />
      </div>

      {/* Retailer filter */}
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
          const count = changes.filter(c => c.retailer === r).length
          return (
            <button
              key={r}
              onClick={() => setSelectedRetailer(r)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all
                ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
              style={isActive ? {
                background: `${color}15`,
                boxShadow: `inset 0 0 0 1px ${color}40`,
              } : {}}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              {r}
              <span className="text-gray-600 ml-0.5">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Restocked section */}
      <RetailerStatusSection
        icon={<PackageCheck size={16} className="text-emerald-400" />}
        title="Restocked"
        subtitle="Products that came back in stock"
        accent="border-emerald-500/30"
        items={filtered.filter(c => c.changeType === 'restocked')}
        emptyMsg="No restocks detected"
      />

      {/* Went OOS section */}
      <RetailerStatusSection
        icon={<PackageX size={16} className="text-red-400" />}
        title="Went Out of Stock"
        subtitle="Products that became unavailable"
        accent="border-red-500/30"
        items={filtered.filter(c => c.changeType === 'sold_out')}
        emptyMsg="No products went out of stock"
      />

      {/* Full table */}
      <RetailerAllChangesTable changes={filtered} />
    </div>
  )
}


// ═══════════════════════════════════════════════════════
// RETAILER STATUS SECTION (collapsible like LEGO tab)
// ═══════════════════════════════════════════════════════

function RetailerStatusSection({ icon, title, subtitle, accent, items, emptyMsg }) {
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
                {displayItems.map((c, i) => {
                  const color = getRetailerColor(c.retailer)
                  const inner = (
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group cursor-pointer">
                      {/* Retailer accent bar */}
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ background: color }} />

                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white font-semibold truncate group-hover:text-lego-yellow transition-colors">
                          {c.product_name}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                            {c.retailer}
                          </span>
                          {c.theme && (
                            <>
                              <span className="text-gray-700">·</span>
                              <span>{c.theme}</span>
                            </>
                          )}
                          <span className="text-gray-700">·</span>
                          <span>{fmtDate(c.date)}</span>
                          {c.price > 0 && (
                            <>
                              <span className="text-gray-700">·</span>
                              <span className="text-lego-yellow font-mono">${c.price.toFixed(2)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <RetailerStatusBadge available={c.fromAvailable} label={c.fromLabel} />
                        <ArrowRight size={10} className="text-gray-600" />
                        <RetailerStatusBadge available={c.toAvailable} label={c.toLabel} />
                      </div>
                    </div>
                  )

                  return c.slug ? (
                    <Link key={`${c.product_code}-${c.date}-${c.retailer}-${i}`} to={`/product/${c.slug}`} className="block">
                      {inner}
                    </Link>
                  ) : (
                    <div key={`${c.product_code}-${c.date}-${c.retailer}-${i}`}>
                      {inner}
                    </div>
                  )
                })}
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

// ═══════════════════════════════════════════════════════
// RETAILER ALL CHANGES TABLE
// ═══════════════════════════════════════════════════════

function RetailerAllChangesTable({ changes }) {
  const [search, setSearch] = useState('')
  const [showCount, setShowCount] = useState(30)

  const filtered = useMemo(() => {
    if (!search.trim()) return changes
    const q = search.toLowerCase()
    return changes.filter(c =>
      (c.product_name || '').toLowerCase().includes(q) ||
      (c.product_code || '').toLowerCase().includes(q)
    )
  }, [changes, search])

  const displayed = filtered.slice(0, showCount)
  const hasMore = filtered.length > showCount

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-semibold text-sm text-white">All Retailer Changes</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {filtered.length} change{filtered.length !== 1 ? 's' : ''} total
            {search && ` (filtered from ${changes.length})`}
          </p>
        </div>
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-lego-border">
              {['Date', 'Product', 'Retailer', 'From', '', 'To', 'Price'].map((h, i) => (
                <th key={i} className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-600 text-xs">
                  {search ? 'No results match your search' : 'No status changes recorded'}
                </td>
              </tr>
            ) : (
              displayed.map((c, i) => {
                const color = getRetailerColor(c.retailer)
                return (
                  <tr key={`${c.product_code}-${c.date}-${c.retailer}-${i}`} className="border-b border-lego-border/30 hover:bg-white/[0.02]">
                    <td className="py-2 px-2 text-gray-500 whitespace-nowrap">{fmtDate(c.date)}</td>
                    <td className="py-2 px-2">
                      {c.slug ? (
                        <Link to={`/product/${c.slug}`} className="text-white hover:text-lego-yellow font-medium transition-colors">
                          {c.product_name}
                        </Link>
                      ) : (
                        <span className="text-white">{c.product_name}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-gray-400">{c.retailer}</span>
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <RetailerStatusBadge available={c.fromAvailable} label={c.fromLabel} />
                    </td>
                    <td className="py-1 px-1"><ArrowRight size={10} className="text-gray-600" /></td>
                    <td className="py-2 px-2">
                      <RetailerStatusBadge available={c.toAvailable} label={c.toLabel} />
                    </td>
                    <td className="py-2 px-2 font-mono text-lego-yellow whitespace-nowrap">
                      {c.price > 0 ? `$${c.price.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                )
              })
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


// ═══════════════════════════════════════════════════════
// SHARED COMPONENTS (used by both tabs)
// ═══════════════════════════════════════════════════════

function SummaryCard({ icon, label, count, accent, bgAccent, borderAccent }) {
  return (
    <div className={`glass rounded-xl p-4 text-left border ${borderAccent} ${bgAccent}`}>
      <div className={`mb-2 ${accent}`}>{icon}</div>
      <div className={`font-display font-bold text-2xl ${accent}`}>{count}</div>
      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

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