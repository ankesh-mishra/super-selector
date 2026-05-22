import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { leaderboardApi, tournamentsApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import LeaderboardTable from '../components/LeaderboardTable'

export default function TournamentLeaderboardPage() {
  const { id: tournamentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: tournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => tournamentsApi.get(tournamentId).then((r) => r.data),
  })

  const { data: entries, isLoading } = useQuery({
    queryKey: ['leaderboard', 'tournament', tournamentId],
    queryFn: () => leaderboardApi.tournament(tournamentId).then((r) => r.data),
    refetchInterval: 60_000,
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button onClick={() => navigate(-1)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start">← Back</button>
        <h2 className="text-lg font-bold text-white mt-1">
          {tournament?.name ? `${tournament.name} — Super Selectors` : 'Tournament Super Selectors'}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Cumulative points across all contests</p>
      </div>
      {isLoading
        ? <p className="text-center py-8 text-sm" style={{ color: '#64748b' }}>Loading…</p>
        : <LeaderboardTable entries={entries} currentUserId={user?.id} showContests />
      }
    </div>
  )
}
