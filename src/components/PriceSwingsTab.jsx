// src/components/PriceSwingsTab.jsx
//
// "Price Swings" tab on the Analytics page.
// Two sub-tabs:
//   • LEGO.com  — price changes computed from v_snapshot_timeseries (useAlerts)
//   • Retailers — 48h price movers from mart_price_movers_48h

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingDown, TrendingUp, ArrowDown, ArrowUp, Store,
  BarChart3, Clock, Search, X, ChevronDown
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { usePriceMovers } from '../hooks/useRetailerAnalytics'
import { RETAILER_CONFIG } from '../hooks/useData'
import { supabase } from '../lib/supabase'

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


// ═══════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════

export default function PriceSwingsTab({ swings = [] }) {
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

      {subTab === 'lego' && <LegoPriceSwings swings={swings} />}
      {subTab === 'retailers' && <RetailerPriceSwings />}
    </div>
  )
}


// ═══════════════════════════════════════════════════════
// LEGO.COM PRICE SWINGS
// ═══════════════════════════════════════════════════════

function LegoPriceSwings({ swings }) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (filter === 'drops') return swings.filter(s => s.direction === 'down')
    if (filter === 'increases') return swings.filter(s => s.direction === 'up')
    return swings.filter(s => s.direction !== 'flat')
  }, [swings, filter])

  const chartData = filtered.slice(0, 20).map(s => ({
    name: (s.product_name || '').slice(0, 25),
    change: Number(s.changePct.toFixed(1)),
  }))

  if (swings.length === 0) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <Clock size={36} className="text-gray-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">No Price Changes Yet</h3>
        <p className="text-[11px] text-gray-500 max-w-md mx-auto mb-4">
          LEGO.com price swings are detected by comparing prices across multiple scrape days.
          Once your pipeline has collected 2+ days of data, changes will appear here automatically.
        </p>
        <p className="text-[10px] text-gray-600">
          In the meantime, check the <span className="text-lego-blue font-semibold">Retailers</span> tab — 48-hour price movers from Best Buy, Target, Walmart, and Amazon may already be available.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-semibold text-base text-white">LEGO.com Price Swings</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {filtered.length} price change{filtered.length !== 1 ? 's' : ''} detected across scrape history
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All Changes' },
          { key: 'drops', label: 'Price Drops' },
          { key: 'increases', label: 'Price Increases' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${filter === f.key ? 'bg-lego-red text-white' : 'glass text-gray-400 hover:text-white'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-sm mb-0.5">Top Price Swings by %</h3>
          <p className="text-[10px] text-gray-500 mb-4">Largest percentage changes</p>
          <div style={{ height: Math.max(300, chartData.length * 28) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 5, right: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
                <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fill: '#888', fontSize: 9 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`]} />
                <Bar dataKey="change" fill="#FFD500" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detail table */}
      <div className="glass rounded-xl p-5">
        <h3 className="font-display font-semibold text-sm mb-0.5">Details</h3>
        <p className="text-[10px] text-gray-500 mb-4">{filtered.length} products</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-lego-border">
                {['Product', 'Theme', 'From', 'To', 'Change'].map(h => (
                  <th key={h} className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-right first:text-left [&:nth-child(2)]:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-600 text-xs">
                    No price changes for this filter
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 30).map(s => (
                  <tr key={s.product_code} className="border-b border-lego-border/30 hover:bg-white/[0.02]">
                    <td className="py-2 px-2 text-left">
                      <Link to={`/product/${s.slug}`} className="text-white hover:text-lego-yellow font-medium">{s.product_name}</Link>
                    </td>
                    <td className="py-2 px-2 text-left text-gray-500">{s.theme}</td>
                    <td className="py-2 px-2 text-right font-mono text-gray-400">${s.firstPrice.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono text-lego-yellow">${s.lastPrice.toFixed(2)}</td>
                    <td className={`py-2 px-2 text-right font-mono font-bold ${s.direction === 'down' ? 'text-green-400' : 'text-red-400'}`}>
                      {s.direction === 'down' ? '-' : '+'}${s.absChange.toFixed(2)} ({s.absPct.toFixed(1)}%)
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════
// RETAILER PRICE SWINGS (48h movers)
// ═══════════════════════════════════════════════════════

function RetailerPriceSwings() {
  const { data: movers, loading } = usePriceMovers()

  // Enrich with theme + slug
  const [enriched, setEnriched] = useState([])
  const [enrichLoading, setEnrichLoading] = useState(false)

  useEffect(() => {
    if (!movers?.length) { setEnriched([]); return }
    let cancelled = false

    async function enrich() {
      setEnrichLoading(true)
      const codes = [...new Set(movers.map(m => m.product_code).filter(Boolean))]
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

      setEnriched(movers.map(m => ({
        ...m,
        theme: m.theme || themeMap[m.product_code]?.theme || null,
        slug: m.slug || themeMap[m.product_code]?.slug || null,
      })))
      setEnrichLoading(false)
    }

    enrich()
    return () => { cancelled = true }
  }, [movers])

  const [filter, setFilter] = useState('all')
  const [selectedRetailer, setSelectedRetailer] = useState('all')
  const [showCount, setShowCount] = useState(20)

  const allData = useMemo(() => {
    let result = [...enriched]
    if (filter === 'drops') result = result.filter(d => Number(d.price_change) < 0)
    else if (filter === 'increases') result = result.filter(d => Number(d.price_change) > 0)
    if (selectedRetailer !== 'all') result = result.filter(d => d.retailer === selectedRetailer)
    result.sort((a, b) => Math.abs(Number(b.change_pct)) - Math.abs(Number(a.change_pct)))
    return result
  }, [enriched, filter, selectedRetailer])

  const retailers = useMemo(() => [...new Set(enriched.map(d => d.retailer).filter(Boolean))].sort(), [enriched])

  const chartData = allData.slice(0, 15).map(d => ({
    name: (d.product_name || `Set ${d.product_code}`).slice(0, 28),
    change: Number(d.change_pct),
    retailer: d.retailer,
  }))

  const summary = useMemo(() => {
    const drops = enriched.filter(d => Number(d.price_change) < 0)
    const increases = enriched.filter(d => Number(d.price_change) > 0)
    return {
      total: enriched.length,
      drops: drops.length,
      increases: increases.length,
      totalSaved: drops.reduce((a, d) => a + Math.abs(Number(d.price_change)), 0),
    }
  }, [enriched])

  if (loading || enrichLoading) return <LoadingSkeleton />

  if (enriched.length === 0) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <Store size={36} className="text-gray-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">No Retailer Price Changes Yet</h3>
        <p className="text-[11px] text-gray-500 max-w-md mx-auto">
          48-hour price movers will appear here once your pipeline has collected multiple days of retailer data.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-semibold text-base text-white">Retailer Price Swings</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {summary.total} price change{summary.total !== 1 ? 's' : ''} in the last 48 hours across {retailers.length} retailer{retailers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Changes" value={summary.total} accent="text-blue-400" bgAccent="bg-blue-400/10" borderAccent="border-blue-500/20" />
        <SummaryCard label="Price Drops" value={summary.drops} accent="text-green-400" bgAccent="bg-green-400/10" borderAccent="border-green-500/20" />
        <SummaryCard label="Price Increases" value={summary.increases} accent="text-red-400" bgAccent="bg-red-400/10" borderAccent="border-red-500/20" />
        <SummaryCard label="Total Savings" value={`$${summary.totalSaved.toFixed(0)}`} accent="text-lego-yellow" bgAccent="bg-lego-yellow/10" borderAccent="border-lego-yellow/20" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: 'all', label: 'All Changes', icon: BarChart3 },
            { key: 'drops', label: 'Price Drops', icon: TrendingDown },
            { key: 'increases', label: 'Increases', icon: TrendingUp },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setShowCount(20) }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all
                ${filter === key ? 'bg-lego-red text-white' : 'glass text-gray-400 hover:text-white'}`}
            >
              <Icon size={11} />{label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-lego-border/50" />

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => { setSelectedRetailer('all'); setShowCount(20) }}
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
                onClick={() => { setSelectedRetailer(r); setShowCount(20) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all
                  ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
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
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-sm mb-0.5">Top Price Swings by %</h3>
          <p className="text-[10px] text-gray-500 mb-4">{allData.length} products</p>
          <div style={{ height: Math.max(280, chartData.length * 26) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 5, right: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" />
                <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fill: '#888', fontSize: 9 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload
                    return (
                      <div className="glass rounded-lg p-3 border border-lego-border text-xs">
                        <div className="text-white font-semibold mb-1">{d.name}</div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: getRetailerColor(d.retailer) }} />
                          <span className="text-gray-400">{d.retailer}</span>
                        </div>
                        <div className={`font-bold mt-1 ${d.change < 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {d.change > 0 ? '+' : ''}{d.change}%
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="change"
                  radius={[0, 4, 4, 0]}
                  shape={(props) => {
                    const { x, y, width, height, payload } = props
                    const isNeg = payload.change < 0
                    return (
                      <rect
                        x={isNeg ? x + width : x}
                        y={y}
                        width={Math.abs(width)}
                        height={height}
                        rx={3}
                        fill={isNeg ? '#34d399' : '#f87171'}
                        fillOpacity={0.85}
                        stroke={getRetailerColor(payload.retailer)}
                        strokeWidth={1.5}
                      />
                    )
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detail list */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-5 pb-0">
          <h3 className="font-display font-semibold text-sm mb-0.5">All Changes</h3>
          <p className="text-[10px] text-gray-500 mb-4">{allData.length} product{allData.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="px-5 pb-5">
          {allData.length === 0 ? (
            <div className="py-8 text-center text-gray-600 text-xs">
              No price changes found for this filter.
            </div>
          ) : (
            <div className="space-y-1.5">
              {allData.slice(0, showCount).map((d, i) => {
                const change = Number(d.price_change)
                const changePct = Number(d.change_pct)
                const oldPrice = Number(d.old_price)
                const newPrice = Number(d.new_price)
                const color = getRetailerColor(d.retailer)
                const isDrop = change < 0

                const inner = (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer group">
                    <div className="w-1 h-10 rounded-full shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-white group-hover:text-lego-yellow transition-colors line-clamp-1">
                        {d.product_name || `Set ${d.product_code}`}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                          {d.retailer}
                        </span>
                        {d.theme && (
                          <>
                            <span className="text-gray-700">·</span>
                            <span className="truncate">{d.theme}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[10px] text-gray-600 line-through font-mono">${oldPrice.toFixed(2)}</span>
                        <span className="text-xs font-bold text-white font-mono">${newPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        {isDrop ? <ArrowDown size={10} className="text-green-400" /> : <ArrowUp size={10} className="text-red-400" />}
                        <span className={`text-[10px] font-bold font-mono ${isDrop ? 'text-green-400' : 'text-red-400'}`}>
                          {isDrop ? '' : '+'}${change.toFixed(2)} ({isDrop ? '' : '+'}{changePct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )

                return d.slug ? (
                  <Link key={`${d.product_code}-${d.retailer}-${i}`} to={`/product/${d.slug}`} className="block">{inner}</Link>
                ) : (
                  <div key={`${d.product_code}-${d.retailer}-${i}`}>{inner}</div>
                )
              })}
            </div>
          )}

          {allData.length > showCount && (
            <button
              onClick={() => setShowCount(prev => prev + 20)}
              className="w-full mt-3 py-2.5 text-[10px] font-semibold text-gray-500 hover:text-gray-300 hover:bg-white/[0.02] rounded-lg transition-colors"
            >
              Show more ({allData.length - showCount} remaining)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════

function SummaryCard({ label, value, accent, bgAccent, borderAccent }) {
  return (
    <div className={`glass rounded-xl p-4 text-left border ${borderAccent} ${bgAccent}`}>
      <div className={`font-display font-bold text-2xl ${accent}`}>{value}</div>
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