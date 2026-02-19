import { Link, useLocation } from 'react-router-dom'
import { BarChart3, Search, Home, Heart, GitCompareArrows, User, LogOut, Bell } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explorer', icon: Search },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-7 h-7 bg-lego-red rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg viewBox="0 0 32 32" className="w-4 h-4">
              <rect x="2" y="10" width="28" height="18" rx="2" fill="white"/>
              <rect x="6" y="4" width="6" height="8" rx="3" fill="white"/>
              <rect x="20" y="4" width="6" height="8" rx="3" fill="white"/>
            </svg>
          </div>
          <span className="font-display font-bold text-base tracking-tight hidden sm:inline">
            Stud<span className="text-lego-red">Metrics</span>
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${pathname === to ? 'bg-lego-red/10 text-lego-red' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Icon size={14} />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}

          {user && (
            <Link to="/watchlist"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${pathname === '/watchlist' ? 'bg-lego-red/10 text-lego-red' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Heart size={14} />
              <span className="hidden md:inline">Watchlist</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono hidden sm:inline">{user.email?.split('@')[0]}</span>
              <button onClick={signOut}
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link to="/auth"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-lego-red hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors">
              <User size={13} />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
