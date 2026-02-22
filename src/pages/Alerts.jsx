import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, TrendingUp, TrendingDown, AlertTriangle, ShoppingBag,
  Tag, Package, Flame, Clock,
  Plus, X, Mail, Trash2, Zap, Lock, Crown
} from 'lucide-react'
import { useAlertSubscriptions } from '../hooks/usePipeline'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { useThemeList } from '../hooks/useData'
import ProductSearchInput from '../components/ProductSearchInput'
import { UpgradeModal, UpgradeBanner, UsageMeter } from '../components/UpgradeModal'
import { supabase } from '../lib/supabase'

const ALERT_TYPES = [
  { key: 'price_drop', label: 'Price Drop', icon: TrendingDown, color: 'text-green-400', desc: 'Price drops below threshold' },
  { key: 'price_increase', label: 'Price Increase', icon: TrendingUp, color: 'text-red-400', desc: 'Price rises above threshold' },
  { key: 'back_in_stock', label: 'Back in Stock', icon: ShoppingBag, color: 'text-lego-blue', desc: 'Product becomes available' },
  { key: 'out_of_stock', label: 'Out of Stock', icon: AlertTriangle, color: 'text-orange-400', desc: 'Product goes out of stock' },
  { key: 'new_deal', label: 'New Sale', icon: Tag, color: 'text-lego-yellow', desc: 'Product goes on sale' },
  { key: 'sale_ended', label: 'Sale Ended', icon: X, color: 'text-gray-400', desc: 'Sale ends on product' },
  { key: 'retirement_risk', label: 'Retirement Risk', icon: Flame, color: 'text-red-400', desc: 'High retirement risk detected' },
]

const TABS = [
  { id: 'subscriptions', label: 'My Alerts', icon: Bell },
  { id: 'history', label: 'Alert History', icon: Clock },
]

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '' }
function fmtDateLong(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '' }
function fmtTime(d) { return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '' }

export default function Alerts() {
  const [activeTab, setActiveTab] = useState('subscriptions')
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
            Subscribe to price drops, restocks, and more for specific products
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
                      <button onClick={async () => { await deleteSubscription(s.id); setConfirmDelete(null); sub.refresh() }} className="px-2 py-1 bg-red-600 text-white text-[10px] font-semibold rounded-md">Delete</button>
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
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedTypes, setSelectedTypes] = useState(['price_drop', 'back_in_stock'])
  const [thresholdPct, setThresholdPct] = useState('')
  const [thresholdUsd, setThresholdUsd] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggleType = (key) => setSelectedTypes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])

  const handleSubmit = async () => {
    if (!userEmail || selectedTypes.length === 0 || !selectedProduct) return
    setSubmitting(true)
    try {
      await onSubmit({
        email: userEmail, alert_types: selectedTypes, target_type: 'product',
        product_code: selectedProduct?.product_code,
        theme_filter: null,
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
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 block">Choose a Product</label>
        <p className="text-[9px] text-gray-500 mb-2">Alerts are product-specific. Search for the set you want to track.</p>
        <ProductSearchInput
          value={selectedProduct?.product_code}
          onChange={(product) => setSelectedProduct(product)}
          onClear={() => setSelectedProduct(null)}
        />
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
          <button onClick={handleSubmit} disabled={selectedTypes.length === 0 || submitting || !selectedProduct} className="flex items-center gap-1.5 px-4 py-2 bg-lego-red hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
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

function LoadingSkeleton() { return (<div className="space-y-5">{[1, 2, 3].map(i => (<div key={i} className="glass rounded-xl p-5 animate-pulse"><div className="h-4 bg-lego-surface2 rounded w-48 mb-2" /><div className="h-3 bg-lego-surface2 rounded w-32 mb-4" /><div className="h-[200px] bg-lego-surface2 rounded" /></div>))}</div>) }