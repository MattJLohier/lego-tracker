import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Crown, Bell, FileText, Layers, Heart, GitCompareArrows, Zap, Check, Lock, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { TIERS } from '../hooks/useSubscription'

const STRIPE_CHECKOUT_URL = import.meta.env.VITE_STRIPE_CHECKOUT_URL || null

const PRO_FEATURES = [
  { icon: Bell, label: '10 Price & Stock Alerts', free: '1 alert' },
  { icon: FileText, label: '10 Automated Reports', free: '1 report' },
  { icon: Layers, label: 'Custom Analytics Builder', free: 'View only' },
  { icon: Sparkles, label: 'Save Unlimited Dashboards', free: 'Not available' },
  { icon: Heart, label: 'Unlimited Watchlist', free: '5 items' },
  { icon: GitCompareArrows, label: 'Unlimited Comparisons', free: '2 items' },
]

/**
 * Upgrade modal shown when a free user tries a Pro feature.
 * Also used as the main subscribe CTA.
 */
export function UpgradeModal({ isOpen, onClose, feature = '' }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubscribe = async () => {
    if (!user) return
    setLoading(true)

    if (STRIPE_CHECKOUT_URL) {
      const url = new URL(STRIPE_CHECKOUT_URL)
      url.searchParams.set('prefilled_email', user.email)
      url.searchParams.set('client_reference_id', user.id)

      // ✅ ADD THESE — tell Stripe where to redirect after payment
      const origin = window.location.origin
      url.searchParams.set('success_url', `${origin}/pro/success`)
      url.searchParams.set('cancel_url', `${origin}/pro/cancel`)

      window.location.href = url.toString()
    } else {
      alert('Stripe is not configured yet. Set VITE_STRIPE_CHECKOUT_URL in your environment variables.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg glass rounded-2xl overflow-hidden border border-lego-yellow/20 shadow-2xl shadow-lego-yellow/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-lego-yellow to-transparent" />

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-white rounded-lg transition-colors z-10">
          <X size={16} />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-lego-yellow/10 border border-lego-yellow/20 mb-4">
              <Crown size={28} className="text-lego-yellow" />
            </div>
            <h2 className="font-display font-bold text-2xl tracking-tight mb-1">
              Upgrade to <span className="text-lego-yellow">Pro</span>
            </h2>
            {feature && (
              <p className="text-sm text-gray-400">
                <Lock size={12} className="inline mr-1" />
                {feature} requires a Pro subscription
              </p>
            )}
            {!feature && (
              <p className="text-sm text-gray-400">Unlock the full power of StudMetrics</p>
            )}
          </div>

          {/* Price */}
          <div className="text-center mb-6">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-display font-bold text-white">$5</span>
              <span className="text-gray-500 text-sm">/month</span>
            </div>
          </div>

          {/* Features grid */}
          <div className="space-y-2.5 mb-6">
            {PRO_FEATURES.map(({ icon: Icon, label, free }) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                <div className="p-1.5 rounded-lg bg-lego-yellow/10">
                  <Icon size={14} className="text-lego-yellow" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-600 line-through">{free}</span>
                  <Check size={14} className="text-lego-yellow" />
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          {user ? (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-lego-yellow hover:bg-yellow-500
                text-black font-display font-bold text-base rounded-xl transition-all
                disabled:opacity-50 shadow-lg shadow-lego-yellow/20 hover:shadow-lego-yellow/30"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-black/30 border-t-black rounded-full" />
              ) : (
                <Zap size={18} />
              )}
              Subscribe to Pro
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-lego-red hover:bg-red-700
                text-white font-display font-bold text-base rounded-xl transition-all"
            >
              Sign In to Subscribe
            </Link>
          )}

          <p className="text-center text-[10px] text-gray-600 mt-3">
            Cancel anytime · Secure payment via Stripe
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline upgrade banner — shown within pages to entice upgrade.
 */
export function UpgradeBanner({ feature, compact = false, onUpgradeClick }) {
  if (compact) {
    return (
      <button
        onClick={onUpgradeClick}
        className="flex items-center gap-2 px-3 py-2 bg-lego-yellow/10 border border-lego-yellow/20
          rounded-lg text-xs transition-all hover:bg-lego-yellow/15 hover:border-lego-yellow/30 group"
      >
        <Crown size={14} className="text-lego-yellow" />
        <span className="text-gray-300 group-hover:text-white transition-colors">
          <span className="text-lego-yellow font-semibold">Upgrade to Pro</span>
          {feature && <span className="text-gray-500 ml-1">— {feature}</span>}
        </span>
      </button>
    )
  }

  return (
    <div className="glass rounded-xl p-5 border border-lego-yellow/20 bg-gradient-to-r from-lego-yellow/5 to-transparent">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-lego-yellow/10 shrink-0">
          <Crown size={20} className="text-lego-yellow" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm text-white mb-1">
            Unlock {feature || 'Pro Features'}
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Get 10 alerts, 10 reports, custom analytics builder, unlimited watchlist, and more for just $5/month.
          </p>
          <button
            onClick={onUpgradeClick}
            className="flex items-center gap-1.5 px-4 py-2 bg-lego-yellow hover:bg-yellow-500
              text-black text-xs font-bold rounded-lg transition-all shadow-sm shadow-lego-yellow/20"
          >
            <Zap size={14} /> Upgrade to Pro — $5/mo
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Usage meter bar — shows "2/10 alerts used"
 */
export function UsageMeter({ used, max, label, color = 'bg-lego-yellow' }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const atLimit = used >= max

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={`font-mono ${atLimit ? 'text-red-400' : 'text-gray-400'}`}>
        {used}/{max} {label}
      </span>
      <div className="flex-1 h-1.5 bg-lego-surface2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${atLimit ? 'bg-red-500' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Blurred content overlay for non-Pro features
 */
export function ProGate({ children, isPro, isLoggedIn, feature, onUpgradeClick, onLoginClick, blur = true }) {
  if (isPro) return children

  return (
    <div className="relative">
      <div className={`${blur ? 'blur-sm pointer-events-none select-none' : ''}`}>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-lego-surface/60 backdrop-blur-[2px] rounded-xl">
        <div className="text-center px-6 py-8 max-w-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-lego-yellow/10 border border-lego-yellow/20 mb-3">
            <Lock size={20} className="text-lego-yellow" />
          </div>
          <h3 className="font-display font-semibold text-sm text-white mb-1">
            {isLoggedIn ? 'Pro Feature' : 'Sign In Required'}
          </h3>
          <p className="text-[11px] text-gray-500 mb-4">
            {isLoggedIn
              ? `${feature || 'This feature'} is available with a Pro subscription.`
              : `Sign in to access ${feature || 'this feature'}.`
            }
          </p>
          {isLoggedIn ? (
            <button
              onClick={onUpgradeClick}
              className="flex items-center gap-1.5 px-4 py-2 bg-lego-yellow hover:bg-yellow-500 text-black text-xs font-bold rounded-lg transition-all mx-auto"
            >
              <Crown size={14} /> Upgrade to Pro — $5/mo
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={onLoginClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-lego-red hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Pro badge for navbar
 */
export function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-lego-yellow/15 border border-lego-yellow/30 rounded text-[9px] font-bold text-lego-yellow uppercase tracking-wider">
      <Crown size={9} /> Pro
    </span>
  )
}

/**
 * Subscribe button for navbar / prominent placement
 */
export function SubscribeButton({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 bg-lego-yellow hover:bg-yellow-500
        text-black text-xs font-bold rounded-lg transition-all shadow-sm shadow-lego-yellow/20
        hover:shadow-lego-yellow/30 ${className}`}
    >
      <Crown size={13} /> Go Pro
    </button>
  )
}
