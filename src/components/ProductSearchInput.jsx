import { useState, useEffect, useRef } from 'react'
import { Search, Package, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * Product search input with autocomplete dropdown.
 * Queries v_latest_products as the user types (debounced).
 * 
 * Props:
 *   value        - current selected product code (controlled)
 *   onChange     - called with { product_code, product_name, slug, theme } on selection
 *   onClear      - called when user clears the selection
 *   placeholder  - input placeholder text
 *   className    - additional classes for the wrapper
 */
export default function ProductSearchInput({ value, onChange, onClear, placeholder = 'Search by name or set number…', className = '' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null) // { product_code, product_name, slug, theme }
  const wrapperRef = useRef(null)
  const debounceRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        // Search by name OR product_code
        const { data } = await supabase
          .from('v_latest_products')
          .select('product_code, product_name, slug, theme, enriched_price_usd, price_usd, in_stock, availability_status')
          .or(`product_name.ilike.%${query}%,product_code.ilike.%${query}%,slug.ilike.%${query}%`)
          .order('product_name', { ascending: true })
          .limit(8)

        setResults(data || [])
        setOpen(true)
      } catch (err) {
        console.warn('Product search error:', err)
        setResults([])
      }
      setLoading(false)
    }, 250)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleSelect = (product) => {
    setSelected(product)
    setQuery('')
    setOpen(false)
    onChange?.({
      product_code: product.product_code,
      product_name: product.product_name,
      slug: product.slug,
      theme: product.theme,
    })
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setResults([])
    onClear?.()
  }

  const price = (p) => {
    const v = Number(p.enriched_price_usd || p.price_usd)
    return v > 0 ? `$${v.toFixed(2)}` : ''
  }

  // If already selected, show the selected product as a chip
  if (selected || value) {
    return (
      <div className={`flex items-center gap-2 bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 ${className}`}>
        <Package size={14} className="text-gray-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-white font-medium truncate">
            {selected?.product_name || value}
          </span>
          {selected?.theme && (
            <span className="text-[10px] text-gray-500 ml-2">{selected.theme}</span>
          )}
          {selected?.product_code && (
            <span className="text-[10px] text-gray-500 ml-1">#{selected.product_code}</span>
          )}
        </div>
        <button
          onClick={handleClear}
          className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          className="w-full bg-lego-surface2 border border-lego-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lego-red transition-colors"
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-gray-600 border-t-lego-red rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-lego-surface border border-lego-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden max-h-[320px] overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.product_code}
              onClick={() => handleSelect(product)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left border-b border-lego-border/30 last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white font-medium truncate">{product.product_name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-500">{product.theme}</span>
                  <span className="text-[10px] text-gray-600">#{product.product_code}</span>
                  {price(product) && (
                    <span className="text-[10px] text-lego-yellow font-mono">{price(product)}</span>
                  )}
                </div>
              </div>
              <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-full ${product.in_stock ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                {product.in_stock ? 'In Stock' : 'OOS'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {open && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-lego-surface border border-lego-border rounded-xl shadow-2xl shadow-black/40 p-4 text-center">
          <p className="text-[11px] text-gray-500">No products found for "{query}"</p>
        </div>
      )}
    </div>
  )
}