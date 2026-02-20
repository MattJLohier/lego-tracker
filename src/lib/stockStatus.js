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
 * This module provides a single source of truth for:
 *   1. Whether a status means "in stock" or not
 *   2. What color category it belongs to (green/yellow/orange/red)
 *   3. A human-readable display label
 *   4. A normalized category key for comparison (so F_BACKORDER_FOR_DATE ≠ G_BACKORDER)
 *   5. Enriched labels using availability_text (e.g. "Backorder (Mar 7)")
 */

// ─── CATEGORY DEFINITIONS ────────────────────────────────────

const CATEGORY_INFO = {
  in_stock: {
    label: 'In Stock',
    color: '#34d399',
    bgClass: 'bg-green-500/15',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/30',
    dotClass: 'bg-green-400',
    isAvailable: true,
    sortOrder: 3,
  },
  pre_order: {
    label: 'Pre-Order',
    color: '#818cf8',
    bgClass: 'bg-indigo-500/15',
    textClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/30',
    dotClass: 'bg-indigo-400',
    isAvailable: true,
    sortOrder: 1,
  },
  coming_soon: {
    label: 'Coming Soon',
    color: '#a78bfa',
    bgClass: 'bg-violet-500/15',
    textClass: 'text-violet-400',
    borderClass: 'border-violet-500/30',
    dotClass: 'bg-violet-400',
    isAvailable: false,
    sortOrder: 2,
  },
  backorder_dated: {
    label: 'Backorder (Dated)',
    color: '#fbbf24',
    bgClass: 'bg-yellow-500/15',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30',
    dotClass: 'bg-yellow-400',
    isAvailable: false,
    sortOrder: 4,
  },
  backorder: {
    label: 'Backorder',
    color: '#f97316',
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    dotClass: 'bg-orange-400',
    isAvailable: false,
    sortOrder: 5,
  },
  out_of_stock: {
    label: 'Out of Stock',
    color: '#f87171',
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    dotClass: 'bg-red-400',
    isAvailable: false,
    sortOrder: 6,
  },
  sold_out: {
    label: 'Sold Out',
    color: '#ef4444',
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    dotClass: 'bg-red-500',
    isAvailable: false,
    sortOrder: 7,
  },
  retired: {
    label: 'Retired',
    color: '#6b7280',
    bgClass: 'bg-gray-500/15',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/30',
    dotClass: 'bg-gray-500',
    isAvailable: false,
    sortOrder: 8,
  },
  unavailable: {
    label: 'Unavailable',
    color: '#f97316',
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    dotClass: 'bg-orange-400',
    isAvailable: false,
    sortOrder: 6,
  },
  unknown: {
    label: 'Unknown',
    color: '#6b7280',
    bgClass: 'bg-gray-500/15',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/30',
    dotClass: 'bg-gray-500',
    isAvailable: false,
    sortOrder: 9,
  },
}

// ─── STATUS → CATEGORY MAPPING ──────────────────────────────

const STATUS_CATEGORIES = {
  // === LEGO API status codes ===
  'a_pre_order_for_date': 'pre_order',
  'b_coming_soon_at_date': 'coming_soon',
  'e_available': 'in_stock',
  'f_backorder_for_date': 'backorder_dated',
  'g_backorder': 'backorder',
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

  // === Display labels (so StatusBadge can receive its own output) ===
  'backorder (dated)': 'backorder_dated',
  'unavailable': 'unavailable',
  'unknown': 'unknown',
}

// ─── DATE PARSING ────────────────────────────────────────────

/**
 * Extract a short date from availability_text like "Will ship by March 7, 2026"
 * Returns a short form like "Mar 7" or "Mar 7, 2026" if it's a different year.
 */
function parseShipDate(availabilityText) {
  if (!availabilityText) return null
  const text = String(availabilityText).trim()

  // Match patterns like "Will ship by March 7, 2026", "Available from April 15, 2026"
  const match = text.match(/(?:ship|available|arrive|deliver)\w*\s+(?:by|on|from)?\s*(\w+\s+\d{1,2},?\s*\d{4})/i)
  if (match) {
    try {
      const parsed = new Date(match[1])
      if (!isNaN(parsed.getTime())) {
        const now = new Date()
        const month = parsed.toLocaleString('en-US', { month: 'short' })
        const day = parsed.getDate()
        if (parsed.getFullYear() !== now.getFullYear()) {
          return `${month} ${day}, ${parsed.getFullYear()}`
        }
        return `${month} ${day}`
      }
    } catch {
      // Fall through
    }
  }

  // Fallback: extract "Month Day" directly
  const fallback = text.match(/(?:by|on|from)\s+(\w+\s+\d{1,2})/i)
  if (fallback) return fallback[1]

  return null
}

/**
 * Get the full availability detail text, cleaned up.
 * Returns null for generic texts like "Available now".
 */
function parseAvailabilityDetail(availabilityText) {
  if (!availabilityText) return null
  const text = String(availabilityText).trim()
  if (text.toLowerCase() === 'available now') return null
  return text
}

// ─── CORE FUNCTIONS ──────────────────────────────────────────

/**
 * Normalize a raw availability_status string to a category key.
 */
export function normalizeStatus(rawStatus, inStockBool) {
  if (!rawStatus && inStockBool !== undefined) {
    return inStockBool ? 'in_stock' : 'out_of_stock'
  }
  if (!rawStatus) return 'unknown'

  const lower = String(rawStatus).toLowerCase().trim()

  // Don't re-normalize enriched labels like "Backorder (Mar 7)"
  if (lower.startsWith('backorder (') && lower !== 'backorder (dated)') {
    return 'backorder_dated'
  }

  const category = STATUS_CATEGORIES[lower]
  if (category) return category

  // Fuzzy fallback
  if (/available|in.?stock/i.test(lower)) return 'in_stock'
  if (/pre.?order/i.test(lower)) return 'pre_order'
  if (/coming.?soon/i.test(lower)) return 'coming_soon'
  if (/backorder.*date|ship.*by/i.test(lower)) return 'backorder_dated'
  if (/backorder/i.test(lower)) return 'backorder'
  if (/retir|leaving|last.?chance|discontinu/i.test(lower)) return 'retired'
  if (/sold.?out/i.test(lower)) return 'sold_out'
  if (/out.?of.?stock/i.test(lower)) return 'out_of_stock'
  if (/unavailable|temp/i.test(lower)) return 'unavailable'

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
 *
 * Pass availabilityText (3rd arg) to get enriched labels:
 *   "Backorder (Dated)" → "Backorder (Mar 7)"
 *   "Pre-Order" → "Pre-Order (Apr 15)"
 *   "Coming Soon" → "Coming Soon (May 1)"
 *
 * Usage:
 *   getStatusDisplay('F_BACKORDER_FOR_DATE', false, 'Will ship by March 7, 2026')
 *   → { displayLabel: "Backorder (Mar 7)", detail: "Will ship by March 7, 2026", ... }
 */
export function getStatusDisplay(rawStatus, inStockBool, availabilityText) {
  const category = normalizeStatus(rawStatus, inStockBool)
  const info = getStatusInfo(category)

  let displayLabel = info.label
  const detail = parseAvailabilityDetail(availabilityText)
  const shipDate = parseShipDate(availabilityText)

  // Enrich label with actual date for dated statuses
  if (shipDate) {
    if (category === 'backorder_dated') {
      displayLabel = `Backorder (${shipDate})`
    } else if (category === 'pre_order') {
      displayLabel = `Pre-Order (${shipDate})`
    } else if (category === 'coming_soon') {
      displayLabel = `Coming Soon (${shipDate})`
    }
  }

  return {
    ...info,
    category,
    displayLabel,
    detail,       // Full text, e.g. "Will ship by March 7, 2026"
    shipDate,     // Short date, e.g. "Mar 7"
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
 * Get a short label suitable for chart legends.
 */
export function getStatusShortLabel(rawStatus) {
  const category = normalizeStatus(rawStatus)
  return CATEGORY_INFO[category]?.label ?? rawStatus ?? 'Unknown'
}