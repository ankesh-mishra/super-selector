import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { userTeamsApi, contestsApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import TeamBadge from '../components/TeamBadge'

export default function UserTeamViewPage() {
  const { id: contestId, userId } = useParams()
  const { user: currentUser } = useAuth()

  const { data: contest } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: () => contestsApi.get(contestId).then((r) => r.data),
  })

  const { data: team, isLoading, isError, error } = useQuery({
    queryKey: ['user-team', contestId, userId],
    queryFn: () => userTeamsApi.getByUser(contestId, userId).then((r) => r.data),
  })

  const isOwn = currentUser?.id === userId

  if (isLoading) return <p className="text-center py-12 text-sm" style={{ color: '#64748b' }}>Loading…</p>

  if (isError) {
    const msg = error?.response?.data?.detail || 'Team not available.'
    const isLocked = contest?.is_locked
    return (
      <div className="flex flex-col gap-4">
        <Link to={`/contests/${contestId}/leaderboard`} className="text-xs text-emerald-400 hover:text-emerald-300 transition">
          ← Leaderboard
        </Link>
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
        >
          <p className="text-2xl mb-3">🔒</p>
          <p className="font-semibold text-white mb-1">Team hidden</p>
          <p className="text-sm" style={{ color: '#64748b' }}>
            {!isLocked ? 'Team selections are only visible once the contest is locked.' : msg}
          </p>
        </div>
      </div>
    )
  }

  const owner = team?.user
  const displayName = owner?.team_name || owner?.name || 'Unknown'

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to={`/contests/${contestId}/leaderboard`} className="text-xs text-emerald-400 hover:text-emerald-300 transition">
          ← Leaderboard
        </Link>
        <h2 className="text-lg font-bold text-white mt-1">
          {isOwn ? 'My Team' : displayName}
          {owner?.team_name && owner?.name && !isOwn && (
            <span className="text-sm font-normal ml-2" style={{ color: '#64748b' }}>({owner.name})</span>
          )}
        </h2>
        {contest && (
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{contest.name}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: '#64748b' }}>{team?.players?.length || 0} players</span>
        <div>
          <span className="text-gradient text-2xl font-black">{team?.total_points?.toFixed(1)}</span>
          <span className="text-xs ml-1" style={{ color: '#64748b' }}>pts</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {(team?.players || [])
          .sort((a, b) => b.points_earned - a.points_earned)
          .map((utp) => (
            <div
              key={utp.id}
              className="rounded-xl p-3 flex items-center justify-between"
              style={{
                background: '#0f1623',
                border: `1px solid ${utp.is_captain ? 'rgba(16,185,129,.5)' : utp.is_vice_captain ? 'rgba(59,130,246,.4)' : '#1e2d42'}`,
              }}
            >
              <div className="flex items-center gap-2">
                {utp.is_captain && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#059669', color: '#fff' }}>C</span>
                )}
                {utp.is_vice_captain && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#2563eb', color: '#fff' }}>VC</span>
                )}
                <TeamBadge teamName={utp.player.team?.name} size="sm" />
                <div>
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm text-white">{utp.player.name}</p>
                    {utp.player.is_real_captain && (
                      <span className="text-xs px-1 rounded" style={{ background: 'rgba(234,179,8,.15)', color: '#facc15' }}>★</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    {utp.player.team?.name} · {utp.player.gender === 'FEMALE' ? '♀' : '♂'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-emerald-400">{utp.points_earned.toFixed(1)}</p>
                <p className="text-xs" style={{ color: '#475569' }}>pts</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
