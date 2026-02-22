/**
 * Pipeline Server API Client
 *
 * Matches the routes exposed by pipeline_server.py (port 5111 by default).
 *
 * ENV:
 *   VITE_PIPELINE_API_URL=http://localhost:5111
 *
 * Route map (verified against pipeline_server.py):
 *
 *   ── Alerts ──
 *   GET  /api/alerts?email=              → list subscriptions
 *   POST /api/alerts                     → create subscription  (body = JSON)
 *   GET  /api/alerts/delete/:id          → delete subscription
 *   GET  /api/alerts/toggle/:id?enabled= → toggle on/off
 *   GET  /api/alerts/history?limit=&email= → alert history
 *   GET  /api/alerts/stats               → alert system stats
 *   GET  /api/alerts/evaluate            → trigger evaluation
 *
 *   ── Reports ──
 *   GET  /api/reports?email=             → list profiles
 *   POST /api/reports                    → create profile  (body = JSON)
 *   GET  /api/reports/delete/:id         → delete profile
 *   GET  /api/reports/history?limit=     → report generation history
 *   GET  /api/reports/preview/:id        → preview report HTML for profile
 *   GET  /api/reports/preview?type=daily → preview generic report HTML
 *   GET  /api/reports/generate/:id       → generate report for profile
 *   GET  /api/reports/generate?type=daily→ generate generic report
 *   GET  /api/reports/stats              → report system stats
 *
 *   ── Time Series ──
 *   GET  /api/timeseries/market          → market overview daily
 *   GET  /api/timeseries/product/:slug   → per-product price history
 *
 *   ── Analytics ──
 *   GET  /api/retirement-risk?limit=     → retirement risk scores
 *   GET  /api/deals?limit=              → current deals
 *   GET  /api/new-deals?limit=          → new deals today
 *   GET  /api/theme-health              → theme health scores
 *
 *   ── Email ──
 *   GET  /api/email/stats               → email delivery breakdown
 *
 *   ── Health ──
 *   GET  /status                         → pipeline status (not /health)
 */

const API_BASE = import.meta.env.VITE_PIPELINE_API_URL || 'http://localhost:5111'

// ─── Helpers ─────────────────────────────────────────────────

async function safeJson(res) {
  const text = await res.text().catch(() => '')
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn(`Pipeline API ${res.status} at ${url}${body ? ` — ${body.slice(0, 200)}` : ''}`)
      return null
    }
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) return res.json()
    return safeJson(res)
  } catch (err) {
    const msg = err?.message || String(err)
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_CONNECTION')) {
      console.warn(`Pipeline API not available at ${url}`)
    } else {
      console.warn(`Pipeline API error at ${url}: ${msg}`)
    }
    return null
  }
}


// ─── Alerts ──────────────────────────────────────────────────

export async function getAlertSubscriptions(email) {
  const q = email ? `?email=${encodeURIComponent(email)}` : ''
  return apiFetch(`/api/alerts${q}`)
}

export async function createAlertSubscription(subscription) {
  // POST /api/alerts  (server also accepts /api/alerts/create)
  return apiFetch('/api/alerts', {
    method: 'POST',
    body: JSON.stringify(subscription),
  })
}

export async function deleteAlertSubscription(id) {
  // Server uses GET-style delete
  return apiFetch(`/api/alerts/delete/${id}`)
}

export async function toggleAlertSubscription(id, enabled = true) {
  return apiFetch(`/api/alerts/toggle/${id}?enabled=${enabled ? 'true' : 'false'}`)
}

export async function getAlertHistory(limit = 50, email) {
  const params = [`limit=${limit}`]
  if (email) params.push(`email=${encodeURIComponent(email)}`)
  return apiFetch(`/api/alerts/history?${params.join('&')}`)
}

export async function getAlertStats() {
  return apiFetch('/api/alerts/stats')
}

export async function evaluateAlerts() {
  return apiFetch('/api/alerts/evaluate')
}


// ─── Reports ─────────────────────────────────────────────────

export async function getReportProfiles(email) {
  // GET /api/reports  (server also accepts /api/reports/profiles)
  const q = email ? `?email=${encodeURIComponent(email)}` : ''
  return apiFetch(`/api/reports${q}`)
}

export async function createReportProfile(profile) {
  // POST /api/reports  (server also accepts /api/reports/create)
  return apiFetch('/api/reports', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

export async function deleteReportProfile(id) {
  return apiFetch(`/api/reports/delete/${id}`)
}

export async function getReportHistory(limit = 20) {
  return apiFetch(`/api/reports/history?limit=${limit}`)
}

export async function getReportStats() {
  return apiFetch('/api/reports/stats')
}

/**
 * Preview a report as HTML.
 * @param {number|string} profileIdOrType - profile ID (number) or type string ("daily"/"weekly")
 * @returns {Promise<{html: string}|null>}
 */
export async function previewReport(profileIdOrType) {
  const isId = typeof profileIdOrType === 'number' ||
    (typeof profileIdOrType === 'string' && /^\d+$/.test(profileIdOrType))
  const url = isId
    ? `/api/reports/preview/${profileIdOrType}`
    : `/api/reports/preview?type=${encodeURIComponent(profileIdOrType || 'daily')}`

  // This endpoint returns HTML, not JSON
  try {
    const res = await fetch(`${API_BASE}${url}`)
    if (!res.ok) return null
    const html = await res.text()
    return { html }
  } catch {
    return null
  }
}

/**
 * Generate (and optionally send) a report.
 * @param {number|string} profileIdOrType - profile ID or type string
 * @param {boolean} sendEmail - whether to actually email it
 */
export async function generateReport(profileIdOrType, sendEmail = false) {
  const isId = typeof profileIdOrType === 'number' ||
    (typeof profileIdOrType === 'string' && /^\d+$/.test(profileIdOrType))
  const url = isId
    ? `/api/reports/generate/${profileIdOrType}?send=${sendEmail}`
    : `/api/reports/generate?type=${encodeURIComponent(profileIdOrType || 'daily')}`
  return apiFetch(url)
}

export async function generateAllReports(frequency = 'daily') {
  return apiFetch(`/api/reports/generate-all?frequency=${encodeURIComponent(frequency)}`)
}


// ─── Time Series ─────────────────────────────────────────────

export async function getMarketTimeSeries() {
  return apiFetch('/api/timeseries/market')
}

export async function getProductTimeSeries(slug) {
  return apiFetch(`/api/timeseries/product/${encodeURIComponent(slug)}`)
}


// ─── Analytics ───────────────────────────────────────────────

export async function getRetirementRisk(limit = 50) {
  return apiFetch(`/api/retirement-risk?limit=${limit}`)
}

export async function getDeals(limit = 50) {
  return apiFetch(`/api/deals?limit=${limit}`)
}

export async function getNewDeals(limit = 50) {
  return apiFetch(`/api/new-deals?limit=${limit}`)
}

export async function getThemeHealth() {
  return apiFetch('/api/theme-health')
}

export async function getWeeklyPublicReport() {
  return apiFetch('/api/reports/weekly-public')
}


// ─── Email Stats ─────────────────────────────────────────────

export async function getEmailStats() {
  return apiFetch('/api/email/stats')
}


// ─── Health Check ────────────────────────────────────────────

export async function checkPipelineHealth() {
  try {
    const res = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}