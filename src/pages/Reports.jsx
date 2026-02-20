import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, Trash2, Mail, Clock, Eye, Send, Zap, TrendingDown, ShoppingBag, Sparkles, AlertTriangle, Tag, BarChart3, X, Check } from 'lucide-react'
import { useReportProfiles } from '../hooks/usePipeline'
import { useAuth } from '../hooks/useAuth'
import { useThemeList } from '../hooks/useData'

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

export default function Reports() {
  const { user } = useAuth()
  const hook = useReportProfiles()
  const [tab, setTab] = useState('profiles')
  const [showForm, setShowForm] = useState(false)
  const [previewHtml, setPreviewHtml] = useState(null)

  const handlePreview = async (id) => {
    const r = await hook.previewReport(id)
    setPreviewHtml(r?.html || '<div style="padding:40px;text-align:center;color:#888;font-family:sans-serif">Preview unavailable — pipeline server offline</div>')
    setTab('preview')
  }

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl tracking-tight mb-1"><FileText size={24} className="inline text-lego-yellow mr-1.5" /> Reports</h1>
          <p className="text-gray-500 text-xs">Automated market intelligence digests delivered to your inbox{hook.apiAvailable === false && <span className="ml-2 text-lego-yellow">· Pipeline offline</span>}</p>
        </div>
        <div className="flex gap-1 mb-6 glass rounded-xl p-1 w-fit flex-wrap">
          {[{ id: 'profiles', label: 'My Reports', icon: FileText }, { id: 'history', label: 'History', icon: Clock }, { id: 'preview', label: 'Preview', icon: Eye }].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === id ? 'bg-lego-red text-white shadow-lg shadow-lego-red/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Icon size={14} />{label}</button>
          ))}
        </div>

        {tab === 'profiles' && <ProfilesView user={user} hook={hook} showForm={showForm} setShowForm={setShowForm} onPreview={handlePreview} />}
        {tab === 'history' && <HistoryView history={hook.history} loading={hook.loading} />}
        {tab === 'preview' && (
          previewHtml ? (
            <div className="glass rounded-xl overflow-hidden">
              <div className="p-3 border-b border-lego-border/50 flex items-center justify-between"><span className="text-xs text-gray-400 font-mono">Report Preview</span><button onClick={() => setPreviewHtml(null)} className="text-gray-500 hover:text-white"><X size={14} /></button></div>
              <iframe srcDoc={previewHtml} className="w-full bg-white" style={{ minHeight: '600px', border: 'none' }} title="Report Preview" />
            </div>
          ) : (
            <div className="glass rounded-xl p-10 text-center"><Eye size={36} className="text-gray-600 mx-auto mb-3" /><h3 className="font-display font-semibold text-sm text-gray-300 mb-1">No preview loaded</h3><p className="text-[11px] text-gray-500">Click the eye icon on a report to preview it.</p></div>
          )
        )}
      </div>
    </main>
  )
}

function ProfilesView({ user, hook, showForm, setShowForm, onPreview }) {
  const { profiles, loading, createProfile, deleteProfile, generateReport } = hook
  const [confirmDel, setConfirmDel] = useState(null)
  const [sending, setSending] = useState(null)
  const themes = useThemeList()

  if (!user) return (<div className="glass rounded-xl p-10 text-center"><FileText size={40} className="text-gray-600 mx-auto mb-4" /><h3 className="font-display font-semibold text-lg text-gray-300 mb-2">Sign in to create reports</h3><p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">Configure automated market intelligence reports delivered daily or weekly.</p><Link to="/auth" className="inline-flex items-center gap-2 px-5 py-2.5 bg-lego-red hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">Sign In</Link></div>)

  const handleSend = async (id) => { setSending(id); await generateReport(id); setTimeout(() => setSending(null), 2000) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="font-display font-semibold text-sm text-gray-300">Report Profiles</h2><p className="text-[10px] text-gray-500 mt-0.5">{profiles.length} configured</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-lego-yellow hover:bg-yellow-600 text-black text-xs font-semibold rounded-lg transition-colors"><Plus size={14} /> New Report</button>
      </div>

      {showForm && <NewReportForm themes={themes} email={user.email} onCreate={async (p) => { await createProfile(p); setShowForm(false) }} onCancel={() => setShowForm(false)} />}

      {/* Presets */}
      {profiles.length === 0 && !showForm && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider">Quick Start Templates</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {PRESETS.map((p, i) => (
              <button key={i} onClick={async () => { await createProfile({ ...p, email: user.email, active: true }); }}
                className="glass rounded-xl p-4 text-left hover:bg-white/[0.03] transition-colors group border border-transparent hover:border-lego-yellow/20">
                <div className="flex items-center gap-2 mb-2"><Zap size={14} className="text-lego-yellow" /><span className="text-xs font-semibold text-white group-hover:text-lego-yellow transition-colors">{p.name}</span></div>
                <div className="flex gap-1 flex-wrap mb-2">{p.sections.map(s => { const info = SECTIONS.find(x => x.key === s); return info ? <span key={s} className={`px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-semibold ${info.color}`}>{info.label}</span> : null })}</div>
                <div className="text-[10px] text-gray-500">{p.freq} · {p.length}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton /> : profiles.map((prof) => (
        <div key={prof.id} className="glass rounded-xl p-4 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-lego-yellow/10 text-lego-yellow shrink-0 mt-0.5"><FileText size={16} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-semibold mb-1">{prof.name}</div>
              <div className="flex gap-1 flex-wrap mb-1.5">{(prof.sections || []).map(s => { const info = SECTIONS.find(x => x.key === s); return info ? <span key={s} className={`px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-semibold ${info.color}`}>{info.label}</span> : null })}</div>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><Mail size={10} />{prof.email}</span>
                <span>{prof.freq || prof.frequency || 'daily'}</span>
                <span>{prof.length || 'standard'}</span>
                {prof.theme_filter && <span>Theme: {prof.theme_filter}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onPreview(prof.id)} className="p-1.5 text-gray-600 hover:text-lego-blue rounded-lg transition-colors" title="Preview"><Eye size={13} /></button>
              <button onClick={() => handleSend(prof.id)} disabled={sending === prof.id} className="p-1.5 text-gray-600 hover:text-lego-green rounded-lg transition-colors" title="Send Now">
                {sending === prof.id ? <Check size={13} className="text-green-400" /> : <Send size={13} />}
              </button>
              {confirmDel === prof.id ? (
                <><button onClick={() => { deleteProfile(prof.id); setConfirmDel(null) }} className="px-2 py-1 bg-red-600 text-white text-[10px] font-semibold rounded-md">Del</button><button onClick={() => setConfirmDel(null)} className="px-2 py-1 glass text-gray-400 text-[10px] rounded-md">No</button></>
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

function NewReportForm({ themes, email: defaultEmail, onCreate, onCancel }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState(defaultEmail)
  const [freq, setFreq] = useState('daily')
  const [length, setLength] = useState('brief')
  const [sections, setSections] = useState(['price_drops', 'new_products', 'market_stats'])
  const [themeFilter, setThemeFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggleSection = (key) => setSections(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])

  const handleCreate = async () => {
    if (!name || !email || sections.length === 0) return
    setSubmitting(true)
    await onCreate({ name, email, freq, length, sections, theme_filter: themeFilter || null, active: true })
    setSubmitting(false)
  }

  return (
    <div className="glass rounded-xl p-5 border border-lego-yellow/20">
      <div className="flex items-center gap-2 mb-4"><FileText size={16} className="text-lego-yellow" /><h3 className="font-display font-semibold text-sm">New Report Profile</h3></div>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div><label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1 block">Report Name</label><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lego-yellow" placeholder="My Daily Brief" /></div>
        <div><label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1 block">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lego-yellow" /></div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div><label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Frequency</label><div className="flex gap-2">{['daily', 'weekly'].map(f => <button key={f} onClick={() => setFreq(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${freq === f ? 'bg-lego-yellow text-black' : 'glass text-gray-400'}`}>{f}</button>)}</div></div>
        <div><label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Length</label><div className="flex gap-2">{['brief', 'standard', 'detailed'].map(l => <button key={l} onClick={() => setLength(l)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${length === l ? 'bg-lego-yellow text-black' : 'glass text-gray-400'}`}>{l}</button>)}</div></div>
        <div><label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1 block">Theme Filter <span className="text-gray-600">(optional)</span></label><select value={themeFilter} onChange={e => setThemeFilter(e.target.value)} className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-lego-yellow"><option value="">All themes</option>{themes.map(t => <option key={t.theme} value={t.theme}>{t.theme}</option>)}</select></div>
      </div>
      <div className="mb-4">
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Report Sections</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SECTIONS.map(({ key, label, icon: Icon, color }) => (
            <button key={key} onClick={() => toggleSection(key)} className={`flex items-center gap-2 p-3 rounded-lg transition-all border ${sections.includes(key) ? 'bg-lego-yellow/10 border-lego-yellow/30 text-white' : 'glass border-transparent text-gray-500 hover:text-gray-300'}`}>
              <Icon size={14} className={sections.includes(key) ? color : 'text-gray-600'} /><span className="text-[11px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-lego-border/50">
        <p className="text-[10px] text-gray-500">Reports generated and emailed on the configured schedule.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 glass text-gray-400 text-xs font-semibold rounded-lg hover:text-white">Cancel</button>
          <button onClick={handleCreate} disabled={!name || !email || sections.length === 0 || submitting} className="flex items-center gap-1.5 px-4 py-2 bg-lego-yellow hover:bg-yellow-600 text-black text-xs font-semibold rounded-lg disabled:opacity-50">
            {submitting ? <span className="animate-spin w-3 h-3 border-2 border-black/30 border-t-black rounded-full" /> : <FileText size={14} />} Create Report
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryView({ history, loading }) {
  if (loading) return <LoadingSkeleton />
  if (!history?.length) return (<div className="glass rounded-xl p-10 text-center"><Clock size={36} className="text-gray-600 mx-auto mb-3" /><h3 className="font-display font-semibold text-sm text-gray-300 mb-1">No reports generated yet</h3><p className="text-[11px] text-gray-500">Delivery history will appear here.</p></div>)
  return (
    <div className="space-y-2">
      {history.map((h, i) => (
        <div key={h.id || i} className="glass rounded-lg p-3 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-lego-yellow/10"><Mail size={14} className="text-lego-yellow" /></div>
            <div className="flex-1"><div className="text-xs text-white font-medium">{h.profile_name || h.name || 'Report'}</div><div className="text-[10px] text-gray-500">{h.status || 'sent'} · {h.email}</div></div>
            <div className="text-[10px] text-gray-600">{h.generated_at ? new Date(h.generated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function LoadingSkeleton() { return (<div className="space-y-4">{[1, 2, 3].map(i => (<div key={i} className="glass rounded-xl p-5 animate-pulse"><div className="h-4 bg-lego-surface2 rounded w-48 mb-2" /><div className="h-3 bg-lego-surface2 rounded w-32" /></div>))}</div>) }