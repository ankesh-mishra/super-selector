import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { usePageTracking } from './utils/usePageTracking'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TournamentsPage from './pages/TournamentsPage'
import TournamentDetailPage from './pages/TournamentDetailPage'
import MyContestsPage from './pages/MyContestsPage'
import ProfilePage from './pages/ProfilePage'
import ContestDetailPage from './pages/ContestDetailPage'
import TeamBuilderPage from './pages/TeamBuilderPage'
import MyTeamPage from './pages/MyTeamPage'
import ContestLeaderboardPage from './pages/ContestLeaderboardPage'
import TournamentLeaderboardPage from './pages/TournamentLeaderboardPage'
import UserTeamViewPage from './pages/UserTeamViewPage'
import AdminPanel from './pages/AdminPanel'
import AboutPage from './pages/AboutPage'
import PlayersPage from './pages/PlayersPage'
import PlayerDetailPage from './pages/PlayerDetailPage'
import ContestPlayerBreakdownPage from './pages/ContestPlayerBreakdownPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center items-center h-screen">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center items-center h-screen">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  usePageTracking()
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d14', color: '#f0f4f8' }}>
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/tournaments" element={<ProtectedRoute><TournamentsPage /></ProtectedRoute>} />
          <Route path="/tournaments/:id" element={<ProtectedRoute><TournamentDetailPage /></ProtectedRoute>} />
          <Route path="/my-contests" element={<ProtectedRoute><MyContestsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/contests/:id" element={<ProtectedRoute><ContestDetailPage /></ProtectedRoute>} />
          <Route path="/contests/:id/team-builder" element={<ProtectedRoute><TeamBuilderPage /></ProtectedRoute>} />
          <Route path="/contests/:id/my-team" element={<ProtectedRoute><MyTeamPage /></ProtectedRoute>} />
          <Route path="/contests/:id/leaderboard" element={<ProtectedRoute><ContestLeaderboardPage /></ProtectedRoute>} />
          <Route path="/contests/:id/teams/:userId" element={<ProtectedRoute><UserTeamViewPage /></ProtectedRoute>} />
          <Route path="/contests/:contestId/players/:playerId" element={<ProtectedRoute><ContestPlayerBreakdownPage /></ProtectedRoute>} />
          <Route path="/tournaments/:id/leaderboard" element={<ProtectedRoute><TournamentLeaderboardPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/players/:id" element={<PlayerDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
