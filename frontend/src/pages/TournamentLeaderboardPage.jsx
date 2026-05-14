import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { leaderboardApi, tournamentsApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import LeaderboardTable from '../components/LeaderboardTable'

export default function TournamentLeaderboardPage() {
  const { id: tournamentId } = useParams()
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
        <Link to={`/tournaments/${tournamentId}`} className="text-xs text-emerald-400 hover:text-emerald-300 transition">
          ← {tournament?.name || 'Tournament'}
        </Link>
        <h2 className="text-lg font-bold text-white mt-1">
          {tournament?.name ? `${tournament.name} — Leaderboard` : 'Tournament Leaderboard'}
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
