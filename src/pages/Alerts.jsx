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
  { key: 'backorder_change', label: 'Backorder Update', icon: Package, color: 'text-purple-400', desc: 'Backorder status or date changes' },
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
          <p className="text-[10px] text-gray-500 mt-0.5">
            {subscriptions.length} active alert{subscriptions.length !== 1 ? 's' : ''}
            {sub.isPro
              ? ' · Checked all day (about 70×/day) '
              : ' · Checked daily'
            }
          </p>
        </div>
        <button onClick={handleNewAlert} className="flex items-center gap-1.5 px-3 py-1.5 bg-lego-red hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors">
          <Plus size={14} /> New Alert
        </button>
      </div>

      {/* Pro banner for free users */}
      {!sub.isPro && subscriptions.length > 0 && (
        <div className="glass rounded-lg p-3 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] text-amber-200 font-medium">
                Upgrade to Pro — 70× more checks per day so you never miss a deal
              </p>
            </div>
            <button onClick={onUpgrade} className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-bold rounded-md transition-colors shrink-0">
              Upgrade
            </button>
          </div>
        </div>
      )}

      {/* Usage meter */}
      <div className="glass rounded-lg p-3">
        <UsageMeter used={sub.alertCount} max={sub.limits.maxAlerts} label="alerts" color="bg-lego-red" />
        {!sub.isPro && sub.alertCount >= sub.limits.maxAlerts && (
          <div className="mt-2">
            <UpgradeBanner compact feature="up to 10 alerts" onUpgradeClick={onUpgrade} />
          </div>
        )}
      </div>

      {showForm && <NewAlertForm themes={themes} userEmail={user.email} userId={user.id} isPro={sub.isPro} onSubmit={async (alertSub) => { await createSubscription(alertSub); setShowForm(false); sub.refresh() }} onCancel={() => setShowForm(false)} />}

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
                      {sub.isPro && (
                        <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 text-[9px] font-bold rounded-full flex items-center gap-1">
                          <Zap size={8} /> Pro
                        </span>
                      )}
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
                      {sub.isPro && (
                        <span className="text-amber-500/70">· Checked up to 6× per hour </span>
                      )}
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

function NewAlertForm({ themes, userEmail, userId, isPro, onSubmit, onCancel }) {
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
        email: userEmail,
        user_id: userId,
        alert_types: selectedTypes,
        target_type: 'product',
        product_code: selectedProduct?.product_code,
        slug: selectedProduct?.slug,
        product_name: selectedProduct?.product_name,
        theme_filter: null,
        threshold_pct: thresholdPct ? Number(thresholdPct) : null,
        threshold_usd: thresholdUsd ? Number(thresholdUsd) : null,
        cooldown_hours: 24,
        active: true,
      })
    } catch (e) { console.error('Failed to create alert:', e) }
    setSubmitting(false)
  }

  return (
    <div className="glass rounded-xl p-5 border border-lego-red/20">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-lego-red" />
        <h3 className="font-display font-semibold text-sm">Create New Alert</h3>
        {isPro && (
          <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 text-[9px] font-bold rounded-full flex items-center gap-1 ml-auto">
            <Zap size={8} /> Pro — Checks up to 6x per hour
          </span>
        )}
      </div>

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
        <p className="text-[10px] text-gray-500">
          {isPro ? 'Pro alert — checked up to 6x per hour.' : 'Evaluated after each daily scrape. 24h cooldown.'}
        </p>
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

function _alertProductLink(alert) {
  if (alert.slug) return `/product/${alert.slug}`
  if (alert.product_name && alert.product_code) {
    const slug = alert.product_name
      .toLowerCase()
      .replace(/[™®©']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return `/product/${slug}-${alert.product_code}`
  }
  return '#'
}

function AlertHistoryTab() {
  const { history, loading } = useAlertSubscriptions()
  const { user } = useAuth()
  if (!user) return (<div className="glass rounded-xl p-10 text-center"><Clock size={36} className="text-gray-600 mx-auto mb-3" /><h3 className="font-display font-semibold text-sm text-gray-300 mb-1">Sign in to view history</h3><Link to="/auth" className="text-lego-red text-xs hover:underline">Sign In →</Link></div>)
  if (loading) return <LoadingSkeleton />
  if (history.length === 0) return (<div className="glass rounded-xl p-10 text-center"><Clock size={36} className="text-gray-600 mx-auto mb-3" /><h3 className="font-display font-semibold text-sm text-gray-300 mb-1">No alerts fired yet</h3><p className="text-[11px] text-gray-500">Fired alerts will appear here.</p></div>)
  return (
    <div className="space-y-3">
      {history.map((alert, i) => {
        const typeInfo = ALERT_TYPES.find(t => t.key === alert.alert_type)
        const TypeIcon = typeInfo?.icon || Bell
        const isProAlert = alert.details?.source === 'pro_poll'
        const details = alert.details || {}

        return (
          <Link key={alert.id || i} to={_alertProductLink(alert)} className="block glass rounded-xl overflow-hidden hover:bg-white/[0.03] transition-colors">
            {/* Colored top accent */}
            <div className={`h-0.5 ${
              alert.alert_type === 'price_drop' ? 'bg-green-500' :
              alert.alert_type === 'price_increase' ? 'bg-red-500' :
              alert.alert_type === 'back_in_stock' ? 'bg-blue-500' :
              alert.alert_type === 'out_of_stock' ? 'bg-orange-500' :
              alert.alert_type === 'new_deal' ? 'bg-lego-yellow' :
              alert.alert_type === 'backorder_change' ? 'bg-purple-500' :
              alert.alert_type === 'retirement_risk' ? 'bg-red-500' :
              'bg-gray-600'
            }`} />

            <div className="p-3 text-center">
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-7 h-7 rounded-xl mb-3 ${
                alert.alert_type === 'price_drop' ? 'bg-green-500/10' :
                alert.alert_type === 'price_increase' ? 'bg-red-500/10' :
                alert.alert_type === 'back_in_stock' ? 'bg-blue-500/10' :
                alert.alert_type === 'out_of_stock' ? 'bg-orange-500/10' :
                alert.alert_type === 'new_deal' ? 'bg-yellow-500/10' :
                alert.alert_type === 'backorder_change' ? 'bg-purple-500/10' :
                alert.alert_type === 'retirement_risk' ? 'bg-red-500/10' :
                'bg-white/5'
              }`}>
                <TypeIcon size={14} className={typeInfo?.color || 'text-gray-400'} />
              </div>

              {/* Type label */}
              <div className={`text-9px] font-bold uppercase tracking-widest mb-1 ${typeInfo?.color || 'text-gray-400'}`}>
                {typeInfo?.label || alert.alert_type}
              </div>

              {/* Product name */}
              <div className="text-sm text-white font-bold mb-0.5">
                {alert.product_name || alert.slug || 'Catalog Alert'}
              </div>

              {/* Product code */}
              {alert.product_code && (
                <div className="text-[11px] text-gray-500 font-mono mb-3">
                  {alert.product_code}
                </div>
              )}

              {/* Detail box — matches email colored box */}
              <AlertDetailBox type={alert.alert_type} details={details} />

              {/* Footer: timestamp + pro badge */}
              <div className="flex items-center justify-center gap-2 mt-3">
                {isProAlert && (
                  <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[8px] font-bold rounded-full flex items-center gap-0.5">
                    <Zap size={7} /> PRO
                  </span>
                )}
                <span className="text-[10px] text-gray-600">{fmtTime(alert.fired_at || alert.created_at)}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function AlertDetailBox({ type, details }) {
  if (!details || Object.keys(details).length === 0) return null

  let text = ''
  let colorClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20'

  if ((type === 'price_drop' || type === 'price_increase') && details.old_price != null) {
    const pct = details.change_pct != null ? Number(details.change_pct).toFixed(1) : null
    text = `$${Number(details.old_price).toFixed(2)} → $${Number(details.new_price).toFixed(2)}`
    if (pct) text += ` (${Number(details.change_pct) > 0 ? '+' : ''}${pct}%)`
    colorClass = type === 'price_drop'
      ? 'text-green-400 bg-green-500/10 border-green-500/20'
      : 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  else if ((type === 'back_in_stock' || type === 'out_of_stock') && (details.status || details.previous)) {
    const prev = _normalizeStatusLabel(details.previous || 'Unknown')
    const curr = _normalizeStatusLabel(details.status || 'Unknown')
    text = `${prev} → ${curr}`
    colorClass = type === 'back_in_stock'
      ? 'text-green-400 bg-green-500/10 border-green-500/20'
      : 'text-orange-400 bg-orange-500/10 border-orange-500/20'
  }

  else if (type === 'backorder_change') {
    const prev = _normalizeBackorderLabel(details.previous_status, details.previous_text)
    const curr = _normalizeBackorderLabel(details.current_status, details.current_text)
    text = `${prev} → ${curr}`
    colorClass = 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  }

  else if (type === 'new_deal' || type === 'sale_started') {
    const parts = []
    if (details.price != null) parts.push(`$${Number(details.price).toFixed(2)}`)
    if (details.was_price != null) parts.push(`was $${Number(details.was_price).toFixed(2)}`)
    if (details.discount != null && details.discount > 0) parts.push(`${Number(details.discount).toFixed(0)}% off`)
    text = parts.join(' — ')
    if (details.is_all_time_low) text += ' ★ All-time low'
    colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  }

  else if (type === 'sale_ended') {
    text = details.price != null ? `Back to $${Number(details.price).toFixed(2)}` : 'Sale has ended'
    colorClass = 'text-gray-400 bg-gray-500/10 border-gray-500/20'
  }

  else if (type === 'retirement_risk' && details.score != null) {
    text = `Risk score: ${details.score}/100 — ${(details.level || 'High').charAt(0).toUpperCase() + (details.level || 'high').slice(1)}`
    colorClass = details.score >= 80
      ? 'text-red-400 bg-red-500/10 border-red-500/20'
      : details.score >= 50
        ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
        : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
  }

  else if (type === 'new_product') {
    const parts = []
    if (details.price != null) parts.push(`$${Number(details.price).toFixed(2)}`)
    if (details.pieces != null) parts.push(`${details.pieces} pieces`)
    text = parts.join(' • ') || 'New product detected'
    colorClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20'
  }

  if (!text) return null

  return (
    <div className={`inline-block px-4 py-1.5 rounded-lg border text-sm font-semibold ${colorClass}`}>
      {text}
    </div>
  )
}

// ─── Status label helpers (mirrors templates.py logic) ───

function _normalizeStatusLabel(raw) {
  if (!raw) return 'Unknown'
  const lower = raw.toLowerCase().trim()
  const map = {
    'e_available': 'In Stock',
    'available': 'In Stock',
    'in stock': 'In Stock',
    'in_stock': 'In Stock',
    'g_backorder': 'Backorder',
    'f_backorder_for_date': 'Backorder (Dated)',
    'backorder': 'Backorder',
    'h_out_of_stock': 'Out of Stock',
    'out_of_stock': 'Out of Stock',
    'out of stock': 'Out of Stock',
    'k_sold_out': 'Sold Out',
    'sold_out': 'Sold Out',
    'r_retired': 'Retired',
    'a_pre_order_for_date': 'Pre-Order',
    'b_coming_soon_at_date': 'Coming Soon',
  }
  return map[lower] || raw
}

function _normalizeBackorderLabel(status, availText) {
  if (!status && !availText) return 'Unknown'
  const label = _normalizeStatusLabel(status || '')

  // Only enrich "Backorder (Dated)" with the ship date — matches email logic
  if (label === 'Backorder (Dated)' && availText) {
    const text = availText.trim()
    if (text.toLowerCase().startsWith('will ship by ')) {
      const shipDate = text.slice('Will ship by '.length)
      return `Backorder (${shipDate})`
    }
  }

  return label
}

function AlertDetailBlock({ type, details }) {
  if (!details || Object.keys(details).length === 0) return null

  // Price drop / increase
  if ((type === 'price_drop' || type === 'price_increase') && details.old_price != null) {
    const isPriceDrop = type === 'price_drop'
    const changePct = details.change_pct != null ? Math.abs(details.change_pct).toFixed(1) : null
    return (
      <div className="mt-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-500 line-through">${Number(details.old_price).toFixed(2)}</span>
          <span className="text-[11px] text-gray-400">→</span>
          <span className={`text-[11px] font-bold ${isPriceDrop ? 'text-green-400' : 'text-red-400'}`}>
            ${Number(details.new_price).toFixed(2)}
          </span>
        </div>
        {changePct && (
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
            isPriceDrop ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {isPriceDrop ? '↓' : '↑'} {changePct}%
          </span>
        )}
      </div>
    )
  }

  // Back in stock / Out of stock
  if ((type === 'back_in_stock' || type === 'out_of_stock') && (details.status || details.previous)) {
    return (
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[10px] text-gray-500">{details.previous || 'Unknown'}</span>
        <span className="text-[10px] text-gray-600">→</span>
        <span className={`text-[10px] font-semibold ${type === 'back_in_stock' ? 'text-green-400' : 'text-orange-400'}`}>
          {details.status || 'Unknown'}
        </span>
      </div>
    )
  }

  // Backorder change
  if (type === 'backorder_change') {
    const prevLabel = details.previous_text || details.previous_status || 'Unknown'
    const currLabel = details.current_text || details.current_status || 'Unknown'
    return (
      <div className="mt-2 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <span className="text-[10px] text-gray-500 shrink-0 mt-px">Status:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-gray-400">{prevLabel}</span>
            <span className="text-[10px] text-gray-600">→</span>
            <span className="text-[10px] text-purple-400 font-semibold">{currLabel}</span>
          </div>
        </div>
        {details.price != null && (
          <div className="text-[10px] text-gray-500">
            Price: <span className="text-white font-medium">${Number(details.price).toFixed(2)}</span>
          </div>
        )}
      </div>
    )
  }

  // New deal / sale
  if (type === 'new_deal' || type === 'sale_started') {
    return (
      <div className="mt-2 flex items-center gap-3 flex-wrap">
        {details.was_price != null && details.price != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-500 line-through">${Number(details.was_price).toFixed(2)}</span>
            <span className="text-[11px] text-gray-400">→</span>
            <span className="text-[11px] text-lego-yellow font-bold">${Number(details.price).toFixed(2)}</span>
          </div>
        )}
        {details.discount != null && details.discount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-lego-yellow/10 text-lego-yellow text-[9px] font-bold">
            {Number(details.discount).toFixed(0)}% off
          </span>
        )}
        {details.is_all_time_low && (
          <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[9px] font-bold">
            ★ All-time low
          </span>
        )}
      </div>
    )
  }

  // Sale ended
  if (type === 'sale_ended') {
    return (
      <div className="mt-2 text-[10px] text-gray-500">
        Sale has ended{details.price != null && <> · Current price: <span className="text-white font-medium">${Number(details.price).toFixed(2)}</span></>}
      </div>
    )
  }

  // Retirement risk
  if (type === 'retirement_risk' && details.score != null) {
    const scoreColor = details.score >= 80 ? 'text-red-400' : details.score >= 50 ? 'text-orange-400' : 'text-yellow-400'
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-gray-500">Risk score:</span>
        <span className={`text-[11px] font-bold ${scoreColor}`}>{details.score}/100</span>
        {details.level && (
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
            details.level === 'high' ? 'bg-red-500/10 text-red-400' :
            details.level === 'medium' ? 'bg-orange-500/10 text-orange-400' :
            'bg-yellow-500/10 text-yellow-400'
          }`}>
            {details.level}
          </span>
        )}
      </div>
    )
  }

  // New product
  if (type === 'new_product') {
    return (
      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
        {details.price != null && <span>Price: <span className="text-white font-medium">${Number(details.price).toFixed(2)}</span></span>}
        {details.pieces != null && <span>{details.pieces} pieces</span>}
      </div>
    )
  }

  return null
}

function LoadingSkeleton() { return (<div className="space-y-5">{[1, 2, 3].map(i => (<div key={i} className="glass rounded-xl p-5 animate-pulse"><div className="h-4 bg-lego-surface2 rounded w-48 mb-2" /><div className="h-3 bg-lego-surface2 rounded w-32 mb-4" /><div className="h-[200px] bg-lego-surface2 rounded" /></div>))}</div>) }