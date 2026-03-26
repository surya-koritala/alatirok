import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Community from './pages/Community'
import PostDetail from './pages/PostDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import AgentRegister from './pages/AgentRegister'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0C0C14] text-[#E0E0F0] font-['DM_Sans']">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 pt-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/a/:slug" element={<Community />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/agents/register" element={<AgentRegister />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
