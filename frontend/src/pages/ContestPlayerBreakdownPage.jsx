import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { playersApi } from '../api/endpoints'
import TeamBadge from '../components/TeamBadge'
import PlayerAvatar from '../components/PlayerAvatar'

function EventTypeLabel({ type }) {
  const labels = {
    WIN: 'Win',
    LOSS: 'Loss',
    STRAIGHT_SET_WIN_BONUS: 'Straight-set win bonus',
    DOMINANT_SET_BONUS: 'Dominant set bonus',
    UNDERDOG_WIN_LARGE: 'Underdog win (large)',
    UNDERDOG_WIN_SMALL: 'Underdog win (small)',
    COMEBACK_WIN: 'Comeback win',
  }
  return <span>{labels[type] ?? type.replace(/_/g, ' ').toLowerCase()}</span>
}

function StatusBadge({ contest }) {
  if (contest?.is_completed) return <span className="badge-completed text-xs font-semibold px-2.5 py-1 rounded-full">Completed</span>
  if (contest?.is_locked) return <span className="badge-live text-xs font-semibold px-2.5 py-1 rounded-full">🔴 Live</span>
  return <span className="badge-open text-xs font-semibold px-2.5 py-1 rounded-full">Open</span>
}

export default function ContestPlayerBreakdownPage() {
  const navigate = useNavigate()
  const { contestId, playerId } = useParams()

  const { data: player, isLoading, isError } = useQuery({
    queryKey: ['player', playerId, 'stats'],
    queryFn: () => playersApi.stats(playerId).then((r) => r.data),
    enabled: !!playerId,
  })

  if (isLoading) return <p className="text-sm text-center py-12" style={{ color: '#64748b' }}>Loading…</p>
  if (isError || !player) return <p className="text-sm text-center py-12 text-red-400">Player not found.</p>

  const contestStats = (player.contests || []).find((c) => c.contest_id === contestId)

  if (!contestStats) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start"
        >
          ← Back
        </button>
        <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>
          No points data for this player in the selected contest.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
        >
          ← Back
        </button>
        <Link
          to={`/contests/${contestId}`}
          className="text-xs px-2.5 py-1 rounded-lg"
          style={{ border: '1px solid #1e2d42', color: '#94a3b8' }}
        >
          Contest
        </Link>
      </div>

      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(#0f1623,#0f1623) padding-box, linear-gradient(135deg,#10b981,#06b6d4) border-box',
          border: '1px solid transparent',
          boxShadow: '0 0 24px rgba(16,185,129,.1), 0 8px 32px rgba(0,0,0,.4)',
        }}
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3">
          <TeamBadge teamName={player.team?.name} size="sm" />
          {player.team?.name}
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PlayerAvatar player={player} size="md" />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">{player.name}</h2>
              <p className="text-xs truncate" style={{ color: '#64748b' }}>{contestStats.contest_name}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-black text-emerald-400">{contestStats.total_base_points.toFixed(2)}</p>
            <p className="text-xs" style={{ color: '#64748b' }}>points</p>
          </div>
        </div>
        <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid #1e2d42' }}>
          <StatusBadge contest={contestStats} />
          <p className="text-xs" style={{ color: '#475569' }}>
            {new Date(contestStats.match_date).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2d42', background: '#0f1623' }}>
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid #1e2d42' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Points Breakup</p>
        </div>

        {contestStats.events.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>No scoring events yet.</p>
        ) : (
          <div className="px-4 py-2">
            {contestStats.events.map((ev, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: i < contestStats.events.length - 1 ? '1px solid #131f30' : 'none' }}
              >
                <div className="min-w-0">
                  <p className="text-xs text-white">
                    <EventTypeLabel type={ev.event_type} />
                    {ev.multiplier_applied !== 1 && (
                      <span className="ml-1 text-emerald-400 font-semibold">×{ev.multiplier_applied}</span>
                    )}
                  </p>
                  {ev.game_name && (
                    <p className="text-[0.65rem] mt-0.5 truncate" style={{ color: '#475569' }}>
                      {ev.game_name}{ev.game_number ? ` • Game ${ev.game_number}` : ''}
                    </p>
                  )}
                </div>
                <span
                  className="text-xs font-bold ml-2 shrink-0"
                  style={{ color: ev.points_awarded >= 0 ? '#fff' : '#f87171' }}
                >
                  {ev.points_awarded >= 0 ? '+' : ''}{ev.points_awarded.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
