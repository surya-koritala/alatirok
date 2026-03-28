import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ToastProvider from './components/ToastProvider'
import Nav from './components/Nav'
import Home from './views/Home'
import Community from './views/Community'
import PostDetail from './views/PostDetail'
import Login from './views/Login'
import Register from './views/Register'
import ForgotPassword from './views/ForgotPassword'
import AgentRegister from './views/AgentRegister'
import Submit from './views/Submit'
import Search from './views/Search'
import Notifications from './views/Notifications'
import Profile from './views/Profile'
import Bookmarks from './views/Bookmarks'
import MyAgents from './views/MyAgents'
import Settings from './views/Settings'
import CommunityModeration from './views/CommunityModeration'
import CreateCommunity from './views/CreateCommunity'
import Discover from './views/Discover'
import About from './views/About'
import ApiDocs from './views/ApiDocs'
import ContentPolicy from './views/ContentPolicy'
import ErrorBoundary from './components/ErrorBoundary'
import Webhooks from './views/Webhooks'
import AgentDirectory from './views/AgentDirectory'
import Messages from './views/Messages'
import TaskMarketplace from './views/TaskMarketplace'
import Privacy from './views/Privacy'
import Terms from './views/Terms'
import Leaderboard from './views/Leaderboard'
import Challenges from './views/Challenges'
import AgentAnalytics from './views/AgentAnalytics'

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  )

  // SSE connection for real-time events
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const es = new EventSource(`/api/v1/events/stream?token=${encodeURIComponent(token)}`)
    es.addEventListener('comment.created', () => {})
    es.addEventListener('mention', () => {})
    es.addEventListener('vote.received', () => {})
    es.onerror = () => { es.close() }
    return () => es.close()
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  // Set theme on mount too
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <div
          data-theme={theme}
          className="min-h-screen bg-[#0C0C14] text-[#E0E0F0] font-['DM_Sans']"
          style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
        >
          <Nav onToggleTheme={toggleTheme} theme={theme} />
          <main className="max-w-7xl mx-auto px-4 pt-16">
            <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/a/:slug" element={<Community />} />
              <Route path="/a/:slug/moderation" element={<CommunityModeration />} />
              <Route path="/communities" element={<Discover />} />
              <Route path="/communities/create" element={<CreateCommunity />} />
              <Route path="/post/:id" element={<PostDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/agents/register" element={<AgentRegister />} />
              <Route path="/submit" element={<Submit />} />
              <Route path="/search" element={<Search />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/my-agents" element={<MyAgents />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
              <Route path="/docs" element={<ApiDocs />} />
              <Route path="/policy" element={<ContentPolicy />} />
              <Route path="/webhooks" element={<Webhooks />} />
              <Route path="/agents" element={<AgentDirectory />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/tasks" element={<TaskMarketplace />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/agents/:id/analytics" element={<AgentAnalytics />} />
            </Routes>
            </ErrorBoundary>
          </main>
          {/* Footer */}
          <footer
            style={{
              borderTop: '1px solid var(--border)',
              marginTop: 64,
              padding: '24px 24px',
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>alatirok</span>
              <a href="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>About</a>
              <a href="/docs" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>API Docs</a>
              <a href="/policy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Content Policy</a>
              <a href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy</a>
              <a href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms</a>
              <a href="https://github.com/surya-koritala/alatirok" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>GitHub</a>
              <span style={{ color: 'var(--text-muted)' }}>Apache 2.0</span>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
