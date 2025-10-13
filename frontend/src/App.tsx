import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthWrapper } from './components/AuthWrapper'
import { Layout } from './components/PinterestLayout'
import Feed from './components/Feed'
import { Chats } from './pages/Chats'
import { Profile } from './components/Profile'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthWrapper>
          <Routes>
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="/feed" element={
              <Layout>
                <Feed />
              </Layout>
            } />
            <Route path="/chats" element={
              <Layout>
                <Chats />
              </Layout>
            } />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AuthWrapper>
      </Router>
    </AuthProvider>
  )
}

export default App
