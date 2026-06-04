import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { myContestsApi } from '../api/endpoints'
import { formatPoints } from '../utils/points'

function statusChip(contest) {
  if (contest.is_completed) return { label: 'Completed', cls: 'badge-completed' }
  if (contest.is_locked)    return { label: '🔴 Live',   cls: 'badge-live' }
  return                           { label: 'Open',      cls: 'badge-open' }
}

function ContestRow({ mc }) {
  const { label, cls } = statusChip(mc.contest)
  const teams = `${mc.contest.team_a?.name ?? '?'} vs ${mc.contest.team_b?.name ?? '?'}`
  const tourName = mc.contest.tournament_name || mc.contest.tournament?.name || ''
  const secondary = mc.contest.match_number
    ? `Match #${mc.contest.match_number}${tourName ? ` · ${tourName}` : ''}`
    : tourName

  const isUpcoming = !mc.contest.is_locked && !mc.contest.is_completed
  const rankDisplay = isUpcoming
    ? `— / ${mc.total_participants}`
    : `#${mc.rank ?? '?'} / ${mc.total_participants}`

  return (
    <Link
      to={`/contests/${mc.contest.id}`}
      className="rounded-xl px-3 py-2.5 transition hover:brightness-110 flex items-center gap-3"
      style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
    >
      {/* Left: match info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-white text-sm leading-tight truncate">{teams}</p>
          <span className={`shrink-0 text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
        </div>
        {secondary && (
          <p className="text-xs truncate" style={{ color: '#475569' }}>{secondary}</p>
        )}
        <p className="text-[0.65rem] mt-0.5" style={{ color: '#334155' }}>
          {new Date(mc.contest.match_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {/* Right: points + rank */}
      <div className="shrink-0 text-right">
        <span className="text-gradient font-black text-lg leading-none">{formatPoints(mc.total_points)}</span>
        <span className="text-[0.65rem] block" style={{ color: '#64748b' }}>pts</span>
        <span className="text-[0.6rem] block mt-0.5" style={{ color: '#475569' }}>{rankDisplay}</span>
      </div>
    </Link>
  )
}

function FilterSelect({ label, options, value, onChange }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="text-[0.6rem] font-semibold uppercase tracking-widest block mb-1" style={{ color: '#334155' }}>{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full text-xs rounded-lg px-2.5 py-1.5 appearance-none font-medium outline-none focus:ring-1 focus:ring-emerald-500/40"
        style={{ background: '#0a1120', border: '1px solid #1e2d42', color: value ? '#e2e8f0' : '#64748b' }}
      >
        <option value="">All {label}s</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

export default function MyContestsPage() {
  const navigate = useNavigate()
  const { data: myContests = [], isLoading } = useQuery({
    queryKey: ['my-contests'],
    queryFn: () => myContestsApi.list().then((r) => r.data),
  })

  const [filterTournament, setFilterTournament] = useState(null)
  const [filterTeam, setFilterTeam] = useState(null)

  const valid = useMemo(() => myContests.filter((mc) => mc.contest), [myContests])

  const tournaments = useMemo(() => {
    const names = valid.map((mc) => mc.contest.tournament_name || mc.contest.tournament?.name).filter(Boolean)
    return [...new Set(names)].sort()
  }, [valid])

  const teams = useMemo(() => {
    const names = valid.flatMap((mc) => [mc.contest.team_a?.name, mc.contest.team_b?.name]).filter(Boolean)
    return [...new Set(names)].sort()
  }, [valid])

  if (isLoading) return <p className="text-center py-12 text-sm" style={{ color: '#64748b' }}>Loading…</p>

  // Apply filters
  const filtered = valid.filter((mc) => {
    if (filterTournament) {
      const t = mc.contest.tournament_name || mc.contest.tournament?.name
      if (t !== filterTournament) return false
    }
    if (filterTeam) {
      const { team_a, team_b } = mc.contest
      if (team_a?.name !== filterTeam && team_b?.name !== filterTeam) return false
    }
    return true
  })

  const active = [...filtered]
    .filter((mc) => !mc.contest.is_completed)
    .sort((a, b) => {
      if (a.contest.is_locked && !b.contest.is_locked) return -1
      if (!a.contest.is_locked && b.contest.is_locked) return 1
      return new Date(a.contest.match_date) - new Date(b.contest.match_date)
    })

  const completed = [...filtered]
    .filter((mc) => mc.contest.is_completed)
    .sort((a, b) => new Date(b.contest.match_date) - new Date(a.contest.match_date))

  const hasFilters = tournaments.length > 0 || teams.length > 0

  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => navigate(-1)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start">← Back</button>
      <h2 className="text-lg font-bold text-white">My Contests</h2>

      {/* ── Filters ── */}
      {hasFilters && valid.length > 0 && (
        <div className="flex gap-2" style={{}}>
          {tournaments.length > 0 && (
            <FilterSelect label="Tournament" options={tournaments} value={filterTournament} onChange={setFilterTournament} />
          )}
          {teams.length > 0 && (
            <FilterSelect label="Team" options={teams} value={filterTeam} onChange={setFilterTeam} />
          )}
        </div>
      )}

      {valid.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: '#0f1623', border: '1px dashed #1e2d42' }}
        >
          <p className="text-3xl mb-3">🏸</p>
          <p className="text-sm mb-4" style={{ color: '#64748b' }}>You haven't joined any contests yet.</p>
          <Link
            to="/tournaments"
            className="inline-block font-semibold text-sm px-5 py-2.5 rounded-xl transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}
          >
            Browse Tournaments
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-10 text-sm" style={{ color: '#64748b' }}>No contests match the selected filters.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* ── Live & Upcoming ── */}
          {active.map((mc) => <ContestRow key={mc.id} mc={mc} />)}

          {/* ── Separator ── */}
          {active.length > 0 && completed.length > 0 && (
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px" style={{ background: '#1e2d42' }} />
              <span className="text-[0.6rem] font-semibold uppercase tracking-widest" style={{ color: '#334155' }}>Completed</span>
              <div className="flex-1 h-px" style={{ background: '#1e2d42' }} />
            </div>
          )}

          {/* ── Completed (desc) ── */}
          {completed.map((mc) => <ContestRow key={mc.id} mc={mc} />)}
        </div>
      )}
    </div>
  )
}
