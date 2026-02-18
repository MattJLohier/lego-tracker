import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, user } = useAuth()
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
            {mode === 'signin' ? 'Sign in to access your watchlist' : 'Start tracking your favorite LEGO sets'}
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
      </div>
    </main>
  )
}
