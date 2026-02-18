import { Link } from 'react-router-dom'
import { Heart, ArrowRight, LogIn } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { useProductHistories } from '../hooks/useData'
import { useFavorites } from '../hooks/useFavorites'
import { useAuth } from '../hooks/useAuth'

export default function Watchlist() {
  const { user } = useAuth()
  const { favoriteProducts, loading, toggleFavorite, isFavorite } = useFavorites()
  const favCodes = favoriteProducts.map(p => p.product_code)
  const { histories } = useProductHistories(favCodes)

  if (!user) {
    return (
      <main className="pt-20 pb-16 px-6 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <Heart size={40} className="mx-auto text-gray-600 mb-4" />
          <h2 className="font-display font-bold text-2xl mb-2">Your Watchlist</h2>
          <p className="text-gray-400 text-sm mb-6">Sign in to save your favorite LEGO sets, track prices, and build your personal dashboard.</p>
          <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 bg-lego-red hover:bg-red-700 text-white font-display font-semibold rounded-xl transition-all">
            <LogIn size={16} /> Sign In to Get Started
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-7xl mx-auto pt-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight mb-1">
              <Heart size={22} className="inline text-lego-red mr-1.5" /> My Watchlist
            </h1>
            <p className="text-gray-500 text-xs">Your saved LEGO sets — {favoriteProducts.length} products</p>
          </div>
          <Link to="/explore" className="text-xs text-lego-red hover:text-red-400 flex items-center gap-1">
            Browse more sets <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-lego-surface2" />
                <div className="p-3.5 space-y-2"><div className="h-3 bg-lego-surface2 rounded w-1/3" /></div>
              </div>
            ))}
          </div>
        ) : favoriteProducts.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={40} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-500 font-display text-lg mb-2">No favorites yet</p>
            <p className="text-gray-600 text-sm mb-4">Click the heart icon on any product to add it here</p>
            <Link to="/explore" className="text-lego-red text-sm hover:underline">Browse products →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {favoriteProducts.map(p => (
              <ProductCard key={p.product_code} product={p}
                history={histories[p.product_code] || []}
                isFavorite={isFavorite(p.product_code)} onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}