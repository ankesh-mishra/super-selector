import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { contestsApi, userTeamsApi, leaderboardApi } from '../api/endpoints'
import TeamBadge from '../components/TeamBadge'
import LeaderboardTable from '../components/LeaderboardTable'
import { useAuth } from '../context/AuthContext'

function StatusBadge({ contest }) {
  if (contest.is_completed) return <span className="badge-completed text-xs font-semibold px-2.5 py-1 rounded-full">Completed</span>
  if (contest.is_locked)    return <span className="badge-live text-xs font-semibold px-2.5 py-1 rounded-full">🔴 Live</span>
  return                           <span className="badge-open text-xs font-semibold px-2.5 py-1 rounded-full">Open</span>
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
                  const aWon = s.team_a_points > s.team_b_points
                  return (
                    <div key={i} className="grid grid-cols-3 items-center text-xs">
                      <span className="font-black text-base" style={{ color: aWon ? '#34d399' : '#475569' }}>{s.team_a_points}</span>
                      <span className="text-center" style={{ color: '#475569' }}>set {i + 1}</span>
                      <span className="font-black text-base text-right" style={{ color: !aWon ? '#34d399' : '#475569' }}>{s.team_b_points}</span>
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
  const [tab, setTab] = useState('leaderboard')

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

  if (isLoading) return <p className="text-center py-12" style={{ color: '#64748b' }}>Loading…</p>
  if (!contest) return <p className="text-center py-12 text-red-400">Contest not found.</p>

  const isOpen = !contest.is_locked
  const tournamentName = contest.tournament?.name
  const subHeader = contest.match_number != null && tournamentName
    ? `Match #${contest.match_number} - ${tournamentName}`
    : contest.match_number != null
    ? `Match #${contest.match_number}`
    : tournamentName || null

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => navigate(-1)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start">← Back</button>

      {/* ── Hero card: VS matchup ── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(#0f1623,#0f1623) padding-box, linear-gradient(135deg,#10b981,#06b6d4) border-box',
          border: '1px solid transparent',
          boxShadow: '0 0 24px rgba(16,185,129,.1), 0 8px 32px rgba(0,0,0,.4)',
        }}
      >
        {subHeader && (
          <p className="text-xs font-semibold text-emerald-400 mb-1 tracking-wide uppercase">{subHeader}</p>
        )}
        <div className="flex items-center gap-2 mb-3">
          <StatusBadge contest={contest} />
          <span className="text-xs" style={{ color: '#64748b' }}>
            {new Date(contest.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <h2 className="text-lg font-bold text-white mb-4">{contest.name}</h2>
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamBadge teamName={contest.team_a?.name} size="lg" />
            <p className="font-bold text-sm text-white text-center leading-tight">{contest.team_a?.name}</p>
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0 px-4">
            <span className="text-2xl font-black tracking-widest"
              style={{ background: 'linear-gradient(135deg,#e2e8f0,#94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >VS</span>
          </div>
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamBadge teamName={contest.team_b?.name} size="lg" />
            <p className="font-bold text-sm text-white text-center leading-tight">{contest.team_b?.name}</p>
          </div>
        </div>
        <div className="mt-4 pt-3 flex flex-col gap-0.5" style={{ borderTop: '1px solid #1e2d42' }}>
          <p className="text-xs" style={{ color: '#64748b' }}>
            <span style={{ color: '#94a3b8' }}>Match:</span> {new Date(contest.match_date).toLocaleString('en-IN')}
          </p>
          <p className="text-xs" style={{ color: '#64748b' }}>
            <span style={{ color: '#94a3b8' }}>Cutoff:</span> {new Date(contest.registration_cutoff).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* ── Single tab bar ── */}
      <div className="flex gap-2">
        {['my team', 'leaderboard', 'scorecard'].map((t) => (
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
      ) : tab === 'leaderboard' ? (
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
            <div className="flex flex-col gap-2">
              {myTeam.players
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
