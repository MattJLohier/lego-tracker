import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, TrendingUp, TrendingDown, Sparkles, AlertTriangle, ShoppingBag,
  ArrowRight, Tag, Package, Flame, Clock, BarChart3, ExternalLink,
  Plus, X, Mail, Trash2, Zap, Lock, Crown
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend as RLegend, BarChart, Bar
} from 'recharts'
import { useAlerts } from '../hooks/useAlerts'
import { useAlertSubscriptions } from '../hooks/usePipeline'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { useThemeList } from '../hooks/useData'
import { getStatusDisplay } from '../lib/stockStatus'
import ProductSearchInput from '../components/ProductSearchInput'
import { UpgradeModal, UpgradeBanner, UsageMeter } from '../components/UpgradeModal'
import { supabase } from '../lib/supabase'


const CHART_COLORS = ['#E3000B', '#FFD500', '#006CB7', '#00963F', '#FF6B6B', '#a78bfa', '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#f59e0b', '#8b5cf6', '#14b8a6', '#ef4444', '#6366f1', '#22c55e']
const TOOLTIP_STYLE = { background: '#16161F', border: '1px solid #2A2A3D', borderRadius: '8px', fontSize: '11px' }

const ALERT_TYPES = [
  { key: 'price_drop', label: 'Price Drop', icon: TrendingDown, color: 'text-green-400', desc: 'Price drops below threshold' },
  { key: 'price_increase', label: 'Price Increase', icon: TrendingUp, color: 'text-red-400', desc: 'Price rises above threshold' },
  { key: 'back_in_stock', label: 'Back in Stock', icon: ShoppingBag, color: 'text-lego-blue', desc: 'Product becomes available' },
  { key: 'out_of_stock', label: 'Out of Stock', icon: AlertTriangle, color: 'text-orange-400', desc: 'Product goes out of stock' },
  { key: 'new_deal', label: 'New Sale', icon: Tag, color: 'text-lego-yellow', desc: 'Product goes on sale' },
  { key: 'sale_ended', label: 'Sale Ended', icon: X, color: 'text-gray-400', desc: 'Sale ends on product' },
  { key: 'retirement_risk', label: 'Retirement Risk', icon: Flame, color: 'text-red-400', desc: 'High retirement risk detected' },
  { key: 'new_product', label: 'New in Theme', icon: Sparkles, color: 'text-lego-blue', desc: 'New product in followed theme' },
]

const TABS = [
  { id: 'subscriptions', label: 'My Alerts', icon: Bell },
  { id: 'history', label: 'Alert History', icon: Clock },
  { id: 'overview', label: 'Market Activity', icon: BarChart3 },
  { id: 'prices', label: 'Price Swings', icon: TrendingUp },
  { id: 'status', label: 'Status Changes', icon: ShoppingBag },
  { id: 'sales', label: 'New Sales', icon: Tag },
]

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '' }
function fmtDateLong(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '' }
function fmtTime(d) { return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '' }

export default function Alerts() {
  const [activeTab, setActiveTab] = useState('subscriptions')
  const { alerts, loading: alertsLoading } = useAlerts()
  const { user } = useAuth()
  const [showUpgrade, setShowUpgrade] = useState(false)

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl tracking-tight mb-1">
            <Bell size={24} className="inline text-lego-red mr-1.5" /> Alerts &amp; Notifications
          </h1>
          <p className="text-gray-500 text-xs">
            Subscribe to price drops, restocks, and more
            {alerts?.dateRange && <span className="ml-2 text-gray-600">· Tracking {alerts.totalProducts} products</span>}
          </p>
        </div>
        <div className="flex gap-1 mb-6 glass rounded-xl p-1 w-fit flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === id ? 'bg-lego-red text-white shadow-lg shadow-lego-red/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
        {activeTab === 'subscriptions' && <SubscriptionsTab user={user} onUpgrade={() => setShowUpgrade(true)} />}
        {activeTab === 'history' && <AlertHistoryTab />}
        {activeTab === 'overview' && alerts && <OverviewTab alerts={alerts} />}
        {activeTab === 'prices' && alerts && <PriceSwingsTab swings={alerts.priceSwings} />}
        {activeTab === 'status' && alerts && <StatusTab statusChanges={alerts.statusChanges} discontinued={alerts.discontinued} statusOverTime={alerts.statusOverTime} />}
        {activeTab === 'sales' && alerts && <SalesTab sales={alerts.newSales} />}
        {!['subscriptions', 'history'].includes(activeTab) && alertsLoading && <LoadingSkeleton />}
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="More alerts" />
    </main>
  )
}

function SubscriptionsTab({ user, onUpgrade }) {
  const { subscriptions, loading, createSubscription, deleteSubscription, apiAvailable } = useAlertSubscriptions()
  const sub = useSubscription()
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [productNames, setProductNames] = useState({})
  const themes = useThemeList()

  // Resolve product names for subscriptions that only have product_code
  useEffect(() => {
    const codes = subscriptions
      .map(s => s.product_code)
      .filter(Boolean)
      .filter(code => !productNames[code])

    if (codes.length === 0) return

    const uniqueCodes = [...new Set(codes)]
    supabase
      .from('v_latest_products')
      .select('product_code, product_name, theme, slug')
      .in('product_code', uniqueCodes)
      .then(({ data }) => {
        if (data) {
          const map = { ...productNames }
          for (const row of data) {
            map[row.product_code] = {
              name: row.product_name,
              theme: row.theme,
              slug: row.slug,
            }
          }
          setProductNames(map)
        }
      })
  }, [subscriptions])

  // Not logged in at all
  if (!user) return (
    <div className="glass rounded-xl p-10 text-center">
      <Bell size={40} className="text-gray-600 mx-auto mb-4" />
      <h3 className="font-display font-semibold text-lg text-gray-300 mb-2">Sign in to create alerts</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">Get emailed when prices drop, items restock, or new products launch in the themes you care about.</p>
      <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-2.5 bg-lego-red hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">Sign In</Link>
    </div>
  )

  const handleNewAlert = () => {
    if (!sub.canCreateAlert) {
      onUpgrade()
      return
    }
    setShowForm(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-sm text-gray-300">My Alert Subscriptions</h2>
            {apiAvailable === false && <span className="px-2 py-0.5 bg-lego-yellow/10 text-lego-yellow text-[9px] font-bold rounded-full">Offline Mode</span>}
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">{subscriptions.length} active alert{subscriptions.length !== 1 ? 's' : ''} · Evaluated after each scrape</p>
        </div>
        <button onClick={handleNewAlert} className="flex items-center gap-1.5 px-3 py-1.5 bg-lego-red hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors">
          <Plus size={14} /> New Alert
        </button>
      </div>

      {/* Usage meter */}
      <div className="glass rounded-lg p-3">
        <UsageMeter used={sub.alertCount} max={sub.limits.maxAlerts} label="alerts" color="bg-lego-red" />
        {!sub.isPro && sub.alertCount >= sub.limits.maxAlerts && (
          <div className="mt-2">
            <UpgradeBanner compact feature="up to 10 alerts" onUpgradeClick={onUpgrade} />
          </div>
        )}
      </div>

      {showForm && <NewAlertForm themes={themes} userEmail={user.email} onSubmit={async (alertSub) => { await createSubscription(alertSub); setShowForm(false); sub.refresh() }} onCancel={() => setShowForm(false)} />}

      {loading ? <LoadingSkeleton /> : subscriptions.length === 0 && !showForm ? (
        <div className="glass rounded-xl p-10 text-center">
          <Zap size={36} className="text-gray-600 mx-auto mb-3" />
          <h3 className="font-display font-semibold text-sm text-gray-300 mb-1">No alerts yet</h3>
          <p className="text-[11px] text-gray-500 mb-4 max-w-sm mx-auto">Create your first alert to get notified about the sets you love.</p>
          <button onClick={handleNewAlert} className="px-4 py-2 bg-lego-red hover:bg-red-700 text-white text-xs font-semibold rounded-lg"><Plus size={14} className="inline mr-1" /> Create First Alert</button>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((s) => {
            const resolved = s.product_code ? productNames[s.product_code] : null
            const displayName = s.product_name || resolved?.name || null
            const displayTheme = s.theme_filter || resolved?.theme || null
            const displaySlug = s.slug || resolved?.slug || null

            return (
              <div key={s.id} className="glass rounded-xl p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-lego-red/10 text-lego-red shrink-0 mt-0.5"><Bell size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {(s.alert_types || s.types || []).map(type => {
                        const info = ALERT_TYPES.find(t => t.key === type)
                        return info ? <span key={type} className={`px-2 py-0.5 bg-white/5 rounded-full text-[9px] font-semibold ${info.color}`}>{info.label}</span> : null
                      })}
                    </div>
                    <div className="text-xs text-white font-medium">
                      {displayName ? (
                        displaySlug ? (
                          <Link to={`/product/${displaySlug}`} className="hover:text-lego-yellow transition-colors">
                            {displayName}
                          </Link>
                        ) : displayName
                      ) : s.product_code ? (
                        <span>Set #{s.product_code}</span>
                      ) : (
                        'All Products'
                      )}
                      {displayTheme && !displayName && <span className="text-gray-500 ml-1">in {displayTheme}</span>}
                      {displayTheme && displayName && <span className="text-gray-500 ml-1">· {displayTheme}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><Mail size={10} />{s.email}</span>
                      {s.product_code && <span className="font-mono">#{s.product_code}</span>}
                      {s.threshold_pct && <span>≥ {s.threshold_pct}%</span>}
                      {s.threshold_usd && <span>≥ ${s.threshold_usd}</span>}
                    </div>
                  </div>
                  {confirmDelete === s.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { deleteSubscription(s.id); setConfirmDelete(null) }} className="px-2 py-1 bg-red-600 text-white text-[10px] font-semibold rounded-md">Delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 glass text-gray-400 text-[10px] font-semibold rounded-md">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(s.id)} className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all shrink-0"><Trash2 size={13} /></button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NewAlertForm({ themes, userEmail, onSubmit, onCancel }) {
  // Email is LOCKED to the user's registered email — no sharing accounts
  const [targetType, setTargetType] = useState('theme')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedTheme, setSelectedTheme] = useState('')
  const [selectedTypes, setSelectedTypes] = useState(['price_drop', 'back_in_stock'])
  const [thresholdPct, setThresholdPct] = useState('')
  const [thresholdUsd, setThresholdUsd] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggleType = (key) => setSelectedTypes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])

  const handleSubmit = async () => {
    if (!userEmail || selectedTypes.length === 0) return
    setSubmitting(true)
    try {
      await onSubmit({
        email: userEmail, alert_types: selectedTypes, target_type: targetType,
        product_code: targetType === 'product' ? selectedProduct?.product_code : null,
        theme_filter: targetType === 'theme' ? selectedTheme : null,
        threshold_pct: thresholdPct ? Number(thresholdPct) : null,
        threshold_usd: thresholdUsd ? Number(thresholdUsd) : null,
        cooldown_hours: 24, active: true,
      })
    } catch (e) { console.error('Failed to create alert:', e) }
    setSubmitting(false)
  }

  return (
    <div className="glass rounded-xl p-5 border border-lego-red/20">
      <div className="flex items-center gap-2 mb-4"><Zap size={16} className="text-lego-red" /><h3 className="font-display font-semibold text-sm">Create New Alert</h3></div>

      {/* Email — locked to registered email */}
      <div className="mb-4">
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1 block">Email</label>
        <div className="relative">
          <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input type="email" value={userEmail} disabled
            className="w-full pl-9 pr-3 py-2 bg-lego-surface2 border border-lego-border rounded-lg text-sm text-gray-400 cursor-not-allowed" />
        </div>
        <p className="text-[9px] text-gray-600 mt-1">Alerts are sent to your registered email only.</p>
      </div>

      <div className="mb-4">
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">What to watch</label>
        <div className="flex gap-2 mb-3">
          {[{ key: 'all', label: 'Entire Catalog' }, { key: 'theme', label: 'Specific Theme' }, { key: 'product', label: 'Specific Product' }].map(opt => (
            <button key={opt.key} onClick={() => setTargetType(opt.key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${targetType === opt.key ? 'bg-lego-red text-white' : 'glass text-gray-400 hover:text-white'}`}>{opt.label}</button>
          ))}
        </div>
        {targetType === 'theme' && (
          <select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)} className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-lego-red">
            <option value="">Select a theme…</option>
            {themes.map(t => <option key={t.theme} value={t.theme}>{t.theme} ({t.product_count})</option>)}
          </select>
        )}
        {targetType === 'product' && (
          <ProductSearchInput
            value={selectedProduct?.product_code}
            onChange={(product) => setSelectedProduct(product)}
            onClear={() => setSelectedProduct(null)}
          />
        )}
      </div>
      <div className="mb-4">
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Alert types</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ALERT_TYPES.map(({ key, label, icon: Icon, color, desc }) => (
            <button key={key} onClick={() => toggleType(key)} className={`flex items-start gap-2 p-3 rounded-lg text-left transition-all border ${selectedTypes.includes(key) ? 'bg-lego-red/10 border-lego-red/30 text-white' : 'glass border-transparent text-gray-500 hover:text-gray-300'}`}>
              <Icon size={14} className={`mt-0.5 shrink-0 ${selectedTypes.includes(key) ? color : 'text-gray-600'}`} />
              <div><div className="text-[11px] font-semibold">{label}</div><div className="text-[9px] text-gray-500 mt-0.5 leading-tight">{desc}</div></div>
            </button>
          ))}
        </div>
      </div>
      {selectedTypes.some(t => t.includes('price')) && (
        <div className="mb-4">
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Thresholds <span className="text-gray-600">(optional)</span></label>
          <div className="flex gap-3">
            <div className="flex-1"><label className="text-[9px] text-gray-600 mb-0.5 block">% change</label><input type="number" value={thresholdPct} onChange={(e) => setThresholdPct(e.target.value)} className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lego-red" placeholder="e.g. 10" /></div>
            <div className="flex-1"><label className="text-[9px] text-gray-600 mb-0.5 block">$ amount</label><input type="number" value={thresholdUsd} onChange={(e) => setThresholdUsd(e.target.value)} className="w-full bg-lego-surface2 border border-lego-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lego-red" placeholder="e.g. 5" /></div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-lego-border/50">
        <p className="text-[10px] text-gray-500">Evaluated after each daily scrape. 24h cooldown.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 glass text-gray-400 text-xs font-semibold rounded-lg hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={selectedTypes.length === 0 || submitting || (targetType === 'product' && !selectedProduct)} className="flex items-center gap-1.5 px-4 py-2 bg-lego-red hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
            {submitting ? <span className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> : <Bell size={14} />} Create Alert
          </button>
        </div>
      </div>
    </div>
  )
}

function AlertHistoryTab() {
  const { history, loading } = useAlertSubscriptions()
  const { user } = useAuth()
  if (!user) return (<div className="glass rounded-xl p-10 text-center"><Clock size={36} className="text-gray-600 mx-auto mb-3" /><h3 className="font-display font-semibold text-sm text-gray-300 mb-1">Sign in to view history</h3><Link to="/auth" className="text-lego-red text-xs hover:underline">Sign In →</Link></div>)
  if (loading) return <LoadingSkeleton />
  if (history.length === 0) return (<div className="glass rounded-xl p-10 text-center"><Clock size={36} className="text-gray-600 mx-auto mb-3" /><h3 className="font-display font-semibold text-sm text-gray-300 mb-1">No alerts fired yet</h3><p className="text-[11px] text-gray-500">Fired alerts will appear here.</p></div>)
  return (
    <div className="space-y-2">
      {history.map((alert, i) => {
        const typeInfo = ALERT_TYPES.find(t => t.key === alert.alert_type); const TypeIcon = typeInfo?.icon || Bell
        return (
          <div key={alert.id || i} className="glass rounded-lg p-3 hover:bg-white/[0.02] transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-white/5"><TypeIcon size={14} className={typeInfo?.color || 'text-gray-400'} /></div>
              <div className="flex-1 min-w-0"><div className="text-xs text-white font-medium">{alert.product_name || alert.slug || 'Catalog Alert'}</div><div className="text-[10px] text-gray-500 mt-0.5">{typeInfo?.label || alert.alert_type}{alert.message && ` — ${alert.message}`}</div></div>
              <div className="text-[10px] text-gray-600 shrink-0">{fmtTime(alert.fired_at || alert.created_at)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OverviewTab({ alerts }) {
  const { priceSwings, newDebuts, statusChanges, discontinued, newSales, statusOverTime } = alerts
  const biggestDrop = priceSwings.filter(s => s.direction === 'down').sort((a, b) => b.absPct - a.absPct)[0]
  const biggestRise = priceSwings.filter(s => s.direction === 'up').sort((a, b) => b.absPct - a.absPct)[0]
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AlertKPI icon={<TrendingUp size={16} />} label="Price Changes" value={priceSwings.filter(s => s.direction !== 'flat').length} color="text-lego-yellow" />
        <AlertKPI icon={<Sparkles size={16} />} label="New Debuts" value={newDebuts.length} color="text-lego-blue" />
        <AlertKPI icon={<ShoppingBag size={16} />} label="Status Changes" value={statusChanges.length} color="text-purple-400" />
        <AlertKPI icon={<AlertTriangle size={16} />} label="Retiring" value={discontinued.length} color="text-red-400" />
        <AlertKPI icon={<Tag size={16} />} label="New Sales" value={newSales.length} color="text-green-400" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {biggestDrop && <HighlightCard icon={<TrendingDown size={18} />} iconBg="bg-green-500/10 text-green-400" title="Biggest Price Drop" product={biggestDrop} detail={<span className="text-green-400 font-bold">-${biggestDrop.absChange.toFixed(2)} ({biggestDrop.absPct.toFixed(1)}%)</span>} sub={`$${biggestDrop.firstPrice.toFixed(2)} → $${biggestDrop.lastPrice.toFixed(2)}`} />}
        {biggestRise && <HighlightCard icon={<TrendingUp size={18} />} iconBg="bg-red-500/10 text-red-400" title="Biggest Price Increase" product={biggestRise} detail={<span className="text-red-400 font-bold">+${biggestRise.absChange.toFixed(2)} (+{biggestRise.absPct.toFixed(1)}%)</span>} sub={`$${biggestRise.firstPrice.toFixed(2)} → $${biggestRise.lastPrice.toFixed(2)}`} />}
      </div>
      {statusOverTime.data.length > 1 && <StatusOverTimeChart statusOverTime={statusOverTime} />}
    </div>
  )
}

function PriceSwingsTab({ swings }) {
  const [filter, setFilter] = useState('all')
  const filtered = useMemo(() => { if (filter === 'drops') return swings.filter(s => s.direction === 'down'); if (filter === 'increases') return swings.filter(s => s.direction === 'up'); return swings.filter(s => s.direction !== 'flat') }, [swings, filter])
  const chartData = filtered.slice(0, 20).map(s => ({ name: (s.product_name || '').slice(0, 25), change: Number(s.changePct.toFixed(1)) }))
  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {['all', 'drops', 'increases'].map(f => (<button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-lego-red text-white' : 'glass text-gray-400 hover:text-white'}`}>{f === 'all' ? 'All Changes' : f === 'drops' ? 'Price Drops' : 'Price Increases'}</button>))}
      </div>
      {chartData.length > 0 && <ChartCard title="Top Price Swings by %"><div style={{ height: Math.max(300, chartData.length * 28) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ left: 5, right: 15 }}><CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" /><XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `${v}%`} /><YAxis type="category" dataKey="name" width={170} tick={{ fill: '#888', fontSize: 9 }} /><Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`]} /><Bar dataKey="change" fill="#FFD500" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>}
      <ChartCard title="Details" subtitle={`${filtered.length} products`}>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-lego-border">{['Product', 'Theme', 'From', 'To', 'Change'].map(h => <th key={h} className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-right first:text-left [&:nth-child(2)]:text-left">{h}</th>)}</tr></thead><tbody>
          {filtered.slice(0, 30).map(s => (<tr key={s.product_code} className="border-b border-lego-border/30 hover:bg-white/[0.02]"><td className="py-2 px-2 text-left"><Link to={`/product/${s.slug}`} className="text-white hover:text-lego-yellow font-medium">{s.product_name}</Link></td><td className="py-2 px-2 text-left text-gray-500">{s.theme}</td><td className="py-2 px-2 text-right font-mono text-gray-400">${s.firstPrice.toFixed(2)}</td><td className="py-2 px-2 text-right font-mono text-lego-yellow">${s.lastPrice.toFixed(2)}</td><td className={`py-2 px-2 text-right font-mono font-bold ${s.direction === 'down' ? 'text-green-400' : 'text-red-400'}`}>{s.direction === 'down' ? '-' : '+'}${s.absChange.toFixed(2)} ({s.absPct.toFixed(1)}%)</td></tr>))}
        </tbody></table></div>
      </ChartCard>
    </div>
  )
}

function StatusTab({ statusChanges, discontinued, statusOverTime }) {
  return (
    <div className="space-y-5">
      {statusOverTime.data.length > 1 && <StatusOverTimeChart statusOverTime={statusOverTime} />}
      {discontinued.length > 0 && <ChartCard title="Retiring / Discontinued" subtitle={`${discontinued.length} sets`}><div className="space-y-2">{discontinued.map((sc, i) => (<Link key={`${sc.product_code}-${i}`} to={`/product/${sc.slug}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors group"><AlertTriangle size={14} className="text-red-400 shrink-0" /><div className="flex-1 min-w-0"><div className="text-xs text-white font-semibold truncate group-hover:text-lego-yellow">{sc.product_name}</div><div className="text-[10px] text-gray-500">{sc.theme} · {fmtDateLong(sc.date)}</div></div><div className="flex items-center gap-2 shrink-0"><StatusBadge status={sc.fromStatus} /><ArrowRight size={12} className="text-gray-600" /><StatusBadge status={sc.toStatus} /></div></Link>))}</div></ChartCard>}
      <ChartCard title="All Status Changes" subtitle={`${statusChanges.length} transitions`}><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-lego-border">{['Date', 'Product', 'From', '', 'To', 'Price'].map((h, i) => <th key={i} className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-left">{h}</th>)}</tr></thead><tbody>
        {statusChanges.slice(0, 40).map((sc, i) => (<tr key={`${sc.product_code}-${i}`} className="border-b border-lego-border/30 hover:bg-white/[0.02]"><td className="py-2 px-2 text-gray-500">{fmtDate(sc.date)}</td><td className="py-2 px-2"><Link to={`/product/${sc.slug}`} className="text-white hover:text-lego-yellow font-medium">{sc.product_name}</Link></td><td className="py-2 px-2"><StatusBadge status={sc.fromStatus} /></td><td className="py-1 px-1"><ArrowRight size={10} className="text-gray-600" /></td><td className="py-2 px-2"><StatusBadge status={sc.toStatus} /></td><td className="py-2 px-2 font-mono text-lego-yellow">${sc.price.toFixed(2)}</td></tr>))}
      </tbody></table></div></ChartCard>
    </div>
  )
}

function SalesTab({ sales }) {
  return (
    <div className="space-y-5">
      <div className="glass rounded-xl p-4"><div className="flex items-center gap-2 text-sm"><Flame size={16} className="text-lego-red" /><span className="text-white font-semibold">{sales.length} products</span><span className="text-gray-500">recently went on sale</span></div></div>
      <ChartCard title="New Sales"><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-lego-border">{['Product', 'Theme', 'Was', 'Now', 'Save', 'Date'].map(h => <th key={h} className="py-2 px-2 text-[10px] font-mono text-gray-500 uppercase text-right first:text-left [&:nth-child(2)]:text-left">{h}</th>)}</tr></thead><tbody>
        {sales.map((s, i) => (<tr key={`${s.product_code}-${i}`} className="border-b border-lego-border/30 hover:bg-white/[0.02]"><td className="py-2 px-2 text-left"><Link to={`/product/${s.slug}`} className="text-white hover:text-lego-yellow font-medium">{s.product_name}</Link></td><td className="py-2 px-2 text-left text-gray-500">{s.theme}</td><td className="py-2 px-2 text-right font-mono text-gray-400 line-through">${s.listPrice.toFixed(2)}</td><td className="py-2 px-2 text-right font-mono text-lego-yellow font-bold">${s.price.toFixed(2)}</td><td className="py-2 px-2 text-right font-mono text-lego-red font-bold">-${s.discount.toFixed(0)}{s.salePct > 0 && <span className="text-gray-500 font-normal ml-1">({s.salePct.toFixed(0)}%)</span>}</td><td className="py-2 px-2 text-right text-gray-500">{fmtDate(s.date)}</td></tr>))}
      </tbody></table></div></ChartCard>
    </div>
  )
}

function StatusOverTimeChart({ statusOverTime }) {
  return (<ChartCard title="Status Distribution Over Time" subtitle="Catalog-wide availability trends"><div className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={statusOverTime.data}><CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" /><XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={fmtDate} /><YAxis tick={{ fill: '#555', fontSize: 10 }} /><Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmtDate} /><RLegend wrapperStyle={{ fontSize: '10px', color: '#888' }} />{statusOverTime.statuses.map((s, i) => <Area key={s} type="monotone" dataKey={s} stackId="1" fill={CHART_COLORS[i % CHART_COLORS.length]} stroke={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.6} />)}</AreaChart></ResponsiveContainer></div></ChartCard>)
}

function StatusBadge({ status, availabilityText }) {
  const info = getStatusDisplay(status, undefined, availabilityText)
  const isEnrichedLabel = status && status.startsWith('Backorder (') && status !== 'Backorder (Dated)'
  const label = isEnrichedLabel ? status : info.displayLabel
  return <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full border ${info.bgClass} ${info.textClass} ${info.borderClass} whitespace-nowrap`}>{label}</span>
}
function HighlightCard({ icon, iconBg, title, product, detail, sub }) { return (<Link to={`/product/${product.slug}`} className="glass rounded-xl p-4 hover:bg-white/[0.03] transition-colors group"><div className="flex items-start gap-3"><div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div><div className="flex-1 min-w-0"><div className="text-[10px] text-gray-500 uppercase font-mono tracking-wider mb-1">{title}</div><div className="text-sm text-white font-semibold truncate group-hover:text-lego-yellow transition-colors">{product.product_name}</div><div className="text-[10px] text-gray-500 mb-2">{product.theme}</div><div className="text-sm">{detail}</div>{sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}</div></div></Link>) }
function ChartCard({ title, subtitle, children }) { return (<div className="glass rounded-xl p-5"><h3 className="font-display font-semibold text-sm mb-0.5">{title}</h3>{subtitle && <p className="text-[10px] text-gray-500 mb-4">{subtitle}</p>}{children}</div>) }
function AlertKPI({ icon, label, value, color = 'text-white' }) { return (<div className="glass rounded-lg p-3.5 glass-hover transition-all"><div className={`mb-1.5 ${color}`}>{icon}</div><div className={`font-display font-bold text-xl ${color}`}>{value}</div><div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mt-0.5">{label}</div></div>) }
function LoadingSkeleton() { return (<div className="space-y-5">{[1, 2, 3].map(i => (<div key={i} className="glass rounded-xl p-5 animate-pulse"><div className="h-4 bg-lego-surface2 rounded w-48 mb-2" /><div className="h-3 bg-lego-surface2 rounded w-32 mb-4" /><div className="h-[200px] bg-lego-surface2 rounded" /></div>))}</div>) }
