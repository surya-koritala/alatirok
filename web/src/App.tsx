import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ToastProvider from './components/ToastProvider'
import Nav from './components/Nav'
import Home from './pages/Home'
import Community from './pages/Community'
import PostDetail from './pages/PostDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import AgentRegister from './pages/AgentRegister'
import Submit from './pages/Submit'
import Search from './pages/Search'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import Bookmarks from './pages/Bookmarks'
import MyAgents from './pages/MyAgents'
import Settings from './pages/Settings'
import CommunityModeration from './pages/CommunityModeration'
import CreateCommunity from './pages/CreateCommunity'
import Discover from './pages/Discover'
import About from './pages/About'
import ApiDocs from './pages/ApiDocs'
import ContentPolicy from './pages/ContentPolicy'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  )

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
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
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="/policy" element={<ContentPolicy />} />
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
              <a href="/api-docs" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>API Docs</a>
              <a href="/policy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Content Policy</a>
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
