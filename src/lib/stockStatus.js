/**
 * Stock Status Normalization
 *
 * Raw availability_status values from the LEGO API:
 *   A_PRE_ORDER_FOR_DATE    → "Pre-order this item today, it will ship from ..."
 *   B_COMING_SOON_AT_DATE   → "Coming Soon on ..."
 *   E_AVAILABLE             → "Available now"
 *   F_BACKORDER_FOR_DATE    → "Will ship by ..." (has a specific date)
 *   G_BACKORDER             → "Will ship in 60 days" (no specific date)
 *   H_OUT_OF_STOCK          → "Temporarily out of stock"
 *   K_SOLD_OUT              → "Sold out"
 *   R_RETIRED               → "Retired Product"
 *   null                    → unknown
 *
 * Plus legacy/fallback strings from older data:
 *   "Available", "in stock", "backorder", "out_of_stock", etc.
 *
 * This module provides a single source of truth for:
 *   1. Whether a status means "in stock" or not
 *   2. What color category it belongs to (green/yellow/orange/red)
 *   3. A human-readable display label
 *   4. A normalized category key for comparison (so F_BACKORDER_FOR_DATE ≠ G_BACKORDER)
 */

// ─── CATEGORY DEFINITIONS ────────────────────────────────────
// Each category has a unique key used for comparisons, display, and charts.

const CATEGORY_INFO = {
  in_stock: {
    label: 'In Stock',
    color: '#34d399',        // green-400
    bgClass: 'bg-green-500/15',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/30',
    dotClass: 'bg-green-400',
    isAvailable: true,
    sortOrder: 3,
  },
  pre_order: {
    label: 'Pre-Order',
    color: '#818cf8',        // indigo-400
    bgClass: 'bg-indigo-500/15',
    textClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/30',
    dotClass: 'bg-indigo-400',
    isAvailable: true,
    sortOrder: 1,
  },
  coming_soon: {
    label: 'Coming Soon',
    color: '#a78bfa',        // violet-400
    bgClass: 'bg-violet-500/15',
    textClass: 'text-violet-400',
    borderClass: 'border-violet-500/30',
    dotClass: 'bg-violet-400',
    isAvailable: false,
    sortOrder: 2,
  },
  backorder_dated: {
    label: 'Backorder (Dated)',
    color: '#f97316',        // orange-500
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    dotClass: 'bg-orange-400',
    isAvailable: false,
    sortOrder: 4,
  },
  backorder: {
    label: 'Backorder',
    color: '#fbbf24',        // amber-400
    bgClass: 'bg-yellow-500/15',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30',
    dotClass: 'bg-yellow-400',
    isAvailable: false,
    sortOrder: 5,
  },
  out_of_stock: {
    label: 'Out of Stock',
    color: '#f87171',        // red-400
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    dotClass: 'bg-red-400',
    isAvailable: false,
    sortOrder: 6,
  },
  sold_out: {
    label: 'Sold Out',
    color: '#ef4444',        // red-500
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    dotClass: 'bg-red-500',
    isAvailable: false,
    sortOrder: 7,
  },
  retired: {
    label: 'Retired',
    color: '#6b7280',        // gray-500
    bgClass: 'bg-gray-500/15',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/30',
    dotClass: 'bg-gray-500',
    isAvailable: false,
    sortOrder: 8,
  },
  unavailable: {
    label: 'Unavailable',
    color: '#f97316',        // orange-500
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    dotClass: 'bg-orange-400',
    isAvailable: false,
    sortOrder: 6,
  },
  unknown: {
    label: 'Unknown',
    color: '#6b7280',        // gray-500
    bgClass: 'bg-gray-500/15',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/30',
    dotClass: 'bg-gray-500',
    isAvailable: false,
    sortOrder: 9,
  },
}

// ─── STATUS → CATEGORY MAPPING ──────────────────────────────
// Exact match lookup (case-insensitive). The LEGO API codes are the primary keys.

const STATUS_CATEGORIES = {
  // === LEGO API status codes (primary — these are what the DB stores) ===
  'a_pre_order_for_date': 'pre_order',
  'b_coming_soon_at_date': 'coming_soon',
  'e_available': 'in_stock',
  'f_backorder_for_date': 'backorder_dated',   // ← distinct from G_BACKORDER
  'g_backorder': 'backorder',                   // ← indefinite backorder
  'h_out_of_stock': 'out_of_stock',
  'k_sold_out': 'sold_out',
  'r_retired': 'retired',

  // === Legacy / fallback strings ===
  'available': 'in_stock',
  'in stock': 'in_stock',
  'in_stock': 'in_stock',

  'pre-order': 'pre_order',
  'preorder': 'pre_order',
  'pre_order': 'pre_order',

  'coming soon': 'coming_soon',
  'coming_soon': 'coming_soon',

  'backorder': 'backorder',
  'backordered': 'backorder',
  'f_backorder_for_date': 'backorder_dated',

  'temporarily_unavailable': 'unavailable',
  'temporarily unavailable': 'unavailable',
  'temp_unavailable': 'unavailable',

  'out_of_stock': 'out_of_stock',
  'out of stock': 'out_of_stock',
  'p_outofstock': 'out_of_stock',
  'outofstock': 'out_of_stock',

  'sold_out': 'sold_out',
  'sold out': 'sold_out',

  'retired': 'retired',
  'retired product': 'retired',

  'f_retiring': 'retired',
  'retiring': 'retired',
  'retiring_soon': 'retired',
  'retiring soon': 'retired',
  'last_chance': 'retired',
  'last chance': 'retired',
  'leaving_soon': 'retired',
  'leaving soon': 'retired',
  'discontinued': 'retired',
}

// ─── CORE FUNCTIONS ──────────────────────────────────────────

/**
 * Normalize a raw availability_status string to a category key.
 * This is the KEY function — it maps every possible status to one of our categories.
 */
export function normalizeStatus(rawStatus, inStockBool) {
  if (!rawStatus && inStockBool !== undefined) {
    return inStockBool ? 'in_stock' : 'out_of_stock'
  }
  if (!rawStatus) return 'unknown'

  const lower = String(rawStatus).toLowerCase().trim()

  // Exact match first (covers all LEGO API codes + legacy strings)
  const category = STATUS_CATEGORIES[lower]
  if (category) return category

  // Fuzzy fallback for anything unexpected
  if (/available|in.?stock/i.test(lower)) return 'in_stock'
  if (/pre.?order/i.test(lower)) return 'pre_order'
  if (/coming.?soon/i.test(lower)) return 'coming_soon'
  if (/backorder.*date|ship.*by/i.test(lower)) return 'backorder_dated'
  if (/backorder/i.test(lower)) return 'backorder'
  if (/retir|leaving|last.?chance|discontinu/i.test(lower)) return 'retired'
  if (/sold.?out/i.test(lower)) return 'sold_out'
  if (/out.?of.?stock/i.test(lower)) return 'out_of_stock'
  if (/unavailable|temp/i.test(lower)) return 'unavailable'

  // Boolean fallback
  if (inStockBool !== undefined) {
    return inStockBool ? 'in_stock' : 'out_of_stock'
  }

  return 'unknown'
}

/**
 * Get display info for a category key.
 */
export function getStatusInfo(category) {
  return CATEGORY_INFO[category] || CATEGORY_INFO.unknown
}

/**
 * Combined: get full display info from raw status string.
 * Returns category, label, colors, and availability.
 */
export function getStatusDisplay(rawStatus, inStockBool) {
  const category = normalizeStatus(rawStatus, inStockBool)
  const info = getStatusInfo(category)
  return {
    ...info,
    category,
    displayLabel: info.label,
  }
}

/**
 * Is a given raw status "in stock" / available for purchase?
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
 * Get all unique categories and their info (for chart legends).
 */
export function getAllCategories() {
  return Object.entries(CATEGORY_INFO)
    .filter(([key]) => key !== 'unknown')
    .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
    .map(([key, info]) => ({ key, ...info }))
}

/**
 * Get a short label suitable for chart legends and stacked area charts.
 * Maps raw LEGO status codes to clean names.
 */
export function getStatusShortLabel(rawStatus) {
  const category = normalizeStatus(rawStatus)
  return CATEGORY_INFO[category]?.label ?? rawStatus ?? 'Unknown'
}