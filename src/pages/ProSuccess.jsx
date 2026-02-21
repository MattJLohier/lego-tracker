// ProSuccess.jsx — Drop this into your pages/routes directory

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, CheckCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function ProSuccess() {
  const { user, refreshUser } = useAuth()
  const [status, setStatus] = useState('verifying') // verifying | active | pending

  useEffect(() => {
    // Poll for subscription activation
    // The webhook may take a few seconds to process
    let attempts = 0
    const maxAttempts = 10

    const checkSubscription = async () => {
      if (!user) return

      // If your useAuth hook exposes a way to re-fetch user data:
      if (refreshUser) {
        await refreshUser()
      }

      // Check if tier is now 'pro' (adapt to your auth hook)
      // This depends on how your frontend fetches subscription status
      attempts++

      if (attempts >= maxAttempts) {
        // Webhook might be slow — show "pending" message
        setStatus('pending')
      }
    }

    const interval = setInterval(checkSubscription, 2000)
    // Also check immediately
    checkSubscription()

    return () => clearInterval(interval)
  }, [user])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20 mb-6">
          <CheckCircle size={40} className="text-green-400" />
        </div>

        <h1 className="font-display font-bold text-3xl text-white mb-2">
          Welcome to <span className="text-lego-yellow">Pro</span>!
        </h1>

        <p className="text-gray-400 mb-8">
          Your subscription is now active. You have access to all Pro features
          including unlimited alerts, reports, custom analytics, and more.
        </p>

        <div className="space-y-3">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 py-3 bg-lego-yellow hover:bg-yellow-500
              text-black font-display font-bold rounded-xl transition-all"
          >
            <Crown size={18} /> Go to Dashboard
          </Link>

          <Link
            to="/alerts"
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10
              text-white font-display font-semibold rounded-xl transition-all border border-white/10"
          >
            Set Up Your Alerts
          </Link>
        </div>

        {status === 'pending' && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 size={14} className="animate-spin" />
            Activating your subscription... This may take a moment.
          </div>
        )}
      </div>
    </div>
  )
}