import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { contestsApi, userTeamsApi, leaderboardApi } from '../api/endpoints'
import TeamBadge from '../components/TeamBadge'
import LeaderboardTable from '../components/LeaderboardTable'
import PlayerAvatar from '../components/PlayerAvatar'
import { useAuth } from '../context/AuthContext'
import { getTeamCaptain } from '../utils/teamLogos'

function useCountdown(targetDate) {
  const [diff, setDiff] = useState(() => Math.max(0, new Date(targetDate) - Date.now()))
  useEffect(() => {
    const id = setInterval(() => setDiff(Math.max(0, new Date(targetDate) - Date.now())), 1000)
    return () => clearInterval(id)
  }, [targetDate])
  if (!targetDate || diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}



function Scorecard({ contest }) {
  const games = [...(contest.games || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  if (games.length === 0)
    return <p className="text-center py-8 text-sm" style={{ color: '#64748b' }}>No games recorded yet.</p>

  return (
    <div className="flex flex-col gap-3">
      {games.map((g) => {
        const sets = g.game_details?.sets || []
        const winnerIsA = g.winning_team_id === contest.team_a_id
        const winnerIsB = g.winning_team_id === contest.team_b_id
        const teamAPlayers = (g.players || []).filter((gp) => gp.player.team_id === contest.team_a_id)
        const teamBPlayers = (g.players || []).filter((gp) => gp.player.team_id === contest.team_b_id)

        return (
          <div key={g.id} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: '#0f1623', border: '1px solid #1e2d42' }}>
            {/* Game header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">
                  {g.name || 'Unnamed Game'}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(16,185,129,.12)', color: '#34d399', border: '1px solid rgba(16,185,129,.25)' }}>
                {g.game_type === 'DOUBLES' ? '2v2' : '1v1'}
              </span>
            </div>

            {/* Players row */}
            {(teamAPlayers.length > 0 || teamBPlayers.length > 0) && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col gap-0.5">
                  {teamAPlayers.map((gp) => (
                    <span key={gp.player_id} className="font-medium" style={{ color: winnerIsA ? '#34d399' : '#94a3b8' }}>{gp.player.name}</span>
                  ))}
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  {teamBPlayers.map((gp) => (
                    <span key={gp.player_id} className="font-medium" style={{ color: winnerIsB ? '#34d399' : '#94a3b8' }}>{gp.player.name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Set scores */}
            {sets.length > 0 ? (
              <div className="flex flex-col gap-1">
                {sets.map((s, i) => {
                  const aScore = s.scores?.[contest.team_a_id] ?? s.team_a_points ?? 0
                  const bScore = s.scores?.[contest.team_b_id] ?? s.team_b_points ?? 0
                  const aWon = aScore > bScore
                  return (
                    <div key={i} className="grid grid-cols-3 items-center text-xs">
                      <span className="font-black text-base" style={{ color: aWon ? '#34d399' : '#475569' }}>{aScore}</span>
                      <span className="text-center" style={{ color: '#475569' }}>set {i + 1}</span>
                      <span className="font-black text-base text-right" style={{ color: !aWon ? '#34d399' : '#475569' }}>{bScore}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs" style={{ color: '#475569' }}>Pending</p>
            )}

            {/* Winner */}
            {g.winning_team_id && (
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                ✓ {winnerIsA ? contest.team_a?.name : contest.team_b?.name} won
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ContestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState('super selectors')

  const { data: contest, isLoading } = useQuery({
    queryKey: ['contest', id],
    queryFn: () => contestsApi.get(id).then((r) => r.data),
  })

  const { data: myTeam } = useQuery({
    queryKey: ['my-team', id],
    queryFn: () => userTeamsApi.get(id).then((r) => r.data).catch(() => null),
  })

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', id],
    queryFn: () => leaderboardApi.contest(id).then((r) => r.data),
    refetchInterval: 30_000,
  })

  const countdown = useCountdown(contest && !contest.is_locked ? contest.match_date : null)

  if (isLoading) return <p className="text-center py-12" style={{ color: '#64748b' }}>Loading…</p>
  if (!contest) return <p className="text-center py-12 text-red-400">Contest not found.</p>

  const isLive = contest.is_locked && !contest.is_completed
  const isDone = contest.is_completed
  const isOpen = !contest.is_locked
  const tournamentName = contest.tournament?.name
  const subHeader = contest.match_number != null && tournamentName
    ? `Match #${contest.match_number} · ${tournamentName}`
    : contest.match_number != null ? `Match #${contest.match_number}`
    : tournamentName || null
  const captainSrcA = getTeamCaptain(contest.team_a?.name)
  const captainSrcB = getTeamCaptain(contest.team_b?.name)

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => navigate(-1)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start">← Back</button>

      {/* ── Hero card: cinematic VS ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: '#080d14',
          border: `1px solid ${isLive ? 'rgba(239,68,68,.45)' : isDone ? 'rgba(100,116,139,.25)' : 'rgba(16,185,129,.35)'}`,
          boxShadow: isLive ? '0 0 40px rgba(239,68,68,.1)' : isDone ? 'none' : '0 0 40px rgba(16,185,129,.1)',
        }}
      >
        {/* Cinematic image area */}
        <div className="relative h-64">
          {/* Left captain */}
          <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
            {captainSrcA && <img src={captainSrcA} alt="" className="w-full h-full object-cover object-top" />}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,13,20,.3) 0%, rgba(8,13,20,.85) 100%)' }} />
          </div>
          {/* Right captain */}
          <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
            {captainSrcB && <img src={captainSrcB} alt="" className="w-full h-full object-cover object-top" />}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(270deg, rgba(8,13,20,.3) 0%, rgba(8,13,20,.85) 100%)' }} />
          </div>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3 z-10">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5 text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full"
                style={isLive
                  ? { background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.35)', color: '#f87171' }
                  : isDone
                  ? { background: 'rgba(100,116,139,.15)', border: '1px solid rgba(100,116,139,.25)', color: '#64748b' }
                  : { background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.4)', color: '#34d399', backdropFilter: 'blur(6px)' }}>
                <svg className="w-1.5 h-1.5 fill-current" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" /></svg>
                {isDone ? 'Ended' : isLive ? 'Live' : 'Open'}
              </span>

            </div>
            {countdown && (
              <span className="text-[0.65rem] font-semibold tabular-nums px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,.55)', color: '#34d399', backdropFilter: 'blur(6px)' }}>
                ⏱ {countdown}
              </span>
            )}
          </div>

          {/* Center VS */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="absolute top-0 bottom-0 w-px"
              style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(16,185,129,.6) 50%, transparent 100%)' }} />
            <span className="relative text-lg font-black px-3 py-1 rounded-xl"
              style={{ background: 'rgba(7,26,16,.85)', color: '#fff', border: '1px solid rgba(16,185,129,.55)', backdropFilter: 'blur(8px)', boxShadow: '0 0 24px rgba(16,185,129,.55), 0 0 48px rgba(16,185,129,.2)' }}>
              VS
            </span>
          </div>

          {/* Bottom team overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pt-10 pb-3 z-10"
            style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(8,13,20,.97) 100%)' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <TeamBadge teamName={contest.team_a?.name} size="sm" className="ring-2 ring-white shrink-0" />
                {contest.team_a_captain_name && (
                  <p className="text-[0.6rem] truncate" style={{ color: '#34d399' }}>Capt: {contest.team_a_captain_name}</p>
                )}
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
                <TeamBadge teamName={contest.team_b?.name} size="sm" className="ring-2 ring-white shrink-0" />
                {contest.team_b_captain_name && (
                  <p className="text-[0.6rem] truncate text-right" style={{ color: '#34d399' }}>Capt: {contest.team_b_captain_name}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Match meta strip */}
        <div className="px-4 pt-3 pb-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{contest.team_a?.name} v {contest.team_b?.name}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{subHeader}</p>
            </div>
            <div className="flex flex-col items-end shrink-0 gap-0.5">
              <p className="text-[0.6rem]" style={{ color: '#475569' }}>
                {new Date(contest.match_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              {contest.prize && (
                <p className="text-[0.6rem] font-semibold" style={{ color: '#34d399' }}>🏆 {contest.prize}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Single tab bar ── */}
      <div className="flex gap-2">
        {['my team', 'super selectors', 'scorecard'].map((t) => (
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
      {tab === 'scorecard' ? (
        <Scorecard contest={contest} />
      ) : tab === 'super selectors' ? (
        <>
          {!contest.is_locked && (
            <p className="text-xs flex items-center gap-1" style={{ color: '#64748b' }}>
              🔒 Team picks are hidden until the contest is locked
            </p>
          )}
          <LeaderboardTable
            entries={leaderboard}
            currentUserId={user?.id}
            getTeamPath={contest.is_locked ? (e) => `/contests/${id}/teams/${e.user_id}` : null}
            prize={contest.prize}
          />
        </>
      ) : (
        /* My Team tab */
        myTeam ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gradient text-2xl font-black">{myTeam.total_points.toFixed(1)}</p>
                <p className="text-xs" style={{ color: '#64748b' }}>Total Points</p>
              </div>
              {isOpen && (
                <Link
                  to={`/contests/${id}/team-builder`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                  style={{ border: '1px solid rgba(16,185,129,.4)', color: '#34d399' }}
                >
                  Edit Team
                </Link>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {myTeam.players
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
        ) : isOpen ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm" style={{ color: '#64748b' }}>You haven't built a team yet.</p>
            <Link
              to={`/contests/${id}/team-builder`}
              className="font-semibold px-6 py-2.5 rounded-xl transition hover:opacity-90 text-sm"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}
            >
              Create My Team
            </Link>
          </div>
        ) : (
          <p className="text-center py-6 text-sm" style={{ color: '#475569' }}>Team selection is closed.</p>
        )
      )}
    </div>
  )
}
