/**
 * Stock Status Normalization
 * 
 * Raw availability_status values from the LEGO data come in many forms:
 *   - "Available" / "available"
 *   - "F_backorder_for_date" (backorder — NOT in stock)
 *   - "P_outofstock" / "out_of_stock"
 *   - "F_retiring" / "retiring_soon"
 *   - "temporarily_unavailable"
 *   - "sold_out" / "Sold Out"
 *   - "last_chance" / "leaving_soon"
 *   etc.
 * 
 * This module provides a single source of truth for:
 *   1. Whether a status means "in stock" or not
 *   2. What color category it belongs to (green/yellow/orange/red)
 *   3. A human-readable display label
 */

// Status → normalized category
const STATUS_CATEGORIES = {
  // GREEN: Actually available to purchase now
  available: 'in_stock',
  'in stock': 'in_stock',
  in_stock: 'in_stock',

  // YELLOW: Available but with caveats  
  'pre-order': 'limited',
  preorder: 'limited',
  'coming soon': 'limited',
  coming_soon: 'limited',

  // ORANGE: Availability is degraded or temporary
  f_backorder_for_date: 'backorder',
  backorder: 'backorder',
  backordered: 'backorder',
  temporarily_unavailable: 'unavailable',
  'temporarily unavailable': 'unavailable',
  temp_unavailable: 'unavailable',

  // RED: Not available
  out_of_stock: 'out_of_stock',
  'out of stock': 'out_of_stock',
  p_outofstock: 'out_of_stock',
  outofstock: 'out_of_stock',
  sold_out: 'out_of_stock',
  'sold out': 'out_of_stock',

  // RED-ORANGE: Retiring / Discontinuing
  f_retiring: 'retiring',
  retiring: 'retiring',
  retiring_soon: 'retiring',
  'retiring soon': 'retiring',
  last_chance: 'retiring',
  'last chance': 'retiring',
  leaving_soon: 'retiring',
  'leaving soon': 'retiring',
  discontinued: 'discontinued',
}

// Category → display info
const CATEGORY_INFO = {
  in_stock: {
    label: 'In Stock',
    color: '#34d399',        // green-400
    bgClass: 'bg-green-500/15',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/30',
    dotClass: 'bg-green-400',
    isAvailable: true,
  },
  limited: {
    label: 'Pre-Order',
    color: '#fbbf24',        // yellow-400
    bgClass: 'bg-yellow-500/15',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30',
    dotClass: 'bg-yellow-400',
    isAvailable: true,
  },
  backorder: {
    label: 'Backorder',
    color: '#f97316',        // orange-500
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    dotClass: 'bg-orange-400',
    isAvailable: false,
  },
  unavailable: {
    label: 'Temporarily Unavailable',
    color: '#f97316',        // orange-500
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    dotClass: 'bg-orange-400',
    isAvailable: false,
  },
  out_of_stock: {
    label: 'Out of Stock',
    color: '#f87171',        // red-400
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    dotClass: 'bg-red-400',
    isAvailable: false,
  },
  retiring: {
    label: 'Retiring Soon',
    color: '#fb923c',        // orange-400
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    dotClass: 'bg-orange-400',
    isAvailable: false,
  },
  discontinued: {
    label: 'Discontinued',
    color: '#ef4444',        // red-500
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    dotClass: 'bg-red-500',
    isAvailable: false,
  },
  unknown: {
    label: 'Unknown',
    color: '#6b7280',        // gray-500
    bgClass: 'bg-gray-500/15',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/30',
    dotClass: 'bg-gray-500',
    isAvailable: false,
  },
}

/**
 * Normalize a raw availability_status string to a category key.
 */
export function normalizeStatus(rawStatus, inStockBool) {
  if (!rawStatus && inStockBool !== undefined) {
    return inStockBool ? 'in_stock' : 'out_of_stock'
  }
  if (!rawStatus) return 'unknown'

  const lower = String(rawStatus).toLowerCase().trim()
  const category = STATUS_CATEGORIES[lower]
  if (category) return category

  // Fuzzy fallback matching
  if (/available|in.?stock/i.test(lower)) return 'in_stock'
  if (/backorder/i.test(lower)) return 'backorder'
  if (/pre.?order|coming.?soon/i.test(lower)) return 'limited'
  if (/retir|leaving|last.?chance/i.test(lower)) return 'retiring'
  if (/discontinu/i.test(lower)) return 'discontinued'
  if (/sold.?out|out.?of.?stock/i.test(lower)) return 'out_of_stock'
  if (/unavailable|temp/i.test(lower)) return 'unavailable'

  // If we have a boolean fallback
  if (inStockBool !== undefined) {
    return inStockBool ? 'in_stock' : 'out_of_stock'
  }

  return 'unknown'
}

/**
 * Get display info for a status category.
 */
export function getStatusInfo(category) {
  return CATEGORY_INFO[category] || CATEGORY_INFO.unknown
}

/**
 * Combined: get display info from raw status string.
 */
export function getStatusDisplay(rawStatus, inStockBool) {
  const category = normalizeStatus(rawStatus, inStockBool)
  const info = getStatusInfo(category)
  return {
    ...info,
    category,
    // Use the original status as label if it's a clean readable string, else use category label
    displayLabel: (rawStatus && !/^[A-Z]_/.test(rawStatus) && rawStatus.length < 30)
      ? rawStatus
      : info.label,
  }
}

/**
 * Is a given raw status "in stock" for chart color purposes?
 * This is the critical fix for the Stock Availability chart bug.
 */
export function isStatusInStock(rawStatus, inStockBool) {
  const category = normalizeStatus(rawStatus, inStockBool)
  return CATEGORY_INFO[category]?.isAvailable ?? false
}

/**
 * Get chart color for a raw status string.
 */
export function getStatusChartColor(rawStatus, inStockBool) {
  const category = normalizeStatus(rawStatus, inStockBool)
  return CATEGORY_INFO[category]?.color ?? CATEGORY_INFO.unknown.color
}

/**
 * Get all unique categories and their info (for legends).
 */
export function getAllCategories() {
  return Object.entries(CATEGORY_INFO).map(([key, info]) => ({
    key,
    ...info,
  }))
}