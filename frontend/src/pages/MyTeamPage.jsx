import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { contestsApi, userTeamsApi } from '../api/endpoints'
import TeamBadge from '../components/TeamBadge'
import PlayerAvatar from '../components/PlayerAvatar'

export default function MyTeamPage() {
  const { id: contestId } = useParams()
  const navigate = useNavigate()

  const { data: team, isLoading, isError } = useQuery({
    queryKey: ['my-team', contestId],
    queryFn: () => userTeamsApi.get(contestId).then((r) => r.data),
  })

  const { data: contest } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: () => contestsApi.get(contestId).then((r) => r.data),
  })

  if (isLoading) return <p className="text-center py-12 text-sm" style={{ color: '#64748b' }}>Loading…</p>
  if (isError || !team) return <p className="text-red-400 text-center py-12">No team found for this contest.</p>

  const canEdit = contest && !contest.is_locked

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => navigate(-1)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start">← Back</button>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">My Team</h2>
        <div className="text-right">
          <p className="text-gradient text-2xl font-black">{team.total_points.toFixed(1)}</p>
          <p className="text-xs" style={{ color: '#64748b' }}>Total Points</p>
        </div>
      </div>

      {canEdit && (
        <Link
          to={`/contests/${contestId}/team-builder`}
          className="block text-center font-semibold py-2.5 rounded-xl transition hover:brightness-110 text-sm"
          style={{ border: '1px solid rgba(16,185,129,.4)', color: '#34d399' }}
        >
          Edit Team
        </Link>
      )}

      <div className="flex flex-col gap-1">
        {team.players
          .sort((a, b) => b.points_earned - a.points_earned)
          .map((utp) => (
            <div
              key={utp.id}
              className="rounded-xl px-3 py-2 flex items-center justify-between"
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
                <PlayerAvatar player={utp.player} size="sm" />
                <div>
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm text-white">{utp.player.name}</p>
                    {utp.player.is_real_captain && (
                      <span className="text-xs px-1 rounded" style={{ background: 'rgba(234,179,8,.15)', color: '#facc15' }}>★</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    {utp.player.team?.name} · {utp.player.gender === 'FEMALE' ? '♀' : '♂'} · {utp.player.bid_points} pts
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
