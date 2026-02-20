import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Crown, CreditCard, LogOut, Shield, Bell, FileText, Heart, ExternalLink, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSubscription, TIERS } from '../hooks/useSubscription'
import { UpgradeBanner, UsageMeter } from '../components/UpgradeModal'
import { UpgradeModal } from '../components/UpgradeModal'

const STRIPE_PORTAL_URL = import.meta.env.VITE_STRIPE_PORTAL_URL || null

export default function AccountPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const sub = useSubscription()
  const [showUpgrade, setShowUpgrade] = useState(false)

  if (!user) {
    return (
      <main className="pt-20 pb-16 px-6 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <User size={40} className="mx-auto text-gray-600 mb-4" />
          <h2 className="font-display font-bold text-2xl mb-2">Account Settings</h2>
          <p className="text-gray-400 text-sm mb-6">Sign in to manage your account and subscription.</p>
          <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 bg-lego-red hover:bg-red-700 text-white font-display font-semibold rounded-xl transition-all">
            Sign In
          </Link>
        </div>
      </main>
    )
  }

  const handleManageSubscription = () => {
    if (STRIPE_PORTAL_URL) {
      const url = new URL(STRIPE_PORTAL_URL)
      url.searchParams.set('prefilled_email', user.email)
      window.location.href = url.toString()
    } else {
      alert('Stripe Customer Portal is not configured yet. Set VITE_STRIPE_PORTAL_URL in your environment variables.')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <main className="pt-20 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl tracking-tight mb-1">
            <User size={24} className="inline text-lego-blue mr-1.5" /> Account Settings
          </h1>
          <p className="text-gray-500 text-xs">Manage your profile and subscription</p>
        </div>

        <div className="space-y-5">

          {/* Profile Info */}
          <div className="glass rounded-xl p-5">
            <h2 className="font-display font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
              <Shield size={14} className="text-lego-blue" /> Profile
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-lego-surface2 rounded-lg">
                <Mail size={14} className="text-gray-500" />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-600">Email</div>
                  <div className="text-sm text-white">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-lego-surface2 rounded-lg">
                <User size={14} className="text-gray-500" />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-600">User ID</div>
                  <div className="text-xs text-gray-400 font-mono">{user.id?.slice(0, 16)}…</div>
                </div>
              </div>
              {user.app_metadata?.provider && (
                <div className="flex items-center gap-3 p-3 bg-lego-surface2 rounded-lg">
                  <Shield size={14} className="text-gray-500" />
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-gray-600">Auth Provider</div>
                    <div className="text-sm text-white capitalize">{user.app_metadata.provider}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subscription */}
          <div className={`glass rounded-xl p-5 ${sub.isPro ? 'border border-lego-yellow/20' : ''}`}>
            <h2 className="font-display font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
              <Crown size={14} className={sub.isPro ? 'text-lego-yellow' : 'text-gray-500'} /> Subscription
            </h2>

            <div className="flex items-center gap-3 mb-4">
              <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                sub.isPro
                  ? 'bg-lego-yellow/15 text-lego-yellow border border-lego-yellow/30'
                  : 'bg-white/5 text-gray-400 border border-lego-border'
              }`}>
                {sub.isPro ? '⭐ Pro' : 'Free'}
              </div>
              {sub.isPro && (
                <span className="text-xs text-gray-500">$5/month</span>
              )}
            </div>

            {/* Usage meters */}
            <div className="space-y-3 mb-4 p-3 bg-lego-surface2 rounded-lg">
              <UsageMeter used={sub.alertCount} max={sub.limits.maxAlerts} label="alerts" color="bg-lego-red" />
              <UsageMeter used={sub.reportCount} max={sub.limits.maxReports} label="reports" color="bg-lego-yellow" />
              <UsageMeter used={sub.watchlistCount} max={sub.limits.maxWatchlistItems} label="watchlist items" color="bg-lego-blue" />
            </div>

            {sub.isPro ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Check size={14} /> Active Pro subscription
                </div>
                <button
                  onClick={handleManageSubscription}
                  className="flex items-center gap-1.5 px-4 py-2 glass text-gray-300 text-xs font-semibold rounded-lg hover:text-white transition-colors"
                >
                  <CreditCard size={14} /> Manage Subscription
                  <ExternalLink size={10} className="ml-1 text-gray-600" />
                </button>
              </div>
            ) : (
              <UpgradeBanner
                feature="all Pro features"
                onUpgradeClick={() => setShowUpgrade(true)}
              />
            )}
          </div>

          {/* Quick Links */}
          <div className="glass rounded-xl p-5">
            <h2 className="font-display font-semibold text-sm text-gray-300 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/alerts" className="flex items-center gap-2 p-3 bg-lego-surface2 rounded-lg hover:bg-white/[0.05] transition-colors text-xs text-gray-400 hover:text-white">
                <Bell size={14} /> My Alerts
              </Link>
              <Link to="/reports" className="flex items-center gap-2 p-3 bg-lego-surface2 rounded-lg hover:bg-white/[0.05] transition-colors text-xs text-gray-400 hover:text-white">
                <FileText size={14} /> My Reports
              </Link>
              <Link to="/watchlist" className="flex items-center gap-2 p-3 bg-lego-surface2 rounded-lg hover:bg-white/[0.05] transition-colors text-xs text-gray-400 hover:text-white">
                <Heart size={14} /> Watchlist
              </Link>
              <Link to="/analytics" className="flex items-center gap-2 p-3 bg-lego-surface2 rounded-lg hover:bg-white/[0.05] transition-colors text-xs text-gray-400 hover:text-white">
                <Crown size={14} /> Analytics
              </Link>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass rounded-xl p-5">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold rounded-lg transition-colors w-full justify-center"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>

        </div>
      </div>

      {/* Inline upgrade flow */}
      {showUpgrade && (
        <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
      )}
    </main>
  )
}
