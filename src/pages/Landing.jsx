import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Search, Bell, TrendingDown, Sparkles, Package, Star, Zap, Heart, GitCompareArrows } from 'lucide-react'
import AnimatedCounter from '../components/AnimatedCounter'
import ProductCard from '../components/ProductCard'
import { useStats, useNewProducts, useThemes } from '../hooks/useData'

export default function Landing() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <NewProductsSection />
      <ThemePreviewSection />
      <CTASection />
      <Footer />
    </main>
  )
}

function HeroSection() {
  const { stats, loading } = useStats()
  return (
    <section className="relative min-h-[90vh] flex items-center pt-16 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-lego-red/5 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-lego-yellow/5 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      </div>
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div className="relative max-w-7xl mx-auto px-6 w-full">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-mono text-gray-400 mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Tracking {loading ? '...' : stats?.totalProducts?.toLocaleString()} LEGO sets live
          </div>
          <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight mb-6 animate-slide-up">
            Every LEGO set.<br />
            <span className="text-gradient">Every price change.</span><br />
            <span className="text-gray-500">Every day.</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-xl mb-10 animate-slide-up stagger-2 opacity-0">
            BrickPulse monitors 1,500+ LEGO products daily — tracking prices, availability, and sales so you never miss a deal.
          </p>
          <div className="flex flex-wrap gap-4 animate-slide-up stagger-3 opacity-0">
            <Link to="/explore" className="inline-flex items-center gap-2 px-6 py-3.5 bg-lego-red hover:bg-red-700 text-white font-display font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-lego-red/20">
              Explore Products <ArrowRight size={18} />
            </Link>
            <Link to="/analytics" className="inline-flex items-center gap-2 px-6 py-3.5 glass glass-hover text-white font-display font-semibold rounded-xl transition-all">
              <BarChart3 size={18} /> View Analytics
            </Link>
          </div>
        </div>

        {!loading && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-16 animate-slide-up stagger-4 opacity-0">
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
    { icon: <Search size={22} />, title: 'Product Explorer', desc: 'Search, filter, and sort across every LEGO set with 10+ filter dimensions.', color: 'text-lego-blue', bg: 'bg-lego-blue/10' },
    { icon: <BarChart3 size={22} />, title: 'Live Analytics', desc: 'Theme breakdowns, price distributions, best-value rankings, and market overview.', color: 'text-lego-yellow', bg: 'bg-lego-yellow/10' },
    { icon: <TrendingDown size={22} />, title: 'Price History', desc: 'See full price history for any set. Track drops, increases, and sale timing.', color: 'text-lego-red', bg: 'bg-lego-red/10' },
    { icon: <GitCompareArrows size={22} />, title: 'Compare Sets', desc: 'Compare up to 4 sets side-by-side across price, value, rating, and more.', color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { icon: <Heart size={22} />, title: 'Watchlist', desc: 'Save favorites, build your wishlist, and track the sets that matter to you.', color: 'text-pink-400', bg: 'bg-pink-400/10' },
    { icon: <Bell size={22} />, title: 'Price Alerts', desc: 'Get notified on price drops, restocks, and sales for your watched sets.', color: 'text-lego-green', bg: 'bg-lego-green/10' },
  ]
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display font-bold text-3xl tracking-tight mb-3">Built for the <span className="text-gradient-red">LEGO community</span></h2>
          <p className="text-gray-400 max-w-lg mx-auto text-sm">Everything you need to track, analyze, and save on LEGO sets.</p>
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
      </div>
    </section>
  )
}

function NewProductsSection() {
  const { products, loading } = useNewProducts(8)
  if (loading || !products.length) return null
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-tight mb-1"><Zap size={24} className="inline text-lego-yellow mr-1.5" />Just Launched</h2>
            <p className="text-gray-400 text-sm">Newest additions to the LEGO catalog</p>
          </div>
          <Link to="/explore?filter=new" className="text-sm text-lego-red hover:text-red-400 font-medium flex items-center gap-1">View all <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.slice(0, 8).map(p => <ProductCard key={p.product_code} product={p} />)}
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
          <h2 className="font-display font-bold text-3xl tracking-tight mb-3">Explore by <span className="text-gradient">Theme</span></h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {themes.filter(t => t.theme).slice(0, 16).map(t => (
            <Link key={t.theme} to={`/explore?theme=${encodeURIComponent(t.theme)}`}
              className="glass rounded-xl p-4 glass-hover transition-all hover:-translate-y-0.5 group">
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

function CTASection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="glass rounded-2xl p-10 glow-red relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-lego-red/10 to-transparent" />
          <div className="relative">
            <h2 className="font-display font-bold text-3xl mb-3">Never miss a LEGO deal again</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">Create a free account to save favorites, set price alerts, and get notified on restocks.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 bg-lego-red hover:bg-red-700 text-white font-display font-semibold rounded-xl transition-all hover:scale-105">
                Create Free Account <ArrowRight size={16} />
              </Link>
              <Link to="/explore" className="inline-flex items-center gap-2 px-6 py-3 glass glass-hover text-white font-display font-semibold rounded-xl transition-all">
                Browse Sets
              </Link>
            </div>
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
            <svg viewBox="0 0 32 32" className="w-3 h-3"><rect x="2" y="10" width="28" height="18" rx="2" fill="white"/><rect x="6" y="4" width="6" height="8" rx="3" fill="white"/><rect x="20" y="4" width="6" height="8" rx="3" fill="white"/></svg>
          </div>
          <span className="font-display font-semibold text-sm">BrickPulse</span>
        </div>
        <p className="text-[10px] text-gray-600">LEGO® is a trademark of the LEGO Group. BrickPulse is not affiliated with or endorsed by the LEGO Group.</p>
        <p className="text-[10px] text-gray-600 font-mono">Data refreshed daily</p>
      </div>
    </footer>
  )
}
