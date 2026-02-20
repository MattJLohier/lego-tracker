import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle, Crown } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, signInWithGoogle, user } = useAuth()
  const navigate = useNavigate()

  if (user) {
    navigate('/watchlist')
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error: err } = await signUp(email, password)
        if (err) { setError(err.message); setLoading(false); return }
        setSuccess('Check your email for a confirmation link!')
      } else {
        const { error: err } = await signIn(email, password)
        if (err) { setError(err.message); setLoading(false); return }
        navigate('/watchlist')
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setError('')
    const { error: err } = await signInWithGoogle()
    if (err) setError(err.message)
  }

  return (
    <main className="pt-20 pb-16 px-6 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-lego-red rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 32 32" className="w-7 h-7">
              <rect x="2" y="10" width="28" height="18" rx="2" fill="white"/>
              <rect x="6" y="4" width="6" height="8" rx="3" fill="white"/>
              <rect x="20" y="4" width="6" height="8" rx="3" fill="white"/>
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-gray-500 text-sm">
            {mode === 'signin' ? 'Sign in to access your watchlist & alerts' : 'Start tracking your favorite LEGO sets'}
          </p>
        </div>

        <div className="glass rounded-xl p-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
              <CheckCircle size={14} className="text-green-400 shrink-0" />
              <p className="text-xs text-green-400">{success}</p>
            </div>
          )}

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-2.5 bg-white hover:bg-gray-100 text-gray-800
              font-medium text-sm rounded-lg transition-all mb-4 border border-gray-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-lego-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-lego-surface text-gray-600">or continue with email</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-lego-surface2 border border-lego-border rounded-lg text-sm
                    focus:outline-none focus:border-lego-red/50 placeholder:text-gray-600" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-lego-surface2 border border-lego-border rounded-lg text-sm
                    focus:outline-none focus:border-lego-red/50 placeholder:text-gray-600" />
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-3 bg-lego-red hover:bg-red-700
                text-white font-display font-semibold rounded-lg transition-all disabled:opacity-40 mt-2">
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess('') }}
            className="text-lego-red hover:underline">
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {/* Pro teaser */}
        <div className="mt-6 glass rounded-xl p-4 border border-lego-yellow/10 text-center">
          <Crown size={16} className="text-lego-yellow mx-auto mb-2" />
          <p className="text-[11px] text-gray-400">
            Unlock <span className="text-lego-yellow font-semibold">Pro features</span> for $5/mo — 10 alerts, 10 reports, custom analytics, and more.
          </p>
        </div>
      </div>
    </main>
  )
}
