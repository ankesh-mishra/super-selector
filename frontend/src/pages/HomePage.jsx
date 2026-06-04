import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { contestsApi, myContestsApi, playersApi, tournamentsApi, leaderboardApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import LeaderboardTable from '../components/LeaderboardTable'
import TeamBadge from '../components/TeamBadge'
import CaptainBadge from '../components/CaptainBadge'
import PlayerAvatar from '../components/PlayerAvatar'
import ContestCard from '../components/ContestCard'
import { getTournamentLogo } from '../utils/tournamentLogos'
import { getTeamCaptain } from '../utils/teamLogos'
import { formatPoints } from '../utils/points'

// ── Helpers ───────────────────────────────────────────────────────────────────

function sortActive(myContests) {
  return [...myContests]
    .filter((mc) => mc.contest && !mc.contest.is_completed)
    .sort((a, b) => {
      if (a.contest.is_locked && !b.contest.is_locked) return -1
      if (!a.contest.is_locked && b.contest.is_locked) return 1
      return new Date(a.contest.match_date) - new Date(b.contest.match_date)
    })
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: '#334155' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function useCountdown(targetDate) {
  const [diff, setDiff] = useState(() => Math.max(0, new Date(targetDate) - Date.now()))
  useEffect(() => {
    const id = setInterval(() => setDiff(Math.max(0, new Date(targetDate) - Date.now())), 1000)
    return () => clearInterval(id)
  }, [targetDate])
  if (!targetDate || diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`
}

const CARD_STYLE = {
  background: 'linear-gradient(#111827,#111827) padding-box, linear-gradient(135deg,rgba(16,185,129,.5),rgba(6,182,212,.3)) border-box',
  border: '1px solid transparent',
}

// ── Sections ──────────────────────────────────────────────────────────────────

function SectionHeader({ title, linkTo, linkLabel }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-base font-bold text-white">{title}</h2>
      {linkTo && (
        <Link to={linkTo} className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition">
          {linkLabel || 'View all →'}
        </Link>
      )}
    </div>
  )
}

// ── Featured Contest ──────────────────────────────────────────────────────────

function FeaturedContest({ contests, user }) {
  const navigate = useNavigate()
  const featured = [...contests]
    .filter((c) => !c.is_locked)
    .sort((a, b) => {
      // sponsored first, then most participants
      if (a.sponsor_name && !b.sponsor_name) return -1
      if (!a.sponsor_name && b.sponsor_name) return 1
      return (b.participant_count || 0) - (a.participant_count || 0)
    })[0]
  const countdown = useCountdown(featured?.match_date)

  // Compact version for the info row: "2h 30m" / "45m"
  const compactCountdown = (() => {
    if (!countdown) return null
    const [hPart, mPart] = countdown.split(' ')
    const h = parseInt(hPart), m = parseInt(mPart)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  })()

  if (!featured) return null

  const tournamentLogo = getTournamentLogo(featured.tournament_name)
  const captainSrcA = getTeamCaptain(featured.team_a_name)
  const captainSrcB = getTeamCaptain(featured.team_b_name)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#080d14',
        border: '1px solid rgba(16,185,129,.35)',
        boxShadow: '0 0 40px rgba(16,185,129,.12)',
      }}
    >
      {/* ── Cinematic image area ── */}
      <div className="relative h-52">
        {/* Left captain */}
        <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          {captainSrcA && (
            <img src={captainSrcA} alt={featured.team_a_name}
              className="w-full h-full object-cover object-top" />
          )}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(90deg, rgba(8,13,20,.3) 0%, rgba(8,13,20,.85) 100%)' }} />
        </div>

        {/* Right captain */}
        <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
          {captainSrcB && (
            <img src={captainSrcB} alt={featured.team_b_name}
              className="w-full h-full object-cover object-top" />
          )}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(270deg, rgba(8,13,20,.3) 0%, rgba(8,13,20,.85) 100%)' }} />
        </div>

        {/* Top bar overlay */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3 z-10">
          <div className="flex items-center gap-2">
            {tournamentLogo && (
              <img src={tournamentLogo} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
            )}
            <span
              className="text-[0.6rem] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,.55)', color: '#34d399', border: '1px solid rgba(16,185,129,.45)', backdropFilter: 'blur(6px)' }}
            >
              ✦ Featured
            </span>
            {featured.is_locked && (
              <span className="text-[0.6rem] font-semibold text-red-400 px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,.55)' }}>🔴 Live</span>
            )}
          </div>
          {countdown && !featured.is_locked && (
            <span className="text-[0.65rem] font-semibold tabular-nums px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,.55)', color: '#94a3b8', backdropFilter: 'blur(6px)' }}>
              ⏱ {countdown}
            </span>
          )}
        </div>

        {/* Center VS */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="absolute top-0 bottom-0 w-px"
            style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(16,185,129,.6) 50%, transparent 100%)' }} />
          <span className="relative text-lg font-black px-3 py-1 rounded-xl"
            style={{
              background: 'rgba(7,26,16,.85)',
              color: '#fff',
              border: '1px solid rgba(16,185,129,.55)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 0 24px rgba(16,185,129,.55), 0 0 48px rgba(16,185,129,.2)',
            }}>
            VS
          </span>
        </div>

        {/* Bottom team info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pt-10 pb-3 z-10"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(8,13,20,.97) 100%)' }}>
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <TeamBadge teamName={featured.team_a_name} size="sm" className="ring-2 ring-white shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white leading-tight truncate">{featured.team_a_name}</p>
                {featured.team_a_captain_name && (
                  <p className="text-[0.6rem] truncate" style={{ color: '#34d399' }}>Capt: {featured.team_a_captain_name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
              <TeamBadge teamName={featured.team_b_name} size="sm" className="ring-2 ring-white shrink-0" />
              <div className="min-w-0 text-right">
                <p className="text-xs font-bold text-white leading-tight truncate">{featured.team_b_name}</p>
                {featured.team_b_captain_name && (
                  <p className="text-[0.6rem] truncate" style={{ color: '#34d399' }}>Capt: {featured.team_b_captain_name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info row ── */}
      <div className="flex items-center justify-around px-4 py-2"
        style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
        {/* Sponsor/Manager */}
        {featured.sponsor_name ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm">💛</span>
            <div className="flex flex-col min-w-0">
              <span className="text-[0.55rem] leading-tight" style={{ color: '#475569' }}>Sponsor</span>
              <span className="text-[0.65rem] font-bold leading-tight truncate max-w-[70px]" style={{ color: '#facc15' }}>{featured.sponsor_name}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-sm">💛</span>
            <div className="flex flex-col min-w-0">
              <span className="text-[0.55rem] leading-tight" style={{ color: '#475569' }}>Sponsor</span>
              <span className="text-[0.65rem] font-bold leading-tight" style={{ color: '#94a3b8' }}>Open</span>
            </div>
          </div>
        )}
        {!featured.is_locked && compactCountdown ? (
          <div className="flex items-center gap-1.5">
            <img src="/card-icons/starts%20in.png" alt="" className="w-4 h-4 object-contain shrink-0" />
            <div className="flex flex-col">
              <span className="text-[0.55rem] leading-tight" style={{ color: '#475569' }}>Starts in</span>
              <span className="text-[0.65rem] font-bold leading-tight tabular-nums" style={{ color: '#34d399' }}>{compactCountdown}</span>
            </div>
          </div>
        ) : featured.is_locked ? (
          <div className="flex items-center gap-1.5">
            <img src="/card-icons/starts%20in.png" alt="" className="w-4 h-4 object-contain shrink-0" />
            <div className="flex flex-col">
              <span className="text-[0.55rem] leading-tight" style={{ color: '#475569' }}>Status</span>
              <span className="text-[0.65rem] font-bold leading-tight text-red-400">Live Now</span>
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{{'CASH':'💵','DRINKS':'🍷','FNB':'🍽️','GIFTS':'🎁','OTHERS':'⭐'}[featured.prize_type] || '🏆'}</span>
          <div className="flex flex-col">
            <span className="text-[0.55rem] leading-tight" style={{ color: '#475569' }}>Prize</span>
            <span className="text-[0.65rem] font-bold leading-tight text-white">{(featured.prize || 'Winner Badge').replace('Winner Badge', 'Badge')}</span>
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="px-4 pb-4 pt-1">
        <button
          onClick={() => user ? navigate(`/contests/${featured.id}`) : navigate('/login?register=1')}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-[.98] flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 20px rgba(16,185,129,.4)' }}
        >
          <span>⚡</span>
          {user ? 'Enter Contest' : 'Register & Join'}
          <span>→</span>
        </button>
      </div>
    </div>
  )
}

// ── Trending Contests ─────────────────────────────────────────────────────────

function TrendingContests({ contests, user }) {
  if (contests.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: '#475569' }}>No open contests at the moment.</p>
    )
  }
  return (
    <div className="-mx-4 overflow-x-hidden">
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 scroll-pl-4 snap-x snap-mandatory">
        {contests.map((c) => (
          <ContestCard
            key={c.id}
            to={user ? `/contests/${c.id}` : '/login?register=1'}
            isLive={c.is_locked && !c.is_completed}
            isDone={c.is_completed}
            matchDate={c.match_date}
            teamAName={c.team_a_name}
            teamBName={c.team_b_name}
            topRight={c.tournament_name}
            prize={c.prize}
            prizeType={c.prize_type}
            sponsorName={c.sponsor_name}
            size="sm"
          />
        ))}
      </div>
    </div>
  )
}

// ── My Contests ───────────────────────────────────────────────────────────────

function MyContests({ myContests }) {
  const activeContests = sortActive(myContests).slice(0, 2)

  if (activeContests.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: 'linear-gradient(#0f1623,#0f1623) padding-box, linear-gradient(135deg,rgba(16,185,129,.4),rgba(6,182,212,.25)) border-box', border: '1px solid transparent' }}
      >
        <img src="/sports-logos/Badminton.jpg" alt="Badminton" className="w-12 h-12 object-contain mx-auto mb-2" />
        <p className="text-sm mb-3" style={{ color: '#64748b' }}>No active contests yet.</p>
        <Link to="/tournaments" className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition">
          Browse tournaments →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {activeContests.map((mc) => {
        const isLive = mc.contest.is_locked
        return (
          <Link
            key={mc.id}
            to={`/contests/${mc.contest.id}`}
            className="rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all duration-200 hover:brightness-110"
            style={{
              background: '#0f1623',
              border: `1px solid ${isLive ? 'rgba(239,68,68,.45)' : 'rgba(16,185,129,.22)'}`,
              boxShadow: isLive ? '0 0 14px rgba(239,68,68,.08)' : 'none',
            }}
          >
            {/* Status badge */}
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full"
              style={isLive
                ? { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', color: '#f87171' }
                : { background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', color: '#34d399' }}>
              <svg className="w-1.5 h-1.5 fill-current" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" /></svg>
              {isLive ? 'Live' : 'Open'}
            </span>

            {/* Match info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white leading-tight truncate">
                {(mc.contest.team_a?.name && mc.contest.team_b?.name)
                  ? `${mc.contest.team_a.name} vs ${mc.contest.team_b.name}`
                  : mc.contest.name}
              </p>
              {mc.contest.tournament?.name && (
                <p className="text-[0.6rem] truncate leading-tight mt-0.5" style={{ color: '#475569' }}>
                  {mc.contest.match_number != null ? `Match #${mc.contest.match_number} · ` : ''}{mc.contest.tournament.name}
                </p>
              )}
            </div>

            {/* Points + rank */}
            <div className="shrink-0 text-right">
              <div className="flex items-baseline gap-0.5 justify-end">
                <span className="text-sm font-black text-gradient">{formatPoints(mc.total_points)}</span>
                <span className="text-[0.6rem]" style={{ color: '#64748b' }}>pts</span>
              </div>
              {mc.rank != null && (
                <p className="text-[0.6rem] leading-tight" style={{ color: '#64748b' }}>
                  #{mc.rank}<span style={{ color: '#334155' }}>/{mc.total_participants}</span>
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ── Trending Players ──────────────────────────────────────────────────────────

function TrendingPlayers({ players }) {
  if (players.length === 0) {
    return <p className="text-sm text-center py-6" style={{ color: '#475569' }}>No player data yet.</p>
  }

  return (
    <div className="-mx-4 overflow-x-hidden">
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 scroll-pl-4 snap-x snap-mandatory">
      {players.map((p) => (
        <Link
          key={p.id}
          to={`/players/${p.id}`}
          className="flex-none w-[4.5rem] rounded-xl p-1.5 snap-start text-center transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.6),0_0_20px_rgba(16,185,129,0.35)] hover:brightness-[1.1]"
          style={CARD_STYLE}
        >
          <PlayerAvatar player={p} size="sm" className="mx-auto mb-1" />
          <p className="text-[0.65rem] font-semibold text-white truncate leading-tight">{p.name}</p>
          <p className="text-[0.55rem] truncate" style={{ color: '#64748b' }}>{p.team?.name}</p>
        </Link>
      ))}
      </div>
    </div>
  )
}

// ── Leaderboard Podium ───────────────────────────────────────────────────────

function Podium({ entries }) {
  if (entries.length < 2) return null
  const [first, second, third] = [entries[0], entries[1], entries[2]]
  const visual = [
    { e: second, rank: 2, avatarCls: 'w-11 h-11 text-sm', podiumCls: 'h-10' },
    { e: first,  rank: 1, avatarCls: 'w-14 h-14 text-base', podiumCls: 'h-16' },
    { e: third,  rank: 3, avatarCls: 'w-9 h-9 text-xs',   podiumCls: 'h-7'  },
  ].filter((p) => p.e)

  const RS = {
    1: { ring: 'rgba(250,204,21,.6)',  bg: 'rgba(250,204,21,.12)', badge: '#fbbf24', glow: '0 0 16px rgba(250,204,21,.25)' },
    2: { ring: 'rgba(148,163,184,.4)', bg: 'rgba(148,163,184,.08)', badge: '#94a3b8', glow: 'none' },
    3: { ring: 'rgba(234,88,12,.4)',   bg: 'rgba(234,88,12,.08)',   badge: '#f97316', glow: 'none' },
  }

  return (
    <div className="flex items-end justify-center gap-2 mb-3 px-2">
      {visual.map(({ e, rank, avatarCls, podiumCls }) => {
        const s = RS[rank]
        const name = e.team_name || e.user_name
        return (
          <div key={e.user_id} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span
              className="text-[0.6rem] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: s.bg, color: s.badge, border: `1px solid ${s.ring}` }}
            >
              #{rank}
            </span>
            <div
              className={`${avatarCls} rounded-full flex items-center justify-center font-black text-white`}
              style={{ background: s.bg, border: `2px solid ${s.ring}`, boxShadow: s.glow }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <p className="text-[0.7rem] font-semibold text-white text-center truncate w-full px-1 leading-tight">{e.team_name || e.user_name}</p>
            {e.team_name && e.user_name && (
              <p className="text-[0.6rem] text-center truncate w-full px-1" style={{ color: '#94a3b8' }}>{e.user_name}</p>
            )}
            <p className="text-xs font-black" style={{ color: rank === 1 ? '#34d399' : '#94a3b8' }}>
              {formatPoints(e.total_points)}
            </p>
            <div
              className={`w-full rounded-t-lg mt-0.5 ${podiumCls}`}
              style={{ background: `linear-gradient(180deg,${s.bg},transparent)`, border: `1px solid ${s.ring}`, borderBottom: 'none' }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── Tournament Leaderboard ────────────────────────────────────────────────────

function TournamentLeaderboard({ tournaments, user }) {
  const [selectedId, setSelectedId] = useState(null)

  // Default to tournament with most total_games once data loads
  useEffect(() => {
    if (tournaments.length > 0 && selectedId === null) {
      const best = tournaments.reduce((a, b) =>
        (a.total_games ?? 0) >= (b.total_games ?? 0) ? a : b
      )
      setSelectedId(best.id)
    }
  }, [tournaments, selectedId])

  const activeTournamentId = selectedId || tournaments[0]?.id

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['leaderboard', 'tournament', activeTournamentId],
    queryFn: () => leaderboardApi.tournament(activeTournamentId).then((r) => r.data),
    enabled: !!activeTournamentId,
  })

  if (tournaments.length === 0) return null

  const selected = tournaments.find((t) => t.id === activeTournamentId)

  return (
    <section
      className="rounded-2xl p-4"
      style={{
        background: `
          radial-gradient(ellipse at 50% 0%, rgba(250,204,21,.13) 0%, transparent 55%),
          radial-gradient(ellipse at 15% 80%, rgba(16,185,129,.08) 0%, transparent 45%),
          radial-gradient(ellipse at 85% 80%, rgba(234,88,12,.07) 0%, transparent 45%),
          #0a1120
        `,
        border: '1px solid rgba(250,204,21,.18)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-white">Super Selectors</h2>
        <div className="flex items-center gap-3">
          {tournaments.length > 1 && (
            <select
              value={activeTournamentId || ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="text-xs rounded-lg px-2 py-1 outline-none"
              style={{ background: '#0f1623', border: '1px solid #1e2d42', color: '#94a3b8' }}
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selected && tournaments.length === 1 && (
        <p className="text-xs mb-3" style={{ color: '#64748b' }}>{selected.name}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-center py-6" style={{ color: '#64748b' }}>Loading…</p>
      ) : entries.length < 3 ? (
        <LeaderboardTable entries={entries} currentUserId={user?.id} showContests />
      ) : (
        <>
          <Podium entries={entries} />
          {entries.length > 3 && (
            <LeaderboardTable entries={entries.slice(3, 8)} currentUserId={user?.id} showContests />
          )}
        </>
      )}
      {activeTournamentId && (
        <Link
          to={`/tournaments/${activeTournamentId}/leaderboard`}
          className="mt-2 block text-right text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
        >
          View all →
        </Link>
      )}

    </section>
  )
}


export default function HomePage() {
  const { user } = useAuth()

  const { data: trendingContests = [] } = useQuery({
    queryKey: ['contests', 'trending'],
    queryFn: () => contestsApi.trending().then((r) => r.data),
  })

  const { data: myContests = [] } = useQuery({
    queryKey: ['my-contests'],
    queryFn: () => myContestsApi.list().then((r) => r.data),
    enabled: !!user,
  })

  const { data: trendingPlayers = [] } = useQuery({
    queryKey: ['players', 'trending'],
    queryFn: () => playersApi.trending().then((r) => r.data),
  })

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments', 'active'],
    queryFn: () => tournamentsApi.list({ active: true }).then((r) => r.data),
  })

  return (
    <div className="flex flex-col gap-3">

      {/* ── Featured Contest ── */}
      {trendingContests.some((c) => !c.is_locked) && (
        <FeaturedContest contests={trendingContests} user={user} />
      )}

      {/* ── My Contests (logged-in only) ── */}
      {user && (
        <section>
          <SectionHeader
            title="My Contests"
            linkTo={myContests.length > 0 ? '/my-contests' : undefined}
            linkLabel="View all →"
          />
          <MyContests myContests={myContests} />
        </section>
      )}

      {/* ── Trending Contests ── */}
      <section>
        <SectionHeader title="Trending Contests" linkTo="/tournaments" linkLabel="View all →" />
        <TrendingContests contests={trendingContests} user={user} />
      </section>

      {/* ── Selector's Favs ── */}
      <section>
        <SectionHeader title="Selector's Favs" linkTo="/players" linkLabel="View all →" />
        <TrendingPlayers players={trendingPlayers} />
      </section>

      {/* ── Tournament Leaderboard ── */}
      <TournamentLeaderboard tournaments={tournaments} user={user} />

    </div>
  )
}

