import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Plus, Trash2, Mail, Clock, Send, Zap, TrendingDown,
  ShoppingBag, Sparkles, AlertTriangle, Tag, BarChart3, X, Check,
  Power, RefreshCw, Calendar, Activity, Filter, Crown, Eye, ChevronDown,
  ChevronUp, Settings, Bell, CheckCircle, Download, AlertCircle, Loader2
} from 'lucide-react'
import { useReportProfiles } from '../hooks/usePipeline'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { useThemeList } from '../hooks/useData'
import { UpgradeModal, UpgradeBanner, UsageMeter } from '../components/UpgradeModal'
import * as api from '../lib/api'

const SECTIONS = [
  { key: 'price_drops', label: 'Price Drops', icon: TrendingDown, color: 'text-green-400', dbKey: 'include_price_changes' },
  { key: 'price_increases', label: 'Price Increases', icon: TrendingDown, color: 'text-red-400', dbKey: 'include_price_changes' },
  { key: 'new_products', label: 'New Products', icon: Sparkles, color: 'text-lego-blue', dbKey: 'include_new_products' },
  { key: 'stock_alerts', label: 'Stock Changes', icon: ShoppingBag, color: 'text-orange-400', dbKey: 'include_stock_changes' },
  { key: 'on_sale', label: 'Current Sales', icon: Tag, color: 'text-lego-yellow', dbKey: 'include_new_deals' },
  { key: 'retiring', label: 'Retirement Risk', icon: AlertTriangle, color: 'text-red-400', dbKey: 'include_retirement_risk' },
  { key: 'market_stats', label: 'Market Stats', icon: BarChart3, color: 'text-purple-400', dbKey: 'include_market_stats' },
  { key: 'news', label: 'LEGO News', icon: FileText, color: 'text-blue-300', dbKey: 'include_news' },
]

const PRESETS = [
  { name: 'Weekly Market Brief', freq: 'weekly', length: 'brief', sections: ['price_drops', 'new_products', 'stock_alerts', 'market_stats'] },
  { name: 'Weekly Price Movers', freq: 'weekly', length: 'standard', sections: ['price_drops', 'price_increases', 'on_sale'] },
  { name: 'New Releases Digest', freq: 'weekly', length: 'standard', sections: ['new_products', 'market_stats'] },
]

const TABS = [
  { id: 'profiles', label: 'My Reports', icon: FileText },
  { id: 'history', label: 'History', icon: Clock },
]

// Hour options for delivery time picker
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i < 12 ? 'AM' : 'PM'
  const h = i === 0 ? 12 : i > 12 ? i - 12 : i
  return { value: i, label: `${h}:00 ${ampm}` }
})

function getLengthLabel(maxItems) {
  if (maxItems == null) return 'standard'
  const n = parseInt(maxItems)
  if (n <= 5) return 'brief'
  if (n >= 15) return 'detailed'
  return 'standard'
}

function formatDeliveryTime(hour) {
  if (hour == null) return null
  const h = parseInt(hour)
  const ampm = h < 12 ? 'AM' : 'PM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}:00 ${ampm}`
}

function getSectionsFromProfile(prof) {
  const result = []
  if (prof.include_price_changes) { result.push('price_drops'); result.push('price_increases') }
  if (prof.include_new_products) result.push('new_products')
  if (prof.include_stock_changes) result.push('stock_alerts')
  if (prof.include_new_deals) result.push('on_sale')
  if (prof.include_retirement_risk) result.push('retiring')
  if (prof.include_market_stats) result.push('market_stats')
  if (prof.include_news) result.push('news')
  return result
}


/* ─── Toast Notification ───────────────────────── */

function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-sm animate-slide-up ${
      type === 'success' ? 'bg-green-500/15 border-green-500/30 text-green-400' :
      type === 'error' ? 'bg-red-500/15 border-red-500/30 text-red-400' :
      type === 'warning' ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' :
      'bg-lego-yellow/15 border-lego-yellow/30 text-lego-yellow'
    }`}>
      {type === 'success' && <CheckCircle size={16} />}
      {type === 'error' && <AlertCircle size={16} />}
      {type === 'warning' && <Clock size={16} />}
      <span className="text-xs font-semibold">{message}</span>
      <button onClick={onDismiss} className="ml-1 opacity-60 hover:opacity-100"><X size={12} /></button>
    </div>
  )
}


export default function Reports() {
  const { user } = useAuth()
  const hook = useReportProfiles()
  const [tab, setTab] = useState('profiles')
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [previewLabel, setPreviewLabel] = useState('')
  const [toast, setToast] = useState(null)

  // Preview a specific profile — uses profile ID so backend applies settings
  const handleProfilePreview = async (profileId, profileName) => {
    setPreviewLabel(profileName || 'Report')
    setPreviewData(null)
    setTab('preview')
    try {
      const r = await api.previewReport(profileId)
      setPreviewData(
        r?.html ||
        '<div style="padding:40px;text-align:center;color:#888;font-family:sans-serif">Preview unavailable — pipeline server offline</div>'
      )
    } catch {
      setPreviewData('<div style="padding:40px;text-align:center;color:#888;font-family:sans-serif">Preview unavailable</div>')
    }
  }

  // View a historical report's HTML
  const handleViewHistoryReport = async (historyId, profileName) => {
    setPreviewLabel(profileName || 'Report')
    setPreviewData(null)
    setTab('preview')
    try {
      const r = await api.getReportHistoryHtml(historyId)
      setPreviewData(
        r?.html ||
        '<div style="padding:40px;text-align:center;color:#888;font-family:sans-serif">Report content not available</div>'
      )
    } catch {
      setPreviewData('<div style="padding:40px;text-align:center;color:#888;font-family:sans-serif">Could not load report</div>')
    }
  }

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight mb-1">
              <FileText size={24} className="inline text-lego-yellow mr-1.5" /> Reports
            </h1>
            <p className="text-gray-500 text-xs">
              Automated market intelligence digests delivered to your inbox
              {hook.apiAvailable === false && (
                <span className="ml-2 text-lego-yellow">· Pipeline offline</span>
              )}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 glass rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                (tab === id || (tab === 'preview' && id === 'profiles'))
                  ? 'bg-lego-red text-white shadow-lg shadow-lego-red/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {label}
              {id === 'profiles' && hook.profiles.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/10 rounded text-[9px]">
                  {hook.profiles.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'profiles' && <ProfilesTab user={user} hook={hook} onUpgrade={() => setShowUpgrade(true)} onPreview={handleProfilePreview} onToast={setToast} />}
        {tab === 'history' && <HistoryTab hook={hook} onViewReport={handleViewHistoryReport} />}
        {tab === 'preview' && <ReportPreviewTab html={previewData} label={previewLabel} onClose={() => { setPreviewData(null); setTab('profiles') }} />}
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="More reports" />

      {/* Global toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Slide-up animation for toast */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </main>
  )
}


/* ─── Profiles Tab ─────────────────────────────── */

function ProfilesTab({ user, hook, onUpgrade, onPreview, onToast }) {
  const { profiles, loading, createProfile, deleteProfile, generateReport } = hook
  const sub = useSubscription()
  const [showForm, setShowForm] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(null)
  // States: null | 'sending' | 'done' | 'error' | 'cooldown'
  const [sendState, setSendState] = useState({})
  const [expandedCard, setExpandedCard] = useState(null)
  const themes = useThemeList()

  if (!user) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <FileText size={40} className="text-gray-600 mx-auto mb-4" />
        <h3 className="font-display font-semibold text-lg text-gray-300 mb-2">Sign in to create reports</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">Configure automated market intelligence reports delivered daily or weekly.</p>
        <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-2.5 bg-lego-red hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">Sign In</Link>
      </div>
    )
  }

  const handleNewReport = () => {
    if (!sub.canCreateReport) {
      onUpgrade()
      return
    }
    setShowForm(!showForm)
  }

  const handleSend = async (id, name) => {
    const state = sendState[id]
    if (state === 'sending' || state === 'cooldown') return

    setSendState(prev => ({ ...prev, [id]: 'sending' }))
    try {
      const result = await api.generateReport(id, true)
      if (result?.error?.includes('rate limit') || result?.error?.includes('cooldown')) {
        setSendState(prev => ({ ...prev, [id]: 'cooldown' }))
        onToast?.({ message: 'Rate limited — please wait before sending again', type: 'warning' })
        setTimeout(() => setSendState(prev => ({ ...prev, [id]: null })), 8000)
        return
      }
      setSendState(prev => ({ ...prev, [id]: 'done' }))
      onToast?.({ message: `"${name}" sent to your email!`, type: 'success' })
      // Delay refresh so the "done" state is visible for a moment
      setTimeout(() => {
        hook.refresh()
      }, 1500)
      setTimeout(() => setSendState(prev => ({ ...prev, [id]: null })), 4000)
    } catch {
      setSendState(prev => ({ ...prev, [id]: 'error' }))
      onToast?.({ message: 'Failed to send report. Please try again.', type: 'error' })
      setTimeout(() => setSendState(prev => ({ ...prev, [id]: null })), 3000)
    }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await deleteProfile(id)
      sub.refresh()
      onToast?.({ message: 'Report deleted', type: 'success' })
    } finally {
      setDeleting(null)
      setConfirmDel(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-semibold text-sm text-gray-300">Report Profiles</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">{profiles.length} configured · Reports are generated and emailed on your chosen schedule</p>
        </div>
        <button
          onClick={handleNewReport}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-lego-yellow hover:bg-yellow-600 text-black text-xs font-semibold rounded-lg transition-colors"
        >
          <Plus size={14} /> New Report
        </button>
      </div>

      {/* Usage meter */}
      <div className="glass rounded-lg p-3">
        <UsageMeter used={sub.reportCount} max={sub.limits.maxReports} label="reports" color="bg-lego-yellow" />
        {!sub.isPro && sub.reportCount >= sub.limits.maxReports && (
          <div className="mt-2">
            <UpgradeBanner compact feature="up to 10 reports" onUpgradeClick={onUpgrade} />
          </div>
        )}
      </div>

      {showForm && (
        <NewReportForm
          themes={themes}
          email={user.email}
          isPro={sub.isPro}
          onUpgrade={onUpgrade}
          onCreate={async (p) => {
            await createProfile(p)
            setShowForm(false)
            sub.refresh()
            onToast?.({ message: `"${p.name}" created!`, type: 'success' })
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Quick start templates */}
      {profiles.length === 0 && !showForm && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider">Quick Start Templates</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {PRESETS.map((p, i) => {
              const isDaily = p.freq === 'daily'
              const locked = isDaily && !sub.isPro
              return (
                <button
                  key={i}
                  onClick={async () => {
                    if (locked) { onUpgrade(); return }
                    await createProfile({ ...p, email: user.email, active: true }); sub.refresh()
                    onToast?.({ message: `"${p.name}" created from template!`, type: 'success' })
                  }}
                  className="glass rounded-xl p-4 text-left hover:bg-white/[0.03] transition-colors group border border-transparent hover:border-lego-yellow/20 relative"
                >
                  {locked && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-lego-yellow/10 rounded-full">
                      <Crown size={9} className="text-lego-yellow" />
                      <span className="text-[8px] font-semibold text-lego-yellow">Pro</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-lego-yellow" />
                    <span className={`text-xs font-semibold transition-colors ${locked ? 'text-gray-500' : 'text-white group-hover:text-lego-yellow'}`}>{p.name}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap mb-2">
                    {p.sections.map(s => {
                      const info = SECTIONS.find(x => x.key === s)
                      return info ? <span key={s} className={`px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-semibold ${locked ? 'text-gray-600' : info.color}`}>{info.label}</span> : null
                    })}
                  </div>
                  <div className="text-[10px] text-gray-500">{p.freq} · {p.length}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Profile cards */}
      {loading ? <LoadingSkeleton /> : profiles.map(prof => {
        const isExpanded = expandedCard === prof.id
        const sections = prof.sections || getSectionsFromProfile(prof)
        const lengthLabel = getLengthLabel(prof.max_items_per_section)
        const deliveryTime = formatDeliveryTime(prof.delivery_hour)
        const themeFilter = prof.themes?.[0] || prof.theme_filter || null
        const state = sendState[prof.id]
        const lastSent = prof.last_sent_at || prof.last_generated_at
        const isDeleting = deleting === prof.id

        return (
          <div key={prof.id} className={`glass rounded-xl transition-all duration-300 ${
            isDeleting ? 'opacity-40 scale-[0.98]' :
            prof.enabled !== false && prof.active !== false ? 'hover:bg-white/[0.02]' : 'opacity-60'
          }`}>
            {/* Sending banner overlay */}
            {(state === 'sending' || state === 'done' || state === 'error') && (
              <div className={`px-4 py-2 flex items-center gap-2 border-b transition-all duration-300 ${
                state === 'sending' ? 'bg-lego-yellow/5 border-lego-yellow/20' :
                state === 'done' ? 'bg-green-500/5 border-green-500/20' :
                'bg-red-500/5 border-red-500/20'
              }`}>
                {state === 'sending' && (
                  <>
                    <span className="block animate-spin w-3.5 h-3.5 border-2 border-lego-yellow/30 border-t-lego-yellow rounded-full" />
                    <span className="text-[11px] font-semibold text-lego-yellow">Generating & sending report…</span>
                    <span className="text-[10px] text-gray-600 ml-auto">This may take a moment</span>
                  </>
                )}
                {state === 'done' && (
                  <>
                    <div className="flex items-center justify-center w-4 h-4 bg-green-500/20 rounded-full">
                      <Check size={10} className="text-green-400" />
                    </div>
                    <span className="text-[11px] font-semibold text-green-400">Report sent to your email!</span>
                    <CheckCircle size={12} className="text-green-500/40 ml-auto" />
                  </>
                )}
                {state === 'error' && (
                  <>
                    <AlertCircle size={14} className="text-red-400" />
                    <span className="text-[11px] font-semibold text-red-400">Failed to send — please try again</span>
                  </>
                )}
              </div>
            )}

            {/* Main card row */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${prof.enabled !== false && prof.active !== false ? 'bg-lego-yellow/10 text-lego-yellow' : 'bg-gray-800 text-gray-600'}`}>
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm text-white font-semibold">{prof.name}</span>
                    {(prof.enabled === false || prof.active === false) && (
                      <span className="px-1.5 py-0.5 bg-gray-800 rounded text-[8px] font-semibold text-gray-500 uppercase">Paused</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase ${
                      (prof.frequency || 'weekly') === 'daily' ? 'bg-lego-yellow/15 text-lego-yellow' : 'bg-lego-blue/15 text-lego-blue'
                    }`}>
                      {prof.frequency || 'weekly'}
                    </span>
                  </div>

                  {/* Key settings row */}
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {(Array.isArray(sections) ? sections : []).slice(0, 4).map(s => {
                      const info = SECTIONS.find(x => x.key === s)
                      return info ? <span key={s} className={`px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-semibold ${info.color}`}>{info.label}</span> : null
                    })}
                    {sections.length > 4 && (
                      <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-semibold text-gray-500">+{sections.length - 4} more</span>
                    )}
                  </div>

                  {/* Info row */}
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Mail size={10} />{prof.email}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {deliveryTime || '9:00 AM'} UTC
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      lengthLabel === 'brief' ? 'bg-green-500/10 text-green-400' :
                      lengthLabel === 'detailed' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-white/5 text-gray-400'
                    }`}>
                      {lengthLabel}
                    </span>
                    {themeFilter && (
                      <span className="flex items-center gap-1"><Filter size={10} />{themeFilter}</span>
                    )}
                    {lastSent && (
                      <span className="text-gray-600">
                        Last sent {new Date(lastSent).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onPreview(prof.id, prof.name)}
                    className="p-1.5 text-gray-600 hover:text-lego-blue rounded-lg transition-colors"
                    title="Preview Report"
                  >
                    <Eye size={13} />
                  </button>

                  {/* Send button with clear states */}
                  <button
                    onClick={() => handleSend(prof.id, prof.name)}
                    disabled={state === 'sending' || state === 'cooldown'}
                    className={`relative p-1.5 rounded-lg transition-all duration-300 ${
                      state === 'sending' ? 'text-lego-yellow cursor-wait' :
                      state === 'done' ? 'text-green-400 bg-green-500/10' :
                      state === 'error' ? 'text-red-400 bg-red-500/10' :
                      state === 'cooldown' ? 'text-orange-400 cursor-not-allowed opacity-50' :
                      'text-gray-600 hover:text-lego-green hover:bg-lego-green/5'
                    }`}
                    title={
                      state === 'sending' ? 'Sending…' :
                      state === 'done' ? 'Sent!' :
                      state === 'error' ? 'Send failed' :
                      state === 'cooldown' ? 'Rate limited — try again later' :
                      'Send Now'
                    }
                  >
                    {state === 'sending' ? (
                      <span className="block animate-spin w-3.5 h-3.5 border-2 border-lego-yellow/30 border-t-lego-yellow rounded-full" />
                    ) : state === 'done' ? (
                      <Check size={13} className="animate-scale-in" />
                    ) : state === 'error' ? (
                      <AlertCircle size={13} />
                    ) : state === 'cooldown' ? (
                      <Clock size={13} />
                    ) : (
                      <Send size={13} />
                    )}
                  </button>

                  <button
                    onClick={() => setExpandedCard(isExpanded ? null : prof.id)}
                    className="p-1.5 text-gray-600 hover:text-gray-300 rounded-lg transition-colors"
                    title="Details"
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {confirmDel === prof.id ? (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        onClick={() => handleDelete(prof.id)}
                        disabled={isDeleting}
                        className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-[10px] font-semibold rounded-md disabled:opacity-50"
                      >
                        {isDeleting ? <span className="animate-spin w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full" /> : null}
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                      <button onClick={() => setConfirmDel(null)} disabled={isDeleting} className="px-2 py-1 glass text-gray-400 text-[10px] rounded-md disabled:opacity-50">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDel(prof.id)} className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={13} /></button>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0 border-t border-lego-border/30">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                  <DetailItem icon={Settings} label="Length" value={`${lengthLabel} (${prof.max_items_per_section || 10} items/section)`} />
                  <DetailItem icon={Clock} label="Delivery" value={`${prof.frequency || 'weekly'} at ${deliveryTime || '9:00 AM'} UTC`} />
                  <DetailItem icon={Filter} label="Theme" value={themeFilter || 'All themes'} />
                  <DetailItem icon={Bell} label="Status" value={prof.enabled !== false && prof.active !== false ? 'Active' : 'Paused'} />
                </div>
                <div className="mt-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-600 block mb-1.5">Included Sections</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {SECTIONS.map(({ key, label, icon: Icon, color }) => {
                      const included = sections.includes(key)
                      return (
                        <span key={key} className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold ${
                          included ? `bg-white/5 ${color}` : 'bg-white/[0.02] text-gray-700 line-through'
                        }`}>
                          <Icon size={10} />
                          {label}
                        </span>
                      )
                    })}
                  </div>
                </div>
                {prof.created_at && (
                  <p className="text-[9px] text-gray-600 mt-3">
                    Created {new Date(prof.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Scale-in animation for checkmark */}
      <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.3); }
          50% { transform: scale(1.2); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.35s ease-out; }
      `}</style>
    </div>
  )
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} className="text-gray-600 shrink-0" />
      <div>
        <span className="text-[9px] text-gray-600 block">{label}</span>
        <span className="text-[11px] text-gray-300">{value}</span>
      </div>
    </div>
  )
}


/* ─── New Report Form ──────────────────────────── */

function NewReportForm({ themes, email: defaultEmail, onCreate, onCancel, isPro, onUpgrade }) {
  const [name, setName] = useState(isPro ? 'My Daily Brief' : 'My Weekly Brief')
  const [freq, setFreq] = useState(isPro ? 'daily' : 'weekly')
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false)
  const [length, setLength] = useState('brief')
  const [sections, setSections] = useState(['price_drops', 'new_products', 'market_stats'])
  const [themeFilter, setThemeFilter] = useState('')
  const [deliveryHour, setDeliveryHour] = useState(9) // 9 AM UTC default
  const [submitting, setSubmitting] = useState(false)

  const email = defaultEmail

  const toggleSection = (key) => setSections(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])

  const lengthToMaxItems = { brief: 5, standard: 10, detailed: 15 }

  const handleCreate = async () => {
    if (!name || !email || sections.length === 0) return
    setSubmitting(true)
    await onCreate({
      name,
      email,
      frequency: freq,
      max_items: lengthToMaxItems[length] || 10,
      sections,
      themes: themeFilter ? [themeFilter] : null,
      delivery_hour: deliveryHour,
      active: true,
    })
    setSubmitting(false)
  }

  return (
    <div className="glass rounded-xl p-5 border border-lego-yellow/20">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={16} className="text-lego-yellow" />
        <h3 className="font-display font-semibold text-sm">New Report Profile</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1 block">Report Name</label>
          <input value={name} onChange={e => { setName(e.target.value); setNameManuallyEdited(true) }} className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lego-yellow" placeholder="My Weekly Brief" />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1 block">Email</label>
          <div className="relative">
            <input type="email" value={email} disabled className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed" />
          </div>
          <p className="text-[9px] text-gray-600 mt-1">Reports are sent to your registered email only.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Frequency</label>
          <div className="flex gap-2 items-center">
            {['daily', 'weekly'].map(f => (
              <button key={f}
                onClick={() => {
                  if (f === 'daily' && !isPro) { onUpgrade(); return }
                  setFreq(f)
                  if (!nameManuallyEdited) setName(f === 'daily' ? 'My Daily Brief' : 'My Weekly Brief')
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  freq === f ? 'bg-lego-yellow text-black' :
                  f === 'daily' && !isPro ? 'glass text-gray-600 cursor-not-allowed' :
                  'glass text-gray-400'
                }`}>
                {f}
                {f === 'daily' && !isPro && <Crown size={10} className="text-lego-yellow" />}
              </button>
            ))}
          </div>
          {!isPro && (
            <p className="text-[9px] text-gray-600 mt-1.5">
              Daily reports require{' '}
              <button onClick={onUpgrade} className="text-lego-yellow hover:underline font-semibold">Pro</button>
            </p>
          )}
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Length</label>
          <div className="flex gap-2">
            {['brief', 'standard', 'detailed'].map(l => (
              <button key={l} onClick={() => setLength(l)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${length === l ? 'bg-lego-yellow text-black' : 'glass text-gray-400'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Delivery Time <span className="text-gray-600">(UTC)</span></label>
          <select
            value={deliveryHour}
            onChange={e => setDeliveryHour(parseInt(e.target.value))}
            className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-lego-yellow"
          >
            {HOUR_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1 block">Theme Filter <span className="text-gray-600">(optional)</span></label>
          <select value={themeFilter} onChange={e => setThemeFilter(e.target.value)} className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-lego-yellow">
            <option value="">All themes</option>
            {themes.map(t => <option key={t.theme} value={t.theme}>{t.theme}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-4">
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Report Sections</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SECTIONS.map(({ key, label, icon: Icon, color }) => (
            <button key={key} onClick={() => toggleSection(key)}
              className={`flex items-center gap-2 p-3 rounded-lg transition-all border ${sections.includes(key) ? 'bg-lego-yellow/10 border-lego-yellow/30 text-white' : 'glass border-transparent text-gray-500 hover:text-gray-300'}`}>
              <Icon size={14} className={sections.includes(key) ? color : 'text-gray-600'} />
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-lego-border/50">
        <p className="text-[10px] text-gray-500">Reports generated and emailed at {formatDeliveryTime(deliveryHour)} UTC {freq}.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={submitting} className="px-4 py-2 glass text-gray-400 text-xs font-semibold rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={handleCreate} disabled={!name || !email || sections.length === 0 || submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-lego-yellow hover:bg-yellow-600 text-black text-xs font-semibold rounded-lg disabled:opacity-50 transition-all">
            {submitting ? (
              <>
                <span className="animate-spin w-3 h-3 border-2 border-black/30 border-t-black rounded-full" />
                Creating…
              </>
            ) : (
              <>
                <FileText size={14} />
                Create Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


/* ─── History Tab ──────────────────────────────── */

function HistoryTab({ hook, onViewReport }) {
  const { history, loading } = hook
  const [filterStatus, setFilterStatus] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await hook.refresh()
    // Minimum visible spinner time
    setTimeout(() => setRefreshing(false), 600)
  }

  if (loading) return <LoadingSkeleton />

  if (!history?.length) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <Clock size={36} className="text-gray-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">No reports generated yet</h3>
        <p className="text-[11px] text-gray-500">Delivery history will appear here. Reports you receive via email can be viewed again.</p>
      </div>
    )
  }

  const statusCounts = history.reduce((acc, h) => {
    const s = h.status || (h.email_sent ? 'sent' : h.error ? 'error' : 'generated')
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const getStatus = (h) => h.status || (h.email_sent ? 'sent' : h.error ? 'error' : 'generated')
  const filtered = filterStatus === 'all' ? history : history.filter(h => getStatus(h) === filterStatus)

  return (
    <div className="space-y-4">
      {/* Filter + refresh bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...Object.keys(statusCounts)].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                filterStatus === s
                  ? 'bg-lego-yellow/15 text-lego-yellow border border-lego-yellow/30'
                  : 'glass text-gray-500 hover:text-gray-300'
              }`}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1 opacity-60">{s === 'all' ? history.length : statusCounts[s]}</span>
            </button>
          ))}
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-1 px-2.5 py-1 glass text-gray-500 hover:text-white text-[10px] font-semibold rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* History entries */}
      <div className="space-y-2">
        {filtered.map((h, i) => {
          const status = getStatus(h)
          const statusColor = status === 'error' ? 'text-red-400' : status === 'sent' ? 'text-green-400' : 'text-orange-400'
          const hasHtml = h.has_html !== false // assume viewable unless explicitly false
          return (
            <div
              key={h.id || i}
              onClick={() => hasHtml && h.id && onViewReport(h.id, h.profile_name || h.name)}
              className={`glass rounded-lg p-3 transition-colors group ${
                hasHtml && h.id ? 'hover:bg-white/[0.03] cursor-pointer hover:border-lego-yellow/20 border border-transparent' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-lego-yellow/10"><Mail size={14} className="text-lego-yellow" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white font-medium">{h.profile_name || h.name || 'Report'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase bg-white/5 ${statusColor}`}>{status}</span>
                    {h.item_count != null && (
                      <span className="text-[8px] text-gray-600">{h.item_count} items</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {h.email}{h.report_type && <span className="ml-2">· {h.report_type}</span>}
                    {h.sections_included && Array.isArray(h.sections_included) && (
                      <span className="ml-2">· {h.sections_included.length} sections</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">
                    {h.generated_at ? new Date(h.generated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                  </span>
                  {hasHtml && h.id && (
                    <Eye size={12} className="text-gray-700 group-hover:text-lego-yellow transition-colors" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


/* ─── Stats / Dashboard Tab ────────────────────── */

function StatsTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await api.getReportStats()
      setStats(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingSkeleton />

  if (!stats) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <Activity size={36} className="text-gray-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">Dashboard unavailable</h3>
        <p className="text-[11px] text-gray-500">Pipeline server is offline or stats endpoint not configured.</p>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Profiles', value: stats.total_profiles ?? stats.profiles_count ?? '-', icon: FileText, color: 'text-lego-yellow', bg: 'bg-lego-yellow/10' },
    { label: 'Active Profiles', value: stats.active_profiles ?? stats.active_count ?? '-', icon: Power, color: 'text-lego-green', bg: 'bg-lego-green/10' },
    { label: 'Reports Sent', value: stats.total_reports_sent ?? stats.reports_sent ?? stats.total_reports_generated ?? '-', icon: Send, color: 'text-lego-blue', bg: 'bg-lego-blue/10' },
    { label: 'Last Generated', value: stats.last_generated ? new Date(stats.last_generated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-', icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${bg}`}><Icon size={14} className={color} /></div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{label}</span>
            </div>
            <div className={`text-xl font-display font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {(stats.daily_count != null || stats.weekly_count != null) && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider mb-3">Schedule Breakdown</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <FrequencyBar label="Daily" count={stats.daily_count ?? 0} total={stats.total_profiles ?? 1} color="bg-lego-yellow" />
            <FrequencyBar label="Weekly" count={stats.weekly_count ?? 0} total={stats.total_profiles ?? 1} color="bg-lego-blue" />
          </div>
        </div>
      )}

      {stats.recent_reports && stats.recent_reports.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {stats.recent_reports.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-lego-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-gray-600" />
                  <span className="text-xs text-gray-300">{r.profile_name || r.name}</span>
                </div>
                <span className="text-[10px] text-gray-600">
                  {r.generated_at ? new Date(r.generated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FrequencyBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-300 font-semibold">{label}</span>
        <span className="text-[10px] text-gray-500">{count} profile{count !== 1 ? 's' : ''}</span>
      </div>
      <div className="h-2 bg-lego-surface2 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}


/* ─── Report Preview Tab (used for both profile preview & history view) ─── */

function ReportPreviewTab({ html, label, onClose }) {
  const [downloading, setDownloading] = useState(null) // null | 'png' | 'pdf'
   const [showDlMenu, setShowDlMenu] = useState(false)

   const handleDownload = async (format) => {
     setShowDlMenu(false)
     setDownloading(format)
     try {
       const iframe = document.querySelector('iframe[title="Report Preview"]')
       const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
       const slug = label.replace(/\s+/g, '_')
       const { toPng } = await import('html-to-image')
       const dataUrl = await toPng(iframeDoc.body, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
       })
       if (format === 'png') {
         const a = document.createElement('a')
         a.download = `${slug}_report.png`
         a.href = dataUrl
         a.click()
       } else {
         const { default: jsPDF } = await import('jspdf')
         const img = new Image()
         img.src = dataUrl
         await new Promise(r => img.onload = r)
         const w = img.naturalWidth / 2
         const h = img.naturalHeight / 2
         const pdf = new jsPDF({ unit: 'px', format: [w, h] })
         pdf.addImage(dataUrl, 'PNG', 0, 0, w, h)
         pdf.save(`${slug}_report.pdf`)
       }
     } catch (e) { console.error('Download failed', e) }
     finally { setDownloading(null) }
   }
  if (!html) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-lego-yellow rounded-full" />
          <p className="text-[11px] text-gray-500">Loading report...</p>
        </div>
      </div>
    )
  }

  if (html.includes('Preview unavailable') || html.includes('Pipeline offline') || html.includes('not available')) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <Eye size={36} className="text-gray-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">Report unavailable</h3>
        <p className="text-[11px] text-gray-500">The report content could not be loaded. The pipeline server may be offline.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 glass text-gray-400 text-xs font-semibold rounded-lg hover:text-white">Back to Reports</button>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-3 border-b border-lego-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">{label}</span>
          <span className="px-2 py-0.5 bg-lego-yellow/15 text-lego-yellow text-[9px] font-bold rounded-full uppercase">Preview</span>
        </div>
        <div className="relative">
          <div className="flex items-center rounded-lg overflow-hidden border border-lego-yellow/20 bg-lego-yellow/10">
            <button
              onClick={() => handleDownload('png')}
              disabled={!!downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-lego-yellow/10 text-lego-yellow text-[10px] font-semibold transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <span className="animate-spin w-3 h-3 border-2 border-lego-yellow/30 border-t-lego-yellow rounded-full" />
              ) : (
                <Download size={11} />
              )}
              {downloading ? `Saving ${downloading.toUpperCase()}…` : 'Save PNG'}
            </button>
            <div className="w-px self-stretch bg-lego-yellow/20" />
            <button
              onClick={() => setShowDlMenu(v => !v)}
              disabled={!!downloading}
              className="px-2 py-1.5 hover:bg-lego-yellow/10 text-lego-yellow transition-colors disabled:opacity-50"
            >
              <ChevronDown size={11} />
            </button>
          </div>

          {showDlMenu && (
            <div className="absolute right-0 top-full mt-1 glass border border-lego-border/50 rounded-lg overflow-hidden z-10 min-w-[120px] shadow-xl">
              <button onClick={() => handleDownload('png')} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-gray-300 hover:bg-white/5 hover:text-lego-yellow transition-colors">
                <Download size={11} /> Save as PNG
              </button>
              <button onClick={() => handleDownload('pdf')} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-gray-300 hover:bg-white/5 hover:text-lego-yellow transition-colors border-t border-lego-border/30">
                <FileText size={11} /> Save as PDF
              </button>
            </div>
          )}
        </div>
      </div>
      <iframe srcDoc={html} className="w-full bg-white" style={{ minHeight: '700px', border: 'none' }} title="Report Preview" />
      <div className="p-3 border-t border-lego-border/50 bg-white/[0.02]">
        <p className="text-[10px] text-gray-500 text-center">
          This preview uses your configured sections, theme filter, and length settings with the latest available data.
        </p>
      </div>
    </div>
  )
}


/* ─── Loading Skeleton ─────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass rounded-xl p-5 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-lego-surface2 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-lego-surface2 rounded w-48 mb-2" />
              <div className="h-3 bg-lego-surface2 rounded w-32 mb-2" />
              <div className="flex gap-2">
                <div className="h-3 bg-lego-surface2 rounded w-16" />
                <div className="h-3 bg-lego-surface2 rounded w-20" />
                <div className="h-3 bg-lego-surface2 rounded w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}