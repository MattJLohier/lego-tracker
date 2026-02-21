// ProCancel.jsx — Drop this into your pages/routes directory

import { Link } from 'react-router-dom'
import { ArrowLeft, Crown } from 'lucide-react'

export default function ProCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 mb-6">
          <Crown size={40} className="text-gray-500" />
        </div>

        <h1 className="font-display font-bold text-2xl text-white mb-2">
          No worries!
        </h1>

        <p className="text-gray-400 mb-8">
          You weren't charged. You can upgrade to Pro anytime to unlock
          unlimited alerts, reports, and custom analytics.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10
            text-white font-display font-semibold rounded-xl transition-all border border-white/10"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  )
}