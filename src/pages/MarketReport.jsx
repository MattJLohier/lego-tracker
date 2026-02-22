import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3, TrendingDown, TrendingUp, Sparkles, ShoppingBag, Tag,
  AlertTriangle, ArrowRight, Calendar, Crown, FileText, Zap, Package,
  AlertCircle, ChevronDown, ChevronUp, Flame, Eye, EyeOff, Star,
  ArrowDown, ArrowUp, Minus, Bot, Clock, ExternalLink
} from 'lucide-react'
import { supabase } from '../lib/supabase'


function Delta({ value, suffix = '', invert = false, showZero = false }) {
  if (value === null || value === undefined) return <span className="text-gray-600 text-[10px]">—</span>
  const num = Number(value)
  if (num === 0 && !showZero) return <span className="text-gray-500 text-[10px] font-mono">0{suffix}</span>
  const positive = invert ? num < 0 : num > 0
  const negative = invert ? num > 0 : num < 0
  return (
    <span className={`text-[10px] font-mono inline-flex items-center gap-0.5 ${positive ? 'text-lego-green' : negative ? 'text-lego-red' : 'text-gray-500'}`}>
      {positive ? <ArrowUp size={9} /> : negative ? <ArrowDown size={9} /> : <Minus size={9} />}
      {Math.abs(num).toFixed(1)}{suffix}
    </span>
  )
}

function SectionHeader({ icon, title, subtitle, count }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-gray-500 px-2 py-0.5 rounded-full glass">{count} items</span>
      )}
    </div>
  )
}

export default function MarketReport() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data, error: sbError } = await supabase
          .from('weekly_market_report')
          .select('*')
          .order('week_start', { ascending: false })
          .limit(1)
          .single()

        if (sbError) {
          setError(sbError.message)
        } else if (!data) {
          setError('No weekly report generated yet')
        } else {
          setReport(data)
        }
      } catch (err) {
        setError('Failed to load weekly report')
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass rounded-xl p-6 animate-pulse">
              <div className="h-5 bg-lego-surface2 rounded w-56 mb-3" />
              <div className="h-3 bg-lego-surface2 rounded w-40" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  if (error || !report) {
    return (
      <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
        <div className="max-w-5xl mx-auto text-center py-20">
          <BarChart3 size={48} className="text-gray-600 mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl mb-2">Weekly Market Report</h1>
          <p className="text-gray-500 mb-4">{error || 'Report data is currently unavailable.'}</p>
          <p className="text-[11px] text-gray-600">
            Reports are generated automatically each week. Check back soon.
          </p>
        </div>
      </main>
    )
  }

  const h = report.highlights || {}
  const weekLabel = formatWeekLabel(report.week_start, report.week_end)

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* ── Header ── */}
        <ReportHeader report={report} weekLabel={weekLabel} />

        {/* ── AI Thesis ── */}
        {report.thesis && <ThesisBanner thesis={report.thesis} />}

        {/* ── This Week in LEGO (Highlights) ── */}
        <HighlightsGrid highlights={h} newSetsCount={report.new_sets?.length} newDealsCount={report.new_deals?.length} />

        {/* ── 3 Takes (AI Narrative) ── */}
        {report.three_takes && <ThreeTakes takes={report.three_takes} />}

        {/* ── New This Week ── */}
        <NewSetsSection sets={report.new_sets} />

        {/* ── New Deals Posted ── */}
        <NewDealsSection deals={report.new_deals} />

        {/* ── Gone / Going Scarce ── */}
        <GoneScarceSection items={report.gone_scarce} premiumOosPct={h.premium_oos_pct} premiumOosDelta={h.premium_oos_delta} />

        {/* ── Theme Leaders ── */}
        <ThemeLeadersSection themes={report.theme_leaders} />

        {/* ── Price Tier Heatmap ── */}
        <TierHeatmapSection tiers={report.tier_heatmap} />

        {/* ── CTA ── */}
        <ReportCTA />

        {/* ── Footer ── */}
        <ReportFooter report={report} />
      </div>
    </main>
  )
}


// ═══════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════════════

function ReportHeader({ report, weekLabel }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono mb-3">
        <Calendar size={12} />
        <span>StudMetrics Weekly Market Report</span>
        <span className="text-gray-600">·</span>
        <span>{weekLabel}</span>
      </div>
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-2">
        LEGO Market <span className="text-gradient">Weekly Report</span>
      </h1>
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500 font-mono">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full glass">
          <Package size={10} className="text-lego-yellow" />
          {report.total_products?.toLocaleString()} sets tracked
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full glass">
          Source: LEGO.com
        </span>
        {report.data_date && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full glass">
            <Clock size={10} />
            Updated {new Date(report.data_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  )
}

function ThesisBanner({ thesis }) {
  return (
    <div className="glass rounded-xl p-4 mb-6 border-l-2 border-lego-yellow">
      <div className="flex items-start gap-2.5">
        <Bot size={16} className="text-lego-yellow mt-0.5 shrink-0" />
        <div>
          <div className="text-[9px] font-mono text-lego-yellow/70 uppercase tracking-widest mb-1">AI Market Summary</div>
          <p className="text-sm text-gray-200 leading-relaxed font-medium">{thesis}</p>
        </div>
      </div>
    </div>
  )
}

function HighlightsGrid({ highlights: h, newSetsCount, newDealsCount }) {
  if (!h) return null

  const cards = [
    {
      label: 'Deal Pulse',
      items: [
        { name: 'Catalog on sale', value: `${h.on_sale_pct ?? '—'}%`, delta: h.on_sale_pct_delta, suffix: 'pp' },
        { name: 'Median discount', value: `${h.median_discount ?? '—'}%`, delta: h.median_discount_delta, suffix: 'pp' },
      ],
      color: 'text-lego-red',
      icon: <Tag size={14} />,
    },
    {
      label: 'Stock Pulse',
      items: [
        { name: 'In-stock rate', value: `${h.in_stock_pct ?? '—'}%`, delta: h.in_stock_pct_delta, suffix: 'pp' },
        { name: '$200+ OOS rate', value: `${h.premium_oos_pct ?? '—'}%`, delta: h.premium_oos_delta, suffix: 'pp', invert: true },
      ],
      color: 'text-lego-green',
      icon: <Package size={14} />,
    },
    {
      label: 'Newness',
      items: [
        { name: 'New sets', value: newSetsCount ?? 0 },
        { name: 'New deals', value: newDealsCount ?? 0 },
      ],
      color: 'text-purple-400',
      icon: <Sparkles size={14} />,
    },
    {
      label: 'Price / Premium',
      items: [
        { name: 'Median price', value: `$${Number(h.median_price || 0).toFixed(0)}`, delta: h.median_price_delta, prefix: '$' },
        { name: '$400+ share', value: `${h.premium_share_pct ?? '—'}%`, delta: h.premium_share_delta, suffix: 'pp' },
      ],
      color: 'text-lego-yellow',
      icon: <BarChart3 size={14} />,
    },
  ]

  return (
    <div className="mb-8">
      <SectionHeader
        icon={<Zap size={18} className="text-lego-yellow" />}
        title="This Week in LEGO"
        subtitle="Key market signals at a glance"
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(card => (
          <div key={card.label} className="glass rounded-xl p-4 glass-hover transition-all">
            <div className={`flex items-center gap-1.5 mb-3 ${card.color}`}>
              {card.icon}
              <span className="text-[10px] font-mono uppercase tracking-wider">{card.label}</span>
            </div>
            <div className="space-y-2.5">
              {card.items.map(item => (
                <div key={item.name}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display font-bold text-lg text-white">{item.value}</span>
                    {item.delta !== undefined && <Delta value={item.delta} suffix={item.suffix || ''} invert={item.invert} />}
                  </div>
                  <div className="text-[10px] text-gray-500">{item.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ThreeTakes({ takes }) {
  const sections = [
    { key: 'deals', label: 'Deals', icon: <Tag size={14} />, color: 'border-lego-red', accent: 'text-lego-red' },
    { key: 'stock', label: 'Stock', icon: <Package size={14} />, color: 'border-lego-green', accent: 'text-lego-green' },
    { key: 'releases', label: 'Releases', icon: <Sparkles size={14} />, color: 'border-purple-400', accent: 'text-purple-400' },
  ]

  return (
    <div className="mb-8">
      <SectionHeader
        icon={<Bot size={18} className="text-lego-blue" />}
        title="3 Takes"
        subtitle="AI-generated weekly narrative"
      />
      <div className="grid sm:grid-cols-3 gap-3">
        {sections.map(s => (
          <div key={s.key} className={`glass rounded-xl p-4 border-t-2 ${s.color}`}>
            <div className={`flex items-center gap-1.5 mb-2 ${s.accent}`}>
              {s.icon}
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">{s.label}</span>
            </div>
            <p className="text-[13px] text-gray-300 leading-relaxed">{takes[s.key]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function NewSetsSection({ sets }) {
  const [expanded, setExpanded] = useState(false)
  if (!sets || sets.length === 0) return null

  const visible = expanded ? sets : sets.slice(0, 10)

  return (
    <div className="mb-8">
      <SectionHeader
        icon={<Sparkles size={18} className="text-purple-400" />}
        title="New This Week"
        subtitle="Sets first seen in the catalog this week"
        count={sets.length}
      />
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-lego-border bg-white/[0.02]">
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-left">Set</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-left">Theme</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">MSRP</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">Pieces</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s, i) => (
                <tr key={s.product_code || i} className="border-b border-lego-border/30 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3">
                    <Link to={`/product/${s.slug || s.product_code}`} className="text-white hover:text-lego-yellow transition-colors font-medium">
                      {s.product_name}
                    </Link>
                    <div className="text-[10px] text-gray-600 font-mono">{s.product_code}</div>
                  </td>
                  <td className="py-2 px-3 text-gray-400">{s.theme}</td>
                  <td className="py-2 px-3 text-right font-mono text-lego-yellow">${Number(s.price_usd || s.list_price_usd || 0).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">{s.piece_count || '—'}</td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {s.in_stock ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-lego-green/15 text-lego-green">In Stock</span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-400/15 text-orange-400">OOS</span>
                      )}
                      {s.on_sale && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-lego-red/15 text-lego-red">Sale</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sets.length > 10 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-2.5 text-[11px] text-gray-400 hover:text-white font-mono flex items-center justify-center gap-1 border-t border-lego-border/30 hover:bg-white/[0.02] transition-colors"
          >
            {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show all {sets.length} sets</>}
          </button>
        )}
      </div>
    </div>
  )
}

function NewDealsSection({ deals }) {
  const [expanded, setExpanded] = useState(false)
  if (!deals || deals.length === 0) return null

  const visible = expanded ? deals : deals.slice(0, 10)

  return (
    <div className="mb-8">
      <SectionHeader
        icon={<Flame size={18} className="text-lego-red" />}
        title="New Deals Posted"
        subtitle="Sets that went on sale this week"
        count={deals.length}
      />
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-lego-border bg-white/[0.02]">
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-left">Set</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-left">Theme</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">MSRP</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">Sale Price</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">Discount</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-center">Stock</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d, i) => (
                <tr key={d.product_code || i} className="border-b border-lego-border/30 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3">
                    <Link to={`/product/${d.slug || d.product_code}`} className="text-white hover:text-lego-yellow transition-colors font-medium">
                      {d.product_name}
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-gray-400">{d.theme}</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-500 line-through">${Number(d.list_price_usd || 0).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono text-lego-red font-semibold">${Number(d.price_usd || 0).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right">
                    <span className="font-mono text-lego-red font-semibold bg-lego-red/10 px-1.5 py-0.5 rounded">
                      {d.sale_percentage ? `-${Number(d.sale_percentage).toFixed(0)}%` : d.discount_usd ? `-$${Number(d.discount_usd).toFixed(0)}` : '—'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {d.in_stock ? (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-lego-green/15 text-lego-green">In Stock</span>
                    ) : (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-400/15 text-orange-400">OOS</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {deals.length > 10 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-2.5 text-[11px] text-gray-400 hover:text-white font-mono flex items-center justify-center gap-1 border-t border-lego-border/30 hover:bg-white/[0.02] transition-colors"
          >
            {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show all {deals.length} deals</>}
          </button>
        )}
      </div>
    </div>
  )
}

function GoneScarceSection({ items, premiumOosPct, premiumOosDelta }) {
  // Filter to $100+ sets, sorted by MSRP descending (already sorted from backend, but ensure)
  const premiumItems = (items || [])
    .filter(item => Number(item.price_usd || 0) >= 100)
    .sort((a, b) => Number(b.price_usd || 0) - Number(a.price_usd || 0))
    .slice(0, 10)

  const hasItems = premiumItems.length > 0
  const totalOosCount = (items || []).length

  return (
    <div className="mb-8">
      <SectionHeader
        icon={<AlertTriangle size={18} className="text-orange-400" />}
        title="Went Out of Stock This Week"
        subtitle={hasItems ? `Premium sets ($100+) that disappeared from shelves` : 'Tracking $100+ sets that go out of stock'}
        count={hasItems ? premiumItems.length : undefined}
      />

      {/* Premium OOS stat card — always show if data exists */}
      <div className="glass rounded-lg px-4 py-3 mb-3 flex flex-wrap items-center gap-4">
        {premiumOosPct !== null && premiumOosPct !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">$200+ OOS rate:</span>
            <span className="font-display font-bold text-orange-400">{Number(premiumOosPct).toFixed(1)}%</span>
            <Delta value={premiumOosDelta} suffix="pp" invert={true} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">Total went OOS:</span>
          <span className="font-display font-bold text-white">{totalOosCount}</span>
        </div>
        {hasItems && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">$100+ went OOS:</span>
            <span className="font-display font-bold text-orange-400">{premiumItems.length}</span>
          </div>
        )}
      </div>

      {hasItems ? (
        <div className="glass rounded-xl overflow-hidden glow-orange relative">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.03] to-transparent pointer-events-none" />
          <div className="overflow-x-auto relative">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-lego-border bg-white/[0.02]">
                  <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-left">#</th>
                  <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-left">Set</th>
                  <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-left">Theme</th>
                  <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">MSRP</th>
                  <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">Pieces</th>
                  <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">Rating</th>
                  <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-center">Tier</th>
                </tr>
              </thead>
              <tbody>
                {premiumItems.map((item, i) => {
                  const price = Number(item.price_usd || 0)
                  const tier = price >= 400 ? '$400+' : price >= 200 ? '$200+' : '$100+'
                  const tierColor = price >= 400 ? 'text-red-400 bg-red-400/10' : price >= 200 ? 'text-orange-400 bg-orange-400/10' : 'text-yellow-400 bg-yellow-400/10'
                  return (
                    <tr key={item.product_code || i} className="border-b border-lego-border/30 hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-gray-600">{i + 1}</td>
                      <td className="py-2.5 px-3">
                        <Link to={`/product/${item.slug || item.product_code}`} className="text-white hover:text-orange-400 transition-colors font-medium">
                          {item.product_name}
                        </Link>
                        <div className="text-[10px] text-gray-600 font-mono">{item.product_code}</div>
                      </td>
                      <td className="py-2.5 px-3 text-gray-400">{item.theme}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-lego-yellow font-bold">${price.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-400">{item.piece_count || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-400">
                        {item.rating ? (
                          <span className="inline-flex items-center gap-0.5">
                            <Star size={9} className="text-lego-yellow fill-lego-yellow" />
                            {Number(item.rating).toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded ${tierColor}`}>{tier}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty state — compelling, not boring */
        <div className="glass rounded-xl p-6 text-center border border-dashed border-orange-400/20">
          <AlertTriangle size={28} className="text-orange-400/40 mx-auto mb-3" />
          <p className="font-display font-semibold text-sm text-gray-300 mb-1">
            No premium sets went out of stock this week
          </p>
          <p className="text-[11px] text-gray-500 max-w-sm mx-auto leading-relaxed">
            When $100+ sets disappear from shelves, they'll show up here — ranked by MSRP.
            This section lights up during retirement waves and holiday sellouts.
          </p>
          <div className="mt-3 flex justify-center">
            <Link
              to="/alerts"
              className="inline-flex items-center gap-1.5 text-[11px] text-orange-400 hover:text-orange-300 font-medium transition-colors"
            >
              <AlertCircle size={12} /> Set a restock alert to get notified <ArrowRight size={10} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function ThemeLeadersSection({ themes }) {
  if (!themes || themes.length === 0) return null

  return (
    <div className="mb-8">
      <SectionHeader
        icon={<Star size={18} className="text-lego-yellow" />}
        title="Theme Leaders"
        subtitle="Ranked by weekly activity score"
        count={themes.length}
      />
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-lego-border bg-white/[0.02]">
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-left">#</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-left">Theme</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">Sets</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">New Sets</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">New Deals</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">OOS Δ</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">Sale %</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">Med. Disc.</th>
                <th className="py-2.5 px-3 text-[10px] font-mono text-gray-500 uppercase text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {themes.map((t, i) => (
                <tr key={t.theme || i} className="border-b border-lego-border/30 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 font-mono text-gray-600">{i + 1}</td>
                  <td className="py-2 px-3">
                    <Link to={`/explore?theme=${encodeURIComponent(t.theme)}`} className="text-white hover:text-lego-yellow transition-colors font-medium">
                      {t.theme}
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">{t.product_count}</td>
                  <td className="py-2 px-3 text-right font-mono">
                    <span className={t.new_set_count > 0 ? 'text-purple-400' : 'text-gray-600'}>{t.new_set_count}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono">
                    <span className={t.new_deal_count > 0 ? 'text-lego-red' : 'text-gray-600'}>{t.new_deal_count}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono">
                    {t.net_oos_change > 0 ? (
                      <span className="text-orange-400">+{t.net_oos_change}</span>
                    ) : t.net_oos_change < 0 ? (
                      <span className="text-lego-green">{t.net_oos_change}</span>
                    ) : (
                      <span className="text-gray-600">0</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">{Number(t.sale_coverage_pct || 0).toFixed(0)}%</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">{t.median_discount ? `${Number(t.median_discount).toFixed(0)}%` : '—'}</td>
                  <td className="py-2 px-3 text-right">
                    <span className="font-mono font-semibold text-lego-yellow bg-lego-yellow/10 px-1.5 py-0.5 rounded">
                      {t.activity_score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TierHeatmapSection({ tiers }) {
  if (!tiers || tiers.length === 0) return null

  return (
    <div className="mb-8">
      <SectionHeader
        icon={<BarChart3 size={18} className="text-lego-blue" />}
        title="Price Tier Heatmap"
        subtitle="Deals, discounts, and stock levels by price range"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiers.map((t, i) => (
          <div key={t.tier || i} className="glass rounded-xl p-4 glass-hover transition-all">
            <div className="font-display font-bold text-sm mb-3 text-white">{t.tier}</div>
            <div className="space-y-2.5">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-lego-red">{Number(t.on_sale_pct || 0).toFixed(0)}%</span>
                  <Delta value={t.on_sale_pct_delta} suffix="pp" />
                </div>
                <div className="text-[9px] text-gray-500 uppercase">On sale</div>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-lego-yellow">{t.median_discount ? `${Number(t.median_discount).toFixed(0)}%` : '—'}</span>
                  <Delta value={t.median_discount_delta} suffix="pp" />
                </div>
                <div className="text-[9px] text-gray-500 uppercase">Med. discount</div>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-lego-green">{Number(t.in_stock_pct || 0).toFixed(0)}%</span>
                  <Delta value={t.in_stock_pct_delta} suffix="pp" />
                </div>
                <div className="text-[9px] text-gray-500 uppercase">In stock</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportCTA() {
  return (
    <div className="mb-8">
      <div className="glass rounded-xl p-6 text-center glow-red relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-lego-red/10 to-transparent" />
        <div className="relative">
          <Crown size={24} className="text-lego-yellow mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg mb-2">Want daily intel?</h3>
          <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
            Pro members get daily category reports, 10 custom alerts, per-set price tracking, and retirement risk monitoring.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/alerts" className="inline-flex items-center gap-2 px-5 py-2.5 bg-lego-red hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Set an Alert <ArrowRight size={14} />
            </Link>
            <Link to="/explore" className="inline-flex items-center gap-2 px-5 py-2.5 glass glass-hover text-white text-sm font-semibold rounded-xl transition-all">
              Browse All Sets
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportFooter({ report }) {
  return (
    <div className="text-center space-y-2">
      <p className="text-[10px] text-gray-600">
        This weekly market report is generated automatically with AI-powered analysis.
        Data sourced from LEGO.com.
      </p>
      {report.generated_at && (
        <p className="text-[10px] text-gray-700 font-mono">
          Generated {new Date(report.generated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          {report.generation_duration_ms && ` · ${(report.generation_duration_ms / 1000).toFixed(1)}s`}
        </p>
      )}
      <p className="text-[10px] text-gray-700">
        LEGO® is a trademark of the LEGO Group. StudMetrics is not affiliated with the LEGO Group.
      </p>
    </div>
  )
}


// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function formatWeekLabel(start, end) {
  if (!start) return ''
  const s = new Date(start + 'T00:00:00')
  const e = end ? new Date(end + 'T00:00:00') : null
  const opts = { month: 'short', day: 'numeric' }
  const label = `Week of ${s.toLocaleDateString('en-US', opts)}`
  if (e) {
    return `${label} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }
  return `${label}, ${s.getFullYear()}`
}