import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Plus, Trash2, Mail, Clock, Eye, Send, Zap, TrendingDown,
  ShoppingBag, Sparkles, AlertTriangle, Tag, BarChart3, X, Check,
  Power, RefreshCw, Calendar, Activity, PlayCircle, Filter
} from 'lucide-react'
import { useReportProfiles } from '../hooks/usePipeline'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { useThemeList } from '../hooks/useData'
import { UpgradeModal, UpgradeBanner, UsageMeter } from '../components/UpgradeModal'
import * as api from '../lib/api'

const SECTIONS = [
  { key: 'price_drops', label: 'Price Drops', icon: TrendingDown, color: 'text-green-400' },
  { key: 'price_increases', label: 'Price Increases', icon: TrendingDown, color: 'text-red-400' },
  { key: 'new_products', label: 'New Products', icon: Sparkles, color: 'text-lego-blue' },
  { key: 'stock_alerts', label: 'Stock Changes', icon: ShoppingBag, color: 'text-orange-400' },
  { key: 'on_sale', label: 'Current Sales', icon: Tag, color: 'text-lego-yellow' },
  { key: 'retiring', label: 'Retirement Risk', icon: AlertTriangle, color: 'text-red-400' },
  { key: 'market_stats', label: 'Market Stats', icon: BarChart3, color: 'text-purple-400' },
]

const PRESETS = [
  { name: 'Daily LEGO Market Brief', freq: 'daily', length: 'brief', sections: ['price_drops', 'new_products', 'stock_alerts', 'market_stats'] },
  { name: 'Weekly Price Movers', freq: 'weekly', length: 'standard', sections: ['price_drops', 'price_increases', 'on_sale'] },
  { name: 'New Releases Digest', freq: 'daily', length: 'standard', sections: ['new_products', 'market_stats'] },
]

const TABS = [
  { id: 'profiles', label: 'My Reports', icon: FileText },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'stats', label: 'Dashboard', icon: Activity },
  { id: 'preview', label: 'Preview', icon: Eye },
]

export default function Reports() {
  const { user } = useAuth()
  const hook = useReportProfiles()
  const [tab, setTab] = useState('profiles')
  const [previewHtml, setPreviewHtml] = useState(null)
  const [previewLabel, setPreviewLabel] = useState('Report Preview')
  const [showUpgrade, setShowUpgrade] = useState(false)

  const handlePreview = async (idOrType, label) => {
    setPreviewHtml(null)
    setPreviewLabel(label || 'Report Preview')
    setTab('preview')
    const r = await api.previewReport(idOrType)
    setPreviewHtml(
      r?.html ||
      '<div style="padding:40px;text-align:center;color:#888;font-family:sans-serif">Preview unavailable — pipeline server offline</div>'
    )
  }

  const handleQuickPreview = async (type) => {
    const label = type === 'daily' ? 'Daily Report Preview' : 'Weekly Report Preview'
    await handlePreview(type, label)
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
          {hook.apiAvailable && (
            <div className="flex gap-2">
              <button
                onClick={() => handleQuickPreview('daily')}
                className="flex items-center gap-1.5 px-3 py-1.5 glass text-gray-400 hover:text-lego-yellow hover:border-lego-yellow/20 text-[11px] font-semibold rounded-lg transition-all"
              >
                <Eye size={12} /> Preview Daily
              </button>
              <button
                onClick={() => handleQuickPreview('weekly')}
                className="flex items-center gap-1.5 px-3 py-1.5 glass text-gray-400 hover:text-lego-yellow hover:border-lego-yellow/20 text-[11px] font-semibold rounded-lg transition-all"
              >
                <Eye size={12} /> Preview Weekly
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 glass rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id)
                if (id === 'preview' && !previewHtml) {
                  handleQuickPreview('daily')
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === id
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

        {tab === 'profiles' && <ProfilesTab user={user} hook={hook} onPreview={handlePreview} onUpgrade={() => setShowUpgrade(true)} />}
        {tab === 'history' && <HistoryTab hook={hook} onPreview={handlePreview} />}
        {tab === 'stats' && <StatsTab />}
        {tab === 'preview' && <PreviewTab html={previewHtml} label={previewLabel} onClose={() => setPreviewHtml(null)} />}
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="More reports" />
    </main>
  )
}


/* ─── Profiles Tab ─────────────────────────────── */

function ProfilesTab({ user, hook, onPreview, onUpgrade }) {
  const { profiles, loading, createProfile, deleteProfile, generateReport } = hook
  const sub = useSubscription()
  const [showForm, setShowForm] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [sending, setSending] = useState(null)
  const [generatingAll, setGeneratingAll] = useState(false)
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

  const handleSend = async (id) => {
    setSending(id)
    await generateReport(id)
    setTimeout(() => setSending(null), 2000)
  }

  const handleGenerateAll = async (frequency) => {
    setGeneratingAll(true)
    await api.generateAllReports(frequency)
    await hook.refresh()
    setTimeout(() => setGeneratingAll(false), 1500)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-semibold text-sm text-gray-300">Report Profiles</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">{profiles.length} configured</p>
        </div>
        <div className="flex items-center gap-2">
          {profiles.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleGenerateAll('daily')}
                disabled={generatingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 glass text-gray-400 hover:text-lego-green hover:border-lego-green/20 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-50"
                title="Generate all daily reports now"
              >
                {generatingAll
                  ? <span className="animate-spin w-3 h-3 border-2 border-gray-400/30 border-t-lego-green rounded-full" />
                  : <PlayCircle size={13} />}
                Run Daily
              </button>
              <button
                onClick={() => handleGenerateAll('weekly')}
                disabled={generatingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 glass text-gray-400 hover:text-lego-blue hover:border-lego-blue/20 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-50"
                title="Generate all weekly reports now"
              >
                {generatingAll
                  ? <span className="animate-spin w-3 h-3 border-2 border-gray-400/30 border-t-lego-blue rounded-full" />
                  : <PlayCircle size={13} />}
                Run Weekly
              </button>
            </div>
          )}
          <button
            onClick={handleNewReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-lego-yellow hover:bg-yellow-600 text-black text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus size={14} /> New Report
          </button>
        </div>
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
          onCreate={async (p) => { await createProfile(p); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Quick start templates */}
      {profiles.length === 0 && !showForm && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider">Quick Start Templates</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={async () => { await createProfile({ ...p, email: user.email, active: true }) }}
                className="glass rounded-xl p-4 text-left hover:bg-white/[0.03] transition-colors group border border-transparent hover:border-lego-yellow/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} className="text-lego-yellow" />
                  <span className="text-xs font-semibold text-white group-hover:text-lego-yellow transition-colors">{p.name}</span>
                </div>
                <div className="flex gap-1 flex-wrap mb-2">
                  {p.sections.map(s => {
                    const info = SECTIONS.find(x => x.key === s)
                    return info ? <span key={s} className={`px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-semibold ${info.color}`}>{info.label}</span> : null
                  })}
                </div>
                <div className="text-[10px] text-gray-500">{p.freq} · {p.length}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Profile cards */}
      {loading ? <LoadingSkeleton /> : profiles.map(prof => (
        <div key={prof.id} className={`glass rounded-xl p-4 transition-colors ${prof.active !== false ? 'hover:bg-white/[0.02]' : 'opacity-60'}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${prof.active !== false ? 'bg-lego-yellow/10 text-lego-yellow' : 'bg-gray-800 text-gray-600'}`}>
              <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-white font-semibold">{prof.name}</span>
                {prof.active === false && (
                  <span className="px-1.5 py-0.5 bg-gray-800 rounded text-[8px] font-semibold text-gray-500 uppercase">Paused</span>
                )}
              </div>
              <div className="flex gap-1 flex-wrap mb-1.5">
                {(prof.sections || []).map(s => {
                  const info = SECTIONS.find(x => x.key === s)
                  return info ? <span key={s} className={`px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-semibold ${info.color}`}>{info.label}</span> : null
                })}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
                <span className="flex items-center gap-1"><Mail size={10} />{prof.email}</span>
                <span className="flex items-center gap-1"><Clock size={10} />{prof.freq || prof.frequency || 'daily'}</span>
                <span>{(prof.max_items_per_section <= 5) ? 'brief' : (prof.max_items_per_section >= 15) ? 'detailed' : 'standard'}</span>
                {prof.theme_filter && <span className="flex items-center gap-1"><Filter size={10} />{prof.theme_filter}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onPreview(prof.id, prof.name)} className="p-1.5 text-gray-600 hover:text-lego-blue rounded-lg transition-colors" title="Preview"><Eye size={13} /></button>
              <button onClick={() => handleSend(prof.id)} disabled={sending === prof.id} className="p-1.5 text-gray-600 hover:text-lego-green rounded-lg transition-colors" title="Send Now">
                {sending === prof.id ? <Check size={13} className="text-green-400" /> : <Send size={13} />}
              </button>
              {confirmDel === prof.id ? (
                <>
                  <button onClick={() => { deleteProfile(prof.id); setConfirmDel(null) }} className="px-2 py-1 bg-red-600 text-white text-[10px] font-semibold rounded-md">Del</button>
                  <button onClick={() => setConfirmDel(null)} className="px-2 py-1 glass text-gray-400 text-[10px] rounded-md">No</button>
                </>
              ) : (
                <button onClick={() => setConfirmDel(prof.id)} className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={13} /></button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


/* ─── New Report Form ──────────────────────────── */

function NewReportForm({ themes, email: defaultEmail, onCreate, onCancel }) {
  const [name, setName] = useState('')
  const [freq, setFreq] = useState('daily')
  const [length, setLength] = useState('brief')
  const [sections, setSections] = useState(['price_drops', 'new_products', 'market_stats'])
  const [themeFilter, setThemeFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Email is locked to the user's registered email — no sharing
  const email = defaultEmail

  const toggleSection = (key) => setSections(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])

  const lengthToMaxItems = { brief: 5, standard: 10, detailed: 15 }

  const handleCreate = async () => {
    if (!name || !email || sections.length === 0) return
    setSubmitting(true)
    await onCreate({ name, email, frequency: freq, max_items: lengthToMaxItems[length] || 10, sections, themes: themeFilter ? [themeFilter] : null, active: true })
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
          <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lego-yellow" placeholder="My Daily Brief" />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1 block">Email</label>
          <div className="relative">
            <input type="email" value={email} disabled className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed" />
          </div>
          <p className="text-[9px] text-gray-600 mt-1">Reports are sent to your registered email only.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Frequency</label>
          <div className="flex gap-2">
            {['daily', 'weekly'].map(f => (
              <button key={f} onClick={() => setFreq(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${freq === f ? 'bg-lego-yellow text-black' : 'glass text-gray-400'}`}>{f}</button>
            ))}
          </div>
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
        <p className="text-[10px] text-gray-500">Reports generated and emailed on the configured schedule.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 glass text-gray-400 text-xs font-semibold rounded-lg hover:text-white">Cancel</button>
          <button onClick={handleCreate} disabled={!name || !email || sections.length === 0 || submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-lego-yellow hover:bg-yellow-600 text-black text-xs font-semibold rounded-lg disabled:opacity-50">
            {submitting ? <span className="animate-spin w-3 h-3 border-2 border-black/30 border-t-black rounded-full" /> : <FileText size={14} />}
            Create Report
          </button>
        </div>
      </div>
    </div>
  )
}


/* ─── History Tab ──────────────────────────────── */

function HistoryTab({ hook, onPreview }) {
  const { history, loading } = hook
  const [filterStatus, setFilterStatus] = useState('all')

  if (loading) return <LoadingSkeleton />

  if (!history?.length) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <Clock size={36} className="text-gray-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">No reports generated yet</h3>
        <p className="text-[11px] text-gray-500">Delivery history will appear here.</p>
      </div>
    )
  }

  const statusCounts = history.reduce((acc, h) => {
    const s = h.status || 'sent'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const filtered = filterStatus === 'all' ? history : history.filter(h => (h.status || 'sent') === filterStatus)

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
        <button onClick={() => hook.refresh()}
          className="flex items-center gap-1 px-2.5 py-1 glass text-gray-500 hover:text-white text-[10px] font-semibold rounded-lg transition-colors">
          <RefreshCw size={10} /> Refresh
        </button>
      </div>

      {/* History entries */}
      <div className="space-y-2">
        {filtered.map((h, i) => {
          const statusColor = h.status === 'error' ? 'text-red-400' : h.status === 'pending' ? 'text-orange-400' : 'text-green-400'
          return (
            <div key={h.id || i} className="glass rounded-lg p-3 hover:bg-white/[0.02] transition-colors group">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-lego-yellow/10"><Mail size={14} className="text-lego-yellow" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white font-medium">{h.profile_name || h.name || 'Report'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase bg-white/5 ${statusColor}`}>{h.status || 'sent'}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {h.email}{h.frequency && <span className="ml-2">· {h.frequency}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {h.profile_id && (
                    <button onClick={() => onPreview(h.profile_id, h.profile_name || 'Report')}
                      className="p-1 text-gray-600 hover:text-lego-blue rounded transition-colors opacity-0 group-hover:opacity-100" title="Preview">
                      <Eye size={12} />
                    </button>
                  )}
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">
                    {h.generated_at ? new Date(h.generated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                  </span>
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
    { label: 'Reports Sent', value: stats.total_reports_sent ?? stats.reports_sent ?? stats.total_generated ?? '-', icon: Send, color: 'text-lego-blue', bg: 'bg-lego-blue/10' },
    { label: 'Last Generated', value: stats.last_generated ? new Date(stats.last_generated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-', icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  return (
    <div className="space-y-5">
      {/* Stat cards */}
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

      {/* Frequency breakdown */}
      {(stats.daily_count != null || stats.weekly_count != null) && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider mb-3">Schedule Breakdown</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <FrequencyBar label="Daily" count={stats.daily_count ?? 0} total={stats.total_profiles ?? 1} color="bg-lego-yellow" />
            <FrequencyBar label="Weekly" count={stats.weekly_count ?? 0} total={stats.total_profiles ?? 1} color="bg-lego-blue" />
          </div>
        </div>
      )}

      {/* Recent activity */}
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

      {/* Email delivery stats */}
      {stats.email_stats && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider mb-3">Email Delivery</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(stats.email_stats).map(([key, val]) => (
              <div key={key} className="text-center">
                <div className="text-lg font-display font-bold text-white">{val}</div>
                <div className="text-[10px] text-gray-500 capitalize">{key.replace(/_/g, ' ')}</div>
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


/* ─── Preview Tab ──────────────────────────────── */

function PreviewTab({ html, label, onClose }) {
  if (!html) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-lego-yellow rounded-full" />
          <p className="text-[11px] text-gray-500">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (html.includes('Preview unavailable') || html.includes('Pipeline offline')) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <Eye size={36} className="text-gray-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">Preview unavailable</h3>
        <p className="text-[11px] text-gray-500">The pipeline server may be offline. Try again later.</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-3 border-b border-lego-border/50 flex items-center justify-between">
        <span className="text-xs text-gray-400 font-mono">{label}</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={14} /></button>
      </div>
      <iframe srcDoc={html} className="w-full bg-white" style={{ minHeight: '700px', border: 'none' }} title="Report Preview" />
    </div>
  )
}


/* ─── Loading Skeleton ─────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass rounded-xl p-5 animate-pulse">
          <div className="h-4 bg-lego-surface2 rounded w-48 mb-2" />
          <div className="h-3 bg-lego-surface2 rounded w-32" />
        </div>
      ))}
    </div>
  )
}