import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Explorer from './pages/Explorer'
import ProductDetail from './pages/ProductDetail'
import Analytics from './pages/Analytics'
import Alerts from './pages/Alerts'
import Watchlist from './pages/Watchlist'
import Compare from './pages/Compare'
import AuthPage from './pages/AuthPage'

export default function App() {
  return (
    <>
      <div className="grain" />
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/explore" element={<Explorer />} />
        <Route path="/product/:slug" element={<ProductDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </>
  )
}
