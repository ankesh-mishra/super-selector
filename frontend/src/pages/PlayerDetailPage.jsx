import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { playersApi } from '../api/endpoints'
import TeamBadge from '../components/TeamBadge'
import PlayerAvatar from '../components/PlayerAvatar'

const HERO_STYLE = {
  background: 'linear-gradient(#0f1623,#0f1623) padding-box, linear-gradient(135deg,#10b981,#06b6d4) border-box',
  border: '1px solid transparent',
  boxShadow: '0 0 24px rgba(16,185,129,.1), 0 8px 32px rgba(0,0,0,.4)',
}

function StatusBadge({ contest }) {
  if (contest.is_completed) return <span className="badge-completed text-xs font-semibold px-2.5 py-1 rounded-full">Completed</span>
  if (contest.is_locked)    return <span className="badge-live text-xs font-semibold px-2.5 py-1 rounded-full">🔴 Live</span>
  return                           <span className="badge-open text-xs font-semibold px-2.5 py-1 rounded-full">Open</span>
}

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

export default function PlayerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('selections')

  const { data: player, isLoading, isError } = useQuery({
    queryKey: ['player', id, 'stats'],
    queryFn: () => playersApi.stats(id).then((r) => r.data),
    enabled: !!id,
  })

  if (isLoading) return <p className="text-sm text-center py-12" style={{ color: '#64748b' }}>Loading…</p>
  if (isError || !player) return <p className="text-sm text-center py-12 text-red-400">Player not found.</p>

  return (
    <div className="flex flex-col gap-4">

      <button
        onClick={() => navigate(-1)}
        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start"
      >
        ← Back
      </button>

      {/* ── Hero card ── */}
      <div className="rounded-2xl p-5" style={HERO_STYLE}>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3">
          <TeamBadge teamName={player.team?.name} size="sm" />
          {player.team?.name}
        </p>
        <div className="flex items-center gap-4">
          <PlayerAvatar player={player} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white truncate">{player.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(16,185,129,.12)', color: '#34d399', border: '1px solid rgba(16,185,129,.25)' }}>
                {player.gender === 'MALE' ? 'M' : 'F'}
              </span>
              <span className="text-xs" style={{ color: '#64748b' }}>{player.bid_points} bid pts</span>
              {player.is_real_captain && (
                <span className="text-xs font-semibold text-emerald-400">⭐ Captain</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-emerald-400">{player.total_selections}</p>
            <p className="text-xs" style={{ color: '#64748b' }}>selections</p>
          </div>
        </div>
        <div className="mt-4 pt-3 flex items-center gap-4" style={{ borderTop: '1px solid #1e2d42' }}>
          <span className="text-xs" style={{ color: '#64748b' }}>
            <span style={{ color: '#94a3b8' }}>Contests entered:</span> {player.contests.length}
          </span>
          <span className="text-xs" style={{ color: '#64748b' }}>
            <span style={{ color: '#94a3b8' }}>Selected by:</span> {player.selectors.length} users
          </span>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-2">
        {['selections', 'contests'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition"
            style={
              tab === t
                ? { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }
                : { background: '#0f1623', border: '1px solid #1e2d42', color: '#64748b' }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'selections' ? (
        player.selectors.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>No selections yet.</p>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2d42' }}>
            {player.selectors.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid #1e2d42' : 'none', background: '#0f1623' }}
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-white">{s.team_name || s.user_name}</span>
                  {s.team_name && (
                    <span className="text-xs ml-1.5" style={{ color: '#475569' }}>{s.user_name}</span>
                  )}
                </div>
                <span
                  className="text-xs font-semibold shrink-0 ml-2 px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,.1)', color: '#34d399', border: '1px solid rgba(16,185,129,.2)' }}
                >
                  ×{s.selection_count}
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        player.contests.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>No contest data yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {player.contests.map((cs) => (
              <div
                key={cs.contest_id}
                className="rounded-xl overflow-hidden"
                style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
              >
                {/* Contest row */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: cs.events.length > 0 ? '1px solid #1e2d42' : 'none' }}>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/contests/${cs.contest_id}`}
                      className="text-sm font-semibold text-white hover:text-emerald-400 transition truncate block"
                    >
                      {cs.contest_name}
                    </Link>
                    <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                      {new Date(cs.match_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <StatusBadge contest={cs} />
                    <span className="text-sm font-black text-emerald-400 ml-1">{cs.total_base_points.toFixed(2)}</span>
                    <span className="text-xs" style={{ color: '#475569' }}>pts</span>
                  </div>
                </div>

                {/* Score events */}
                {cs.events.length > 0 && (
                  <div className="px-4 py-2">
                    {cs.events.map((ev, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2"
                        style={{ borderBottom: i < cs.events.length - 1 ? '1px solid #131f30' : 'none' }}
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-white">
                            <EventTypeLabel type={ev.event_type} />
                            {ev.multiplier_applied !== 1 && (
                              <span className="ml-1 text-emerald-400 font-semibold">×{ev.multiplier_applied}</span>
                            )}
                          </p>
                          {ev.game_name && (
                            <p className="text-[0.65rem] mt-0.5 truncate" style={{ color: '#475569' }}>{ev.game_name}</p>
                          )}
                        </div>
                        <span className="text-xs font-bold ml-2 shrink-0"
                          style={{ color: ev.points_awarded >= 0 ? '#fff' : '#f87171' }}>
                          {ev.points_awarded >= 0 ? '+' : ''}{ev.points_awarded.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
