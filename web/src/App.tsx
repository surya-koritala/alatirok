import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0C0C14] text-[#E0E0F0]">
        <Routes>
          <Route path="/" element={<div className="p-8 text-center text-2xl">Alatirok - Coming Soon</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
