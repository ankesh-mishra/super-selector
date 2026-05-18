import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { contestsApi, myContestsApi, playersApi, tournamentsApi, leaderboardApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import LeaderboardTable from '../components/LeaderboardTable'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusChip(contest) {
  if (contest.is_completed) return { label: 'Completed', cls: 'badge-completed' }
  if (contest.is_locked)    return { label: '🔴 Live',   cls: 'badge-live' }
  return                           { label: 'Open',      cls: 'badge-open' }
}

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

// ── Trending Contests ─────────────────────────────────────────────────────────

function TrendingContests({ contests, user }) {
  const navigate = useNavigate()

  if (contests.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: '#475569' }}>No open contests at the moment.</p>
    )
  }

  return (
    <div className="-mx-4 overflow-x-hidden">
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 scroll-pl-4 snap-x snap-mandatory">
      {contests.map((c) => {
        const { label, cls } = statusChip(c)
        const handleJoin = () =>
          user ? navigate(`/contests/${c.id}`) : navigate('/login?register=1')

        return (
          <div
            key={c.id}
            className="flex-none w-44 rounded-xl p-3 snap-start flex flex-col transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.6),0_0_20px_rgba(16,185,129,0.35)] hover:brightness-[1.1]"
            style={CARD_STYLE}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>
              <span className="text-[0.65rem]" style={{ color: '#475569' }}>
                {new Date(c.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {(c.team_a_name && c.team_b_name) ? (
              <>
                <p className="text-xs font-semibold leading-tight text-white truncate">{c.team_a_name}</p>
                <p className="text-xs font-semibold leading-tight text-white truncate">vs {c.team_b_name}</p>
              </>
            ) : (
              <p className="text-xs font-semibold leading-tight text-white truncate">{c.name}</p>
            )}

            {c.tournament_name && (
              <p className="text-[0.6rem] truncate" style={{ color: '#64748b' }}>{c.tournament_name}</p>
            )}

            <div className="mt-auto pt-2">
              <p className="text-[0.6rem] mb-1" style={{ color: '#475569' }}>
                {c.participant_count > 0 ? `${c.participant_count} joined` : 'Be the first!'}
              </p>
              <button
                onClick={handleJoin}
                className="w-full text-[0.65rem] font-semibold py-1.5 rounded-lg transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}
              >
                {user ? 'Join →' : 'Register & Join →'}
              </button>
            </div>
          </div>
        )
      })}      </div>    </div>
  )
}

// ── My Contests ───────────────────────────────────────────────────────────────

function MyContests({ myContests }) {
  const activeContests = sortActive(myContests)

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
    <div className="-mx-4 overflow-x-hidden">
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 scroll-pl-4 snap-x snap-mandatory">
      {activeContests.map((mc) => {
        const { label, cls } = statusChip(mc.contest)
        return (
          <Link
            key={mc.id}
            to={`/contests/${mc.contest.id}`}
            className="flex-none w-44 rounded-xl p-3 snap-start flex flex-col transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.6),0_0_20px_rgba(16,185,129,0.35)] hover:brightness-[1.1]"
            style={CARD_STYLE}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>
              <span className="text-[0.65rem]" style={{ color: '#475569' }}>
                {new Date(mc.contest.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            {(mc.contest.team_a?.name && mc.contest.team_b?.name) ? (
              <>
                <p className="text-xs font-semibold leading-tight truncate text-white">{mc.contest.team_a.name}</p>
                <p className="text-xs font-semibold leading-tight truncate text-white">vs {mc.contest.team_b.name}</p>
              </>
            ) : (
              <p className="text-xs font-semibold leading-tight truncate text-white">{mc.contest.name}</p>
            )}
            {mc.contest.tournament?.name && (
              <p className="text-[0.6rem] truncate" style={{ color: '#64748b' }}>
                {mc.contest.match_number != null ? `Match #${mc.contest.match_number} · ` : ''}{mc.contest.tournament.name}
              </p>
            )}
            <div className="mt-auto pt-2 flex items-center justify-between" style={{ borderTop: '1px solid #1e293b', marginTop: '8px' }}>
              <div className="flex items-baseline gap-0.5">
                <span className="text-gradient text-base font-black">{mc.total_points}</span>
                <span className="text-[0.6rem]" style={{ color: '#64748b' }}>pts</span>
              </div>
              {mc.contest.is_locked && (
                <span className="text-[0.65rem]" style={{ color: '#64748b' }}>
                  #{mc.rank != null ? mc.rank : '--'}
                  <span style={{ color: '#334155' }}>/{mc.total_participants}</span>
                </span>
              )}
            </div>
          </Link>
        )
      })}
      </div>
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
          className="flex-none w-32 rounded-xl p-3 snap-start text-center transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.6),0_0_20px_rgba(16,185,129,0.35)] hover:brightness-[1.1]"
          style={CARD_STYLE}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,rgba(16,185,129,.25),rgba(6,182,212,.2))', border: '1px solid rgba(16,185,129,.3)' }}
          >
            {p.name.charAt(0).toUpperCase()}
          </div>
          <p className="text-xs font-semibold text-white truncate">{p.name}</p>
          <p className="text-[0.65rem] mt-0.5 truncate" style={{ color: '#64748b' }}>{p.team?.name}</p>
        </Link>
      ))}
      </div>
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
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-white">Leaderboard</h2>
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

      {isLoading
        ? <p className="text-sm text-center py-6" style={{ color: '#64748b' }}>Loading…</p>
        : <LeaderboardTable entries={entries.slice(0, 5)} currentUserId={user?.id} showContests />
      }
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

// ── Page ──────────────────────────────────────────────────────────────────────

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

      {/* ── Trending Contests ── */}
      <section>
        <SectionHeader title="Trending Contests" linkTo="/tournaments" linkLabel="View all →" />
        <TrendingContests contests={trendingContests} user={user} />
      </section>

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

      {/* ── Trending Players ── */}
      <section>
        <SectionHeader title="Selector's Favs" linkTo="/players" linkLabel="View all →" />
        <TrendingPlayers players={trendingPlayers} />
      </section>

      {/* ── Tournament Leaderboard ── */}
      <TournamentLeaderboard tournaments={tournaments} user={user} />

    </div>
  )
}

