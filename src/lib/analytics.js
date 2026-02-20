/**
 * Google Analytics 4 integration
 * 
 * Set VITE_GA_MEASUREMENT_ID in your .env to your GA4 measurement ID (e.g. G-XXXXXXXXXX)
 * 
 * This module:
 * - Loads the gtag.js script on init
 * - Tracks page views on route change
 * - Provides helpers for custom events throughout the app
 */

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

let initialized = false

/**
 * Initialize GA4 — call once on app start.
 */
export function initGA() {
  if (!GA_ID || initialized) return
  initialized = true

  // Load gtag.js
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag

  gtag('js', new Date())
  gtag('config', GA_ID, {
    send_page_view: false,  // We'll send page views manually on route change
  })
}

/**
 * Track a page view.
 */
export function trackPageView(path, title) {
  if (!GA_ID || !window.gtag) return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
  })
}

/**
 * Track a custom event.
 */
export function trackEvent(eventName, params = {}) {
  if (!GA_ID || !window.gtag) return
  window.gtag('event', eventName, params)
}

// ─── Pre-built event helpers ───────────────────────

export function trackProductView(slug, productName, theme, price) {
  trackEvent('view_item', {
    item_id: slug,
    item_name: productName,
    item_category: theme,
    price,
    currency: 'USD',
  })
}

export function trackSearch(query, resultCount) {
  trackEvent('search', {
    search_term: query,
    results_count: resultCount,
  })
}

export function trackFilterApplied(filterName, filterValue) {
  trackEvent('filter_applied', {
    filter_name: filterName,
    filter_value: filterValue,
  })
}

export function trackFavoriteToggle(slug, isFavorited) {
  trackEvent(isFavorited ? 'add_to_wishlist' : 'remove_from_wishlist', {
    item_id: slug,
  })
}

export function trackCompareAdd(slug) {
  trackEvent('add_to_compare', { item_id: slug })
}

export function trackExternalLink(url, context) {
  trackEvent('outbound_click', {
    link_url: url,
    link_context: context,
  })
}

export function trackChartCreated(metric, groupBy, agg, chartType) {
  trackEvent('chart_created', {
    chart_metric: metric,
    chart_group_by: groupBy,
    chart_aggregation: agg,
    chart_type: chartType,
  })
}

export function trackDashboardSaved(name, chartCount) {
  trackEvent('dashboard_saved', {
    dashboard_name: name,
    chart_count: chartCount,
  })
}

export function trackAlertCreated(alertType) {
  trackEvent('alert_created', { alert_type: alertType })
}

export function trackTabSwitch(tabName, page) {
  trackEvent('tab_switch', {
    tab_name: tabName,
    page_name: page,
  })
}

export function trackSignIn(method) {
  trackEvent('login', { method })
}

export function trackSignUp(method) {
  trackEvent('sign_up', { method })
}