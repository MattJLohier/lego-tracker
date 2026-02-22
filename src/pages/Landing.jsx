import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Search, Bell, TrendingDown, Sparkles, Package, Star, Zap, Heart, GitCompareArrows, LineChart, FileText, Crown, Check, X } from 'lucide-react'
import AnimatedCounter from '../components/AnimatedCounter'
import ProductCard from '../components/ProductCard'
import { useStats, useNewProducts, useThemes } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { UpgradeModal } from '../components/UpgradeModal'

export default function Landing() {
  const [showUpgrade, setShowUpgrade] = useState(false)

  return (
    <main>
      <HeroSection onUpgrade={() => setShowUpgrade(true)} />
      <FeaturesSection />
      <NewProductsSection />
      <ThemePreviewSection />
      <CTASection onUpgrade={() => setShowUpgrade(true)} />
      <Footer />
      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </main>
  )
}

function HeroSection({ onUpgrade }) {
  const { stats, loading } = useStats()
  const { user } = useAuth()
  const { isPro } = useSubscription()

  return (
    <section className="relative min-h-[90vh] flex items-center pt-16 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-lego-red/5 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-lego-yellow/5 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      </div>

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 w-full">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-mono text-gray-400 mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Live market coverage: {loading ? '...' : stats?.totalProducts?.toLocaleString()} sets tracked daily
          </div>

          <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight mb-6 animate-slide-up">
            <span className="whitespace-nowrap">LEGO Market Intelligence</span>
            <br />
            <span className="text-gradient">Updated Daily</span>
          </h1>

          <p className="text-lg text-gray-400 leading-relaxed max-w-xl mb-10 animate-slide-up stagger-2 opacity-0">
            StudMetrics tracks price behavior, availability cycles, and discount patterns across the LEGO catalog — so you can time purchases and track what matters.
          </p>

          <div className="flex flex-wrap gap-4 animate-slide-up stagger-3 opacity-0">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-lego-red hover:bg-red-700 text-white font-display font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-lego-red/20"
            >
              Explore the Market <ArrowRight size={18} />
            </Link>

            <Link
              to="/market-report"
              className="inline-flex items-center gap-2 px-6 py-3.5 glass glass-hover text-white font-display font-semibold rounded-xl transition-all"
            >
              <FileText size={18} /> Weekly Report
            </Link>

            <Link
              to="/alerts"
              className="inline-flex items-center gap-2 px-6 py-3.5 glass glass-hover text-white/90 font-display font-semibold rounded-xl transition-all"
            >
              <Bell size={18} /> Set an Alert
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-mono animate-slide-up stagger-4 opacity-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass">
              <Package size={12} className="text-lego-yellow" /> Full catalog coverage
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass">
              <TrendingDown size={12} className="text-lego-red" /> Price-drop & sale signals
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass">
              <Bell size={12} className="text-lego-green" /> Restock & availability tracking
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass">
              <Sparkles size={12} className="text-lego-blue" /> Weekly intel free • Daily intel in Pro
            </span>
          </div>
        </div>

        {!loading && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-16 animate-slide-up stagger-5 opacity-0">
            <StatMini label="Products" value={<AnimatedCounter end={stats.totalProducts} />} />
            <StatMini label="Themes" value={<AnimatedCounter end={stats.uniqueThemes} />} />
            <StatMini label="Avg Price" value={<AnimatedCounter end={stats.avgPrice} prefix="$" decimals={0} />} />
            <StatMini label="On Sale" value={<AnimatedCounter end={stats.onSaleCount} />} />
            <StatMini label="Catalog Value" value={<AnimatedCounter end={stats.totalCatalogValue} prefix="$" />} />
            <StatMini label="Avg Rating" value={<AnimatedCounter end={stats.avgRating} decimals={1} suffix="★" />} />
          </div>
        )}
      </div>
    </section>
  )
}

function StatMini({ label, value }) {
  return (
    <div className="glass rounded-lg px-4 py-3 glass-hover transition-all">
      <div className="font-display font-bold text-lg text-lego-yellow">{value}</div>
      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{label}</div>
    </div>
  )
}

function FeaturesSection() {
  const features = [
    {
      icon: <Search size={22} />,
      title: 'Market Explorer',
      desc: 'Search, filter, and sort the full LEGO catalog across 10+ dimensions.',
      color: 'text-lego-blue',
      bg: 'bg-lego-blue/10',
    },
    {
      icon: <BarChart3 size={22} />,
      title: 'Market Dashboard',
      desc: 'Theme performance, price distributions, best-value rankings, and catalog trends.',
      color: 'text-lego-yellow',
      bg: 'bg-lego-yellow/10',
    },
    {
      icon: <TrendingDown size={22} />,
      title: 'Price Behavior',
      desc: 'Full price history with drop/increase context and sale timing signals.',
      color: 'text-lego-red',
      bg: 'bg-lego-red/10',
    },
    {
      icon: <GitCompareArrows size={22} />,
      title: 'Side-by-Side Compare',
      desc: 'Compare up to 4 sets across price, value, rating, and availability.',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      icon: <Heart size={22} />,
      title: 'Watchlist Portfolio',
      desc: 'Build a wishlist and track the sets you care about like a portfolio.',
      color: 'text-pink-400',
      bg: 'bg-pink-400/10',
    },
    {
      icon: <Bell size={22} />,
      title: 'Alerts & Reports',
      desc: 'Get notified on price drops and restocks. Pro adds daily category reports.',
      color: 'text-lego-green',
      bg: 'bg-lego-green/10',
    },
  ]

  const comparisonRows = [
    { feature: 'Browse & search full catalog', free: true, pro: true },
    { feature: 'Market dashboard & analytics', free: true, pro: true },
    { feature: 'Price history charts', free: true, pro: true },
    { feature: 'Side-by-side comparison', free: true, pro: true },
    { feature: 'Watchlist / portfolio', free: true, pro: true },
    { feature: 'Weekly market digest', free: true, pro: true },
    { feature: 'Price drop & restock alerts', free: '1 alert', pro: '10 alerts' },
    { feature: 'Custom category reports', free: false, pro: '10 reports' },
    { feature: 'Daily intel updates', free: false, pro: true },
    { feature: 'Priority data refresh', free: false, pro: true },
  ]

  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display font-bold text-3xl tracking-tight mb-3">
            Built for <span className="text-gradient-red">LEGO market</span> watchers
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto text-sm">
            Monitor price and availability signals across the LEGO catalog — then act with confidence.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f => (
            <div key={f.title} className="glass rounded-xl p-5 glass-hover transition-all hover:-translate-y-1">
              <div className={`w-10 h-10 ${f.bg} rounded-lg flex items-center justify-center ${f.color} mb-3`}>{f.icon}</div>
              <h3 className="font-display font-semibold text-base mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Pro comparison table */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h3 className="font-display font-bold text-xl text-center mb-6 tracking-tight">
            Free vs <span className="text-lego-yellow">Pro</span>
          </h3>
          <div className="glass rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_100px_100px] items-center px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">Feature</span>
              <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider text-center">Free</span>
              <span className="text-[11px] font-mono text-center">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lego-yellow/15 text-lego-yellow text-[10px] font-semibold">
                  <Crown size={10} /> Pro
                </span>
              </span>
            </div>
            {/* Table rows */}
            {comparisonRows.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_100px_100px] items-center px-5 py-3 transition-colors hover:bg-white/[0.02] ${
                  i < comparisonRows.length - 1 ? 'border-b border-white/[0.04]' : ''
                }`}
              >
                <span className="text-sm text-gray-300">{row.feature}</span>
                <div className="flex justify-center">
                  {row.free === true ? (
                    <div className="w-5 h-5 rounded-full bg-lego-green/15 flex items-center justify-center">
                      <Check size={12} className="text-lego-green" />
                    </div>
                  ) : row.free === false ? (
                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                      <X size={12} className="text-gray-600" />
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-gray-400">{row.free}</span>
                  )}
                </div>
                <div className="flex justify-center">
                  {row.pro === true ? (
                    <div className="w-5 h-5 rounded-full bg-lego-yellow/15 flex items-center justify-center">
                      <Check size={12} className="text-lego-yellow" />
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-lego-yellow font-semibold">{row.pro}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-gray-600 font-mono mt-4">
            Designed for collectors • deal optimizers • retirement watchers
          </p>
        </div>
      </div>
    </section>
  )
}

function NewProductsSection() {
  const { products, loading } = useNewProducts(8)
  if (loading || !products.length) return null

  return (
    <section className="py-15 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-tight mb-1">
              <Zap size={24} className="inline text-lego-yellow mr-1.5" />
              New to the Market
            </h2>
            <p className="text-gray-400 text-sm">Latest additions to the LEGO catalog</p>
          </div>
          <Link to="/explore?filter=new" className="text-sm text-lego-red hover:text-red-400 font-medium flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.slice(0, 8).map(p => (
            <ProductCard key={p.product_code} product={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ThemePreviewSection() {
  const { themes, loading } = useThemes()
  if (loading || !themes.length) return null

  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-3xl tracking-tight mb-3">
            Market by <span className="text-gradient">Theme</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto text-sm">
            See which themes are expensive, discounted, trending, or newly stocked.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {themes
            .filter(t => t.theme)
            .slice(0, 16)
            .map(t => (
              <Link
                key={t.theme}
                to={`/explore?theme=${encodeURIComponent(t.theme)}`}
                className="glass rounded-xl p-4 glass-hover transition-all hover:-translate-y-0.5 group"
              >
                <h3 className="font-display font-semibold text-sm mb-2 group-hover:text-lego-yellow transition-colors">{t.theme}</h3>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>{t.product_count} sets</span>
                  <span className="font-mono">${Number(t.avg_price).toFixed(0)} avg</span>
                </div>
                {t.avg_rating && (
                  <div className="flex items-center gap-1 mt-1.5 text-[11px]">
                    <Star size={10} className="text-lego-yellow fill-lego-yellow" />
                    <span className="text-gray-400">{Number(t.avg_rating).toFixed(1)}</span>
                    {t.on_sale_count > 0 && <span className="ml-auto text-lego-red font-semibold">{t.on_sale_count} on sale</span>}
                  </div>
                )}
              </Link>
            ))}
        </div>
      </div>
    </section>
  )
}

function CTASection({ onUpgrade }) {
  const { isPro } = useSubscription()

  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="glass rounded-2xl p-10 glow-red relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-lego-red/10 to-transparent" />
          <div className="relative">
            <h2 className="font-display font-bold text-3xl mb-3">Start tracking the LEGO market</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">
              Create a free account to set 1 alert and receive a weekly market digest. Upgrade to Pro for 10 alerts and daily category reports.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              {isPro ? (
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-lego-yellow/15 border border-lego-yellow/30 text-lego-yellow font-display font-semibold rounded-xl">
                  <Check size={18} /> Pro Member
                </span>
              ) : (
                <>
                  <Link
                    to="/auth"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-lego-red hover:bg-red-700 text-white font-display font-semibold rounded-xl transition-all hover:scale-105"
                  >
                    Create Free Account <ArrowRight size={16} />
                  </Link>
                  <button
                    onClick={onUpgrade}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-lego-yellow hover:bg-yellow-500 text-black font-display font-semibold rounded-xl transition-all hover:scale-105"
                  >
                    <Crown size={16} /> View Pro
                  </button>
                </>
              )}
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 glass glass-hover text-white/90 font-display font-semibold rounded-xl transition-all"
              >
                Browse Sets
              </Link>
            </div>
            <p className="mt-4 text-[10px] text-gray-600 font-mono">
              LEGO® is a trademark of the LEGO Group. StudMetrics is not affiliated with or endorsed by the LEGO Group.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-lego-border py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-lego-red rounded flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-3 h-3">
              <rect x="2" y="10" width="28" height="18" rx="2" fill="white" />
              <rect x="6" y="4" width="6" height="8" rx="3" fill="white" />
              <rect x="20" y="4" width="6" height="8" rx="3" fill="white" />
            </svg>
          </div>
          <span className="font-display font-semibold text-sm">StudMetrics</span>
        </div>

        <p className="text-[10px] text-gray-600">
          LEGO® is a trademark of the LEGO Group. StudMetrics is not affiliated with or endorsed by the LEGO Group.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/market-report" className="text-[10px] text-gray-500 hover:text-lego-yellow transition-colors font-medium">Weekly Market Report</Link>
          <p className="text-[10px] text-gray-600 font-mono">Data refreshed daily</p>
        </div>
      </div>
    </footer>
  )
}