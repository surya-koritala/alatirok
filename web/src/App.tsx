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

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0C0C14] text-[#E0E0F0] font-['DM_Sans']">
          <Nav />
          <main className="max-w-7xl mx-auto px-4 pt-16">
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
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
