import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Explorer from './pages/Explorer'
import ProductDetail from './pages/ProductDetail'
import Analytics from './pages/Analytics'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'
import Watchlist from './pages/Watchlist'
import Compare from './pages/Compare'
import AuthPage from './pages/AuthPage'
import { trackPageView } from './lib/analytics'

function RouteTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location])
  return null
}

export default function App() {
  return (
    <>
      <RouteTracker />
      <div className="grain" />
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/explore" element={<Explorer />} />
        <Route path="/product/:slug" element={<ProductDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </>
  )
}