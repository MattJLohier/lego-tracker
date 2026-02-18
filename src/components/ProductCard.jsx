import { Link } from 'react-router-dom'
import { Star, Package, Tag, TrendingDown, Heart } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function ProductCard({ product, isFavorite, onToggleFavorite, showCompare, isCompared, onToggleCompare }) {
  const { user } = useAuth()
  const {
    product_name, product_code, slug, theme, price_usd, list_price_usd,
    piece_count, rating, in_stock, on_sale, is_new, discount_usd, price_per_piece,
  } = product

  // Try common image field names from the database
  const imageUrl = product.image_url || product.img_url || product.primary_image_url
    || product.thumbnail_url || product.image || product.product_image_url || null

  const hasDiscount = discount_usd && Number(discount_usd) > 0

  return (
    <div className="glass rounded-xl overflow-hidden card-shine glass-hover transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group relative">
      {/* Favorite button */}
      {user && onToggleFavorite && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(product_code, slug) }}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all"
        >
          <Heart size={14} className={isFavorite ? 'fill-lego-red text-lego-red' : 'text-white/60'} />
        </button>
      )}

      {/* Compare checkbox */}
      {showCompare && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare?.(slug) }}
          className={`absolute top-3 ${user && onToggleFavorite ? 'right-12' : 'right-3'} z-10 p-1.5 rounded-full backdrop-blur-sm transition-all
            ${isCompared ? 'bg-lego-blue/80 text-white' : 'bg-black/40 text-white/60 hover:bg-black/60'}`}
          title="Add to compare"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
          </svg>
        </button>
      )}

      <Link to={`/product/${slug}`}>
        {/* Image area */}
        <div className="relative bg-gradient-to-b from-lego-surface2 to-lego-surface p-4 aspect-square flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product_name || `Set ${product_code}`}
              className="max-h-full max-w-full object-contain drop-shadow-lg"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null
                e.target.style.display = 'none'
                e.target.parentElement.querySelector('.fallback-code').style.display = 'block'
              }}
            />
          ) : null}
          <div className={`fallback-code text-4xl font-display font-bold text-gray-700/30${imageUrl ? ' hidden' : ''}`}>{product_code}</div>
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {is_new && <span className="px-2 py-0.5 bg-lego-blue text-white text-[9px] font-bold uppercase tracking-wider rounded-full">New</span>}
            {on_sale && (
              <span className="px-2 py-0.5 bg-lego-red text-white text-[9px] font-bold uppercase tracking-wider rounded-full flex items-center gap-0.5">
                <TrendingDown size={9} /> Sale
              </span>
            )}
          </div>
          <div className="absolute bottom-3 left-3">
            <div className={`w-2 h-2 rounded-full ${in_stock ? 'bg-green-400' : 'bg-red-400'}`} />
          </div>
        </div>

        {/* Info */}
        <div className="p-3.5">
          {theme && <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-0.5">{theme}</p>}
          <h3 className="font-display font-semibold text-xs leading-snug text-white mb-2 line-clamp-2 min-h-[2rem]">
            {product_name || `Set ${product_code}`}
          </h3>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display font-bold text-base text-lego-yellow">${Number(price_usd).toFixed(2)}</span>
            {hasDiscount && <span className="text-[10px] text-gray-500 line-through">${Number(list_price_usd).toFixed(2)}</span>}
            {hasDiscount && <span className="text-[10px] font-bold text-lego-red">−${Number(discount_usd).toFixed(0)}</span>}
          </div>
          <div className="flex items-center gap-2.5 text-[10px] text-gray-400">
            {piece_count && Number(piece_count) > 0 && (
              <span className="flex items-center gap-0.5"><Package size={10} />{Number(piece_count).toLocaleString()}</span>
            )}
            {rating && <span className="flex items-center gap-0.5"><Star size={10} className="text-lego-yellow fill-lego-yellow" />{Number(rating).toFixed(1)}</span>}
            {price_per_piece && Number(price_per_piece) > 0 && Number(price_per_piece) < 50 && (
              <span className="flex items-center gap-0.5"><Tag size={10} />${Number(price_per_piece).toFixed(2)}/pc</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}