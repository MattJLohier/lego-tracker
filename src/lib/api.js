/**
 * Pipeline Server API Client
 * 
 * Connects to Steve's backend endpoints on the pipeline server.
 * Set VITE_PIPELINE_API_URL in .env (defaults to http://localhost:8000)
 */

const API_BASE = import.meta.env.VITE_PIPELINE_API_URL || 'http://localhost:8000'

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`API ${res.status}: ${text}`)
    }
    return res.json()
  } catch (err) {
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      console.warn(`Pipeline API not available at ${url}`)
      return null
    }
    throw err
  }
}

// ─── Alert Subscriptions ───────────────────────────

export async function getAlertSubscriptions() {
  return apiFetch('/api/alerts/subscriptions')
}

export async function createAlertSubscription(subscription) {
  return apiFetch('/api/alerts/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subscription),
  })
}

export async function deleteAlertSubscription(id) {
  return apiFetch(`/api/alerts/subscriptions/${id}`, { method: 'DELETE' })
}

export async function getAlertHistory(limit = 50) {
  return apiFetch(`/api/alerts/history?limit=${limit}`)
}

export async function evaluateAlerts() {
  return apiFetch('/api/alerts/evaluate', { method: 'POST' })
}

// ─── Report Profiles ───────────────────────────────

export async function getReportProfiles() {
  return apiFetch('/api/reports/profiles')
}

export async function createReportProfile(profile) {
  return apiFetch('/api/reports/profiles', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

export async function deleteReportProfile(id) {
  return apiFetch(`/api/reports/profiles/${id}`, { method: 'DELETE' })
}

export async function getReportHistory(limit = 20) {
  return apiFetch(`/api/reports/history?limit=${limit}`)
}

export async function previewReport(profileId) {
  return apiFetch(`/api/reports/preview/${profileId}`)
}

export async function generateReport(profileId) {
  return apiFetch(`/api/reports/generate/${profileId}`, { method: 'POST' })
}

// ─── Time Series ───────────────────────────────────

export async function getMarketTimeSeries() {
  return apiFetch('/api/timeseries/market')
}

export async function getProductTimeSeries(slug) {
  return apiFetch(`/api/timeseries/product/${slug}`)
}

// ─── Analytics Views ───────────────────────────────

export async function getRetirementRisk(limit = 50) {
  return apiFetch(`/api/analytics/retirement-risk?limit=${limit}`)
}

export async function getDeals(limit = 50) {
  return apiFetch(`/api/analytics/deals?limit=${limit}`)
}

export async function getThemeHealth() {
  return apiFetch('/api/analytics/theme-health')
}

// ─── Email Stats ───────────────────────────────────

export async function getEmailStats() {
  return apiFetch('/api/email/stats')
}

// ─── Health Check ──────────────────────────────────

export async function checkPipelineHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}