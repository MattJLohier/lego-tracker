import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3, TrendingDown, TrendingUp, Sparkles, ShoppingBag, Tag,
  AlertTriangle, ArrowRight, Calendar, Crown, FileText
} from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * /market-report — Public weekly LEGO market summary for SEO.
 *
 * Shows a high-level weekly snapshot using aggregate stats from Supabase.
 * This is NOT the full daily report (that's a paid Pro feature).
 * 
 * Omits the "Others" theme category.
 * Uses only aggregate counts and percentages — no per-product details
 * that would replicate the paid daily report.
 */

export default function MarketReport() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generatedDate, setGeneratedDate] = useState(null)

  useEffect(() => {
    async function loadWeeklySummary() {
      setLoading(true)
      try {
        // Fetch latest products snapshot for aggregate stats
        const { data: products } = await supabase
          .from('v_latest_products')
          .select('product_code, product_name, theme, price_usd, enriched_price_usd, list_price_usd, enriched_list_price_usd, in_stock, on_sale, is_new, availability_status, rating, enriched_rating, piece_count, enriched_piece_count, discount_usd, sale_percentage, scraped_date')

        if (!products || products.length === 0) {
          setLoading(false)
          return
        }

        // Filter out "Others" / "Other" theme
        const filtered = products.filter(p =>
          p.theme && !p.theme.toLowerCase().startsWith('other')
        )

        // Most recent scraped_date as report date
        const dates = [...new Set(filtered.map(p => p.scraped_date).filter(Boolean))].sort()
        const latestDate = dates[dates.length - 1]
        setGeneratedDate(latestDate)

        // Aggregate stats
        const prices = filtered.map(p => Number(p.enriched_price_usd || p.price_usd)).filter(p => p > 0)
        const totalProducts = filtered.length
        const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
        const onSaleCount = filtered.filter(p => p.on_sale).length
        const newCount = filtered.filter(p => p.is_new).length
        const inStockCount = filtered.filter(p => p.in_stock).length
        const outOfStockCount = totalProducts - inStockCount

        // Theme breakdown (top 12 by product count, excluding Others)
        const themeMap = new Map()
        for (const p of filtered) {
          if (!p.theme) continue
          if (!themeMap.has(p.theme)) themeMap.set(p.theme, { count: 0, totalPrice: 0, onSale: 0, newItems: 0 })
          const t = themeMap.get(p.theme)
          t.count++
          t.totalPrice += Number(p.enriched_price_usd || p.price_usd) || 0
          if (p.on_sale) t.onSale++
          if (p.is_new) t.newItems++
        }
        const themes = Array.from(themeMap.entries())
          .map(([name, data]) => ({
            name,
            count: data.count,
            avgPrice: data.count > 0 ? data.totalPrice / data.count : 0,
            onSale: data.onSale,
            newItems: data.newItems,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 12)

        // Price distribution buckets
        const buckets = [
          { label: 'Under $25', min: 0, max: 25 },
          { label: '$25–$50', min: 25, max: 50 },
          { label: '$50–$100', min: 50, max: 100 },
          { label: '$100–$200', min: 100, max: 200 },
          { label: '$200–$400', min: 200, max: 400 },
          { label: '$400+', min: 400, max: Infinity },
        ]
        const priceDistribution = buckets.map(b => ({
          ...b,
          count: prices.filter(p => p >= b.min && p < b.max).length,
        }))

        setReport({
          totalProducts,
          avgPrice,
          onSaleCount,
          newCount,
          inStockCount,
          outOfStockCount,
          onSalePct: totalProducts > 0 ? (onSaleCount / totalProducts * 100) : 0,
          themes,
          priceDistribution,
          catalogValue: prices.reduce((a, b) => a + b, 0),
        })
      } catch (err) {
        console.error('Failed to load weekly summary:', err)
      }
      setLoading(false)
    }
    loadWeeklySummary()
  }, [])

  if (loading) {
    return (
      <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass rounded-xl p-6 animate-pulse">
                <div className="h-5 bg-lego-surface2 rounded w-56 mb-3" />
                <div className="h-3 bg-lego-surface2 rounded w-40" />
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (!report) {
    return (
      <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
        <div className="max-w-4xl mx-auto text-center py-20">
          <BarChart3 size={48} className="text-gray-600 mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl mb-2">Weekly Market Report</h1>
          <p className="text-gray-500">Report data is currently unavailable. Check back soon.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono mb-3">
            <Calendar size={12} />
            <span>Weekly LEGO Market Report</span>
            {generatedDate && (
              <span>· {new Date(generatedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            )}
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-3">
            LEGO Market <span className="text-gradient">Weekly Summary</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
            A high-level overview of the LEGO market — pricing trends, availability, and theme activity.
            For detailed daily reports with per-product data, <Link to="/reports" className="text-lego-yellow hover:underline font-medium">upgrade to Pro</Link>.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <KPICard icon={<ShoppingBag size={16} />} label="Total Sets" value={report.totalProducts.toLocaleString()} color="text-lego-yellow" />
          <KPICard icon={<BarChart3 size={16} />} label="Avg Price" value={`$${report.avgPrice.toFixed(0)}`} color="text-lego-blue" />
          <KPICard icon={<Tag size={16} />} label="On Sale" value={report.onSaleCount.toLocaleString()} color="text-lego-red" />
          <KPICard icon={<Sparkles size={16} />} label="New Products" value={report.newCount.toLocaleString()} color="text-purple-400" />
          <KPICard icon={<TrendingUp size={16} />} label="In Stock" value={report.inStockCount.toLocaleString()} color="text-lego-green" />
          <KPICard icon={<AlertTriangle size={16} />} label="Out of Stock" value={report.outOfStockCount.toLocaleString()} color="text-orange-400" />
        </div>

        {/* Price Distribution */}
        <div className="glass rounded-xl p-5 mb-6">
          <h2 className="font-display font-semibold text-sm mb-4">Price Distribution</h2>
          <div className="space-y-2.5">
            {report.priceDistribution.map(b => {
              const pct = report.totalProducts > 0 ? (b.count / report.totalProducts * 100) : 0
              return (
                <div key={b.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-300 font-medium">{b.label}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{b.count} sets ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-lego-surface2 rounded-full overflow-hidden">
                    <div className="h-full bg-lego-yellow rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Theme Breakdown */}
        <div className="glass rounded-xl p-5 mb-6">
          <h2 className="font-display font-semibold text-sm mb-4">Top Themes by Product Count</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-lego-border">
                  <th className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-left">Theme</th>
                  <th className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-right">Sets</th>
                  <th className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-right">Avg Price</th>
                  <th className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-right">On Sale</th>
                  <th className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-right">New</th>
                </tr>
              </thead>
              <tbody>
                {report.themes.map(t => (
                  <tr key={t.name} className="border-b border-lego-border/30 hover:bg-white/[0.02]">
                    <td className="py-2 px-2 text-white font-medium">
                      <Link to={`/explore?theme=${encodeURIComponent(t.name)}`} className="hover:text-lego-yellow transition-colors">
                        {t.name}
                      </Link>
                    </td>
                    <td className="py-2 px-2 text-right text-gray-400 font-mono">{t.count}</td>
                    <td className="py-2 px-2 text-right text-lego-yellow font-mono">${t.avgPrice.toFixed(0)}</td>
                    <td className="py-2 px-2 text-right text-lego-red font-mono">{t.onSale}</td>
                    <td className="py-2 px-2 text-right text-purple-400 font-mono">{t.newItems}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Catalog Value */}
        <div className="glass rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-semibold text-sm mb-1">Total Catalog Value</h2>
              <p className="text-[10px] text-gray-500">Sum of current retail prices across all tracked sets</p>
            </div>
            <div className="text-2xl font-display font-bold text-lego-yellow">
              ${Math.round(report.catalogValue).toLocaleString()}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="glass rounded-xl p-6 text-center glow-red relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-lego-red/10 to-transparent" />
          <div className="relative">
            <Crown size={24} className="text-lego-yellow mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg mb-2">Want the full daily report?</h3>
            <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
              Pro members get detailed daily reports with per-product price drops, stock changes, new releases, and retirement alerts delivered to their inbox.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/reports" className="inline-flex items-center gap-2 px-5 py-2.5 bg-lego-red hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
                <FileText size={16} /> View Reports <ArrowRight size={14} />
              </Link>
              <Link to="/explore" className="inline-flex items-center gap-2 px-5 py-2.5 glass glass-hover text-white text-sm font-semibold rounded-xl transition-all">
                Browse All Sets
              </Link>
            </div>
          </div>
        </div>

        {/* SEO footer text */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-600">
            This weekly market summary is updated automatically. Data sourced from LEGO.com.
            LEGO® is a trademark of the LEGO Group. StudMetrics is not affiliated with the LEGO Group.
          </p>
        </div>
      </div>
    </main>
  )
}

function KPICard({ icon, label, value, color }) {
  return (
    <div className="glass rounded-xl p-3.5">
      <div className={`mb-1.5 ${color}`}>{icon}</div>
      <div className={`font-display font-bold text-lg ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{label}</div>
    </div>
  )
}