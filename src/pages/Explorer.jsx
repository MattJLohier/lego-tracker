import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, Package, ChevronDown, ArrowUpDown, GitCompareArrows } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { useProducts, useThemeList, useAvailabilityStatuses, useAgeRanges } from '../hooks/useData'
import { useFavorites } from '../hooks/useFavorites'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const SORT_OPTIONS = [
  { value: 'price_usd-asc', label: 'Price: Low → High' },
  { value: 'price_usd-desc', label: 'Price: High → Low' },
  { value: 'rating-desc', label: 'Highest Rated' },
  { value: 'piece_count-desc', label: 'Most Pieces' },
  { value: 'price_per_piece-asc', label: 'Best Value ($/piece)' },
  { value: 'discount_usd-desc', label: 'Biggest Discount' },
]

export default function Explorer() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [theme, setTheme] = useState(searchParams.get('theme') || 'all')
  const [inStock, setInStock] = useState(false)
  const [onSale, setOnSale] = useState(false)
  const [isNew, setIsNew] = useState(searchParams.get('filter') === 'new')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minPieces, setMinPieces] = useState('')
  const [maxPieces, setMaxPieces] = useState('')
  const [minRating, setMinRating] = useState('')
  const [ageRange, setAgeRange] = useState('all')
  const [availability, setAvailability] = useState('all')
  const [sortBy, setSortBy] = useState('price_usd')
  const [sortDir, setSortDir] = useState('asc')
  const [showFilters, setShowFilters] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareList, setCompareList] = useState([])
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  const themes = useThemeList()
  const availStatuses = useAvailabilityStatuses()
  const ageRanges = useAgeRanges()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const handleSort = (val) => {
    const [field, dir] = val.split('-')
    setSortBy(field)
    setSortDir(dir)
  }

  const toggleCompare = (slug) => {
    setCompareList(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : prev.length < 4 ? [...prev, slug] : prev
    )
  }

  const goCompare = () => {
    if (compareList.length >= 2) navigate(`/compare?slugs=${compareList.join(',')}`)
  }

  const filters = {
    search: debouncedSearch, theme, inStock: inStock || undefined, onSale: onSale || undefined,
    isNew: isNew || undefined, minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined, minPieces: minPieces ? Number(minPieces) : undefined,
    maxPieces: maxPieces ? Number(maxPieces) : undefined, minRating: minRating ? Number(minRating) : undefined,
    ageRange: ageRange !== 'all' ? ageRange : undefined, availability: availability !== 'all' ? availability : undefined,
    sortBy, sortDir, limit: 200,
  }

  const { products, loading } = useProducts(filters)

  const activeFilterCount = [theme !== 'all', inStock, onSale, isNew, minPrice, maxPrice, minPieces, maxPieces, minRating, ageRange !== 'all', availability !== 'all'].filter(Boolean).length

  const clearFilters = () => {
    setTheme('all'); setInStock(false); setOnSale(false); setIsNew(false)
    setMinPrice(''); setMaxPrice(''); setMinPieces(''); setMaxPieces('')
    setMinRating(''); setAgeRange('all'); setAvailability('all'); setSearch('')
  }

  return (
    <main className="pt-18 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-7xl mx-auto pt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight mb-1">Product Explorer</h1>
            <p className="text-gray-500 text-xs">Search, filter, and analyze every tracked LEGO set</p>
          </div>
          <button onClick={() => { setCompareMode(!compareMode); setCompareList([]) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all
              ${compareMode ? 'bg-lego-blue/20 text-lego-blue border border-lego-blue/30' : 'glass text-gray-400 hover:text-white'}`}>
            <GitCompareArrows size={14} /> {compareMode ? 'Exit Compare' : 'Compare Mode'}
          </button>
        </div>

        {/* Compare bar */}
        {compareMode && (
          <div className="glass rounded-xl p-3 mb-4 flex items-center justify-between animate-slide-up">
            <p className="text-xs text-gray-400">
              {compareList.length === 0 ? 'Click products to select (2-4)' : `${compareList.length} selected — ${compareList.length < 2 ? 'need at least 2' : 'ready to compare'}`}
            </p>
            <div className="flex gap-2">
              {compareList.length > 0 && <button onClick={() => setCompareList([])} className="text-xs text-gray-500 hover:text-white">Clear</button>}
              <button onClick={goCompare} disabled={compareList.length < 2}
                className="px-3 py-1.5 bg-lego-blue text-white text-xs font-semibold rounded-lg disabled:opacity-30 hover:bg-blue-700 transition-colors">
                Compare {compareList.length > 0 ? `(${compareList.length})` : ''}
              </button>
            </div>
          </div>
        )}

        {/* Search + controls */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Search sets by name..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 glass rounded-lg text-sm placeholder:text-gray-600 focus:outline-none focus:border-lego-red/50" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
          </div>
          <div className="relative">
            <select value={theme} onChange={e => setTheme(e.target.value)}
              className="appearance-none glass rounded-lg px-3 py-2.5 pr-8 text-xs bg-lego-surface text-white min-w-[160px] focus:outline-none cursor-pointer">
              <option value="all">All Themes</option>
              {themes.map(t => <option key={t.theme} value={t.theme}>{t.theme} ({t.product_count})</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={`${sortBy}-${sortDir}`} onChange={e => handleSort(e.target.value)}
              className="appearance-none glass rounded-lg px-3 py-2.5 pr-8 text-xs bg-lego-surface text-white min-w-[160px] focus:outline-none cursor-pointer">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ArrowUpDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 glass rounded-lg text-xs font-medium transition-colors
              ${showFilters ? 'border-lego-red/50 text-lego-red' : 'text-gray-400 hover:text-white'}`}>
            <SlidersHorizontal size={14} /> Filters
            {activeFilterCount > 0 && <span className="w-4 h-4 bg-lego-red rounded-full text-[9px] text-white flex items-center justify-center font-bold">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="glass rounded-xl p-4 mb-4 animate-slide-up">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-3">
              <FilterRange label="Price ($)" min={minPrice} max={maxPrice} setMin={setMinPrice} setMax={setMaxPrice} />
              <FilterRange label="Pieces" min={minPieces} max={maxPieces} setMin={setMinPieces} setMax={setMaxPieces} />
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block mb-1.5">Min Rating</label>
                <input type="number" step="0.5" min="0" max="5" placeholder="e.g. 4.0" value={minRating} onChange={e => setMinRating(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-lego-surface2 border border-lego-border rounded-lg text-xs focus:outline-none focus:border-lego-red/50" />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block mb-1.5">Age Range</label>
                <select value={ageRange} onChange={e => setAgeRange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-lego-surface2 border border-lego-border rounded-lg text-xs focus:outline-none cursor-pointer text-white">
                  <option value="all">Any</option>
                  {ageRanges.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block mb-1.5">Availability</label>
                <select value={availability} onChange={e => setAvailability(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-lego-surface2 border border-lego-border rounded-lg text-xs focus:outline-none cursor-pointer text-white">
                  <option value="all">Any</option>
                  {availStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Chip active={inStock} onClick={() => setInStock(!inStock)} label="In Stock" />
              <Chip active={onSale} onClick={() => setOnSale(!onSale)} label="On Sale" />
              <Chip active={isNew} onClick={() => setIsNew(!isNew)} label="New" />
              {activeFilterCount > 0 && <button onClick={clearFilters} className="text-[10px] text-gray-500 hover:text-lego-red ml-2">Clear all</button>}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-600 font-mono mb-4">{loading ? 'Loading...' : `${products.length} products`}</p>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="glass rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-lego-surface2" />
                <div className="p-3.5 space-y-2"><div className="h-3 bg-lego-surface2 rounded w-1/3" /><div className="h-4 bg-lego-surface2 rounded w-2/3" /></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package size={40} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-500 font-display">No products found</p>
            <p className="text-gray-600 text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map(p => (
              <ProductCard key={p.product_code} product={p}
                isFavorite={isFavorite(p.product_code)} onToggleFavorite={user ? toggleFavorite : null}
                showCompare={compareMode} isCompared={compareList.includes(p.slug)} onToggleCompare={toggleCompare} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function FilterRange({ label, min, max, setMin, setMax }) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block mb-1.5">{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="number" placeholder="Min" value={min} onChange={e => setMin(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-lego-surface2 border border-lego-border rounded-lg text-xs focus:outline-none focus:border-lego-red/50" />
        <span className="text-gray-600 text-xs">–</span>
        <input type="number" placeholder="Max" value={max} onChange={e => setMax(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-lego-surface2 border border-lego-border rounded-lg text-xs focus:outline-none focus:border-lego-red/50" />
      </div>
    </div>
  )
}

function Chip({ active, onClick, label }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all
        ${active ? 'bg-lego-red/20 text-lego-red border border-lego-red/30' : 'bg-lego-surface2 text-gray-400 border border-lego-border hover:text-white'}`}>
      {label}
    </button>
  )
}
