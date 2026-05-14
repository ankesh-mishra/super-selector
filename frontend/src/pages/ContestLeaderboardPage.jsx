import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { leaderboardApi, contestsApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import LeaderboardTable from '../components/LeaderboardTable'

export default function ContestLeaderboardPage() {
  const { id: contestId } = useParams()
  const { user } = useAuth()

  const { data: contest } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: () => contestsApi.get(contestId).then((r) => r.data),
  })

  const { data: entries, isLoading } = useQuery({
    queryKey: ['leaderboard', contestId],
    queryFn: () => leaderboardApi.contest(contestId).then((r) => r.data),
    refetchInterval: 30_000,
  })

  const tournamentName = contest?.tournament?.name
  const subHeader = tournamentName
    ? `${contest?.match_number != null ? `Match #${contest.match_number} ` : ''}${tournamentName}`
    : contest?.match_number != null ? `Match #${contest.match_number}` : null

  // After lock, each row gets a link to view that user's team picks
  const getTeamPath = contest?.is_locked
    ? (entry) => `/contests/${contestId}/teams/${entry.user_id}`
    : null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to={`/contests/${contestId}`} className="text-xs text-emerald-400 hover:text-emerald-300 transition">← Contest</Link>
        {subHeader && <p className="text-xs font-semibold text-emerald-400 mt-2 uppercase tracking-wide">{subHeader}</p>}
        <h2 className="text-lg font-bold text-white mt-1">{contest?.name || 'Contest Leaderboard'}</h2>
        {!contest?.is_locked && (
          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#64748b' }}>
            🔒 Team picks are hidden until the contest is locked
          </p>
        )}
      </div>
      {isLoading
        ? <p className="text-center py-8 text-sm" style={{ color: '#64748b' }}>Loading…</p>
        : <LeaderboardTable entries={entries} currentUserId={user?.id} getTeamPath={getTeamPath} />
      }
    </div>
  )
}
