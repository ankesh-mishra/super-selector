import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tournamentsApi } from '../api/endpoints'
import TeamBadge from '../components/TeamBadge'
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

function sortContests(contests) {
  return [...contests].sort((a, b) => {
    const order = (c) => {
      if (!c.is_completed && c.is_locked) return 0
      if (!c.is_completed && !c.is_locked) return 1
      return 2
    }
    return order(a) - order(b) || new Date(a.match_date) - new Date(b.match_date)
  })
}

function ContestCard({ c }) {
  const countdown = useCountdown(c.match_date)
  const captainSrcA = getTeamCaptain(c.team_a?.name)
  const captainSrcB = getTeamCaptain(c.team_b?.name)
  const isLive = c.is_locked && !c.is_completed
  const isDone = c.is_completed

  let timeVal, timeColor
  if (isDone)       { timeVal = 'Ended';    timeColor = '#64748b' }
  else if (isLive)  { timeVal = 'Live';     timeColor = '#f87171' }
  else if (countdown){ timeVal = countdown; timeColor = '#34d399' }
  else               { timeVal = new Date(c.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); timeColor = '#94a3b8' }

  return (
    <Link
      to={`/contests/${c.id}`}
      className="rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:brightness-110"
      style={{
        background: '#080d14',
        border: `1px solid ${isLive ? 'rgba(239,68,68,.45)' : isDone ? 'rgba(100,116,139,.2)' : 'rgba(16,185,129,.25)'}`,
        boxShadow: isLive ? '0 0 16px rgba(239,68,68,.08)' : 'none',
      }}
    >
      {/* Cinematic image area */}
      <div className="relative h-28">
        {/* Left captain */}
        <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          {captainSrcA && <img src={captainSrcA} alt="" className="w-full h-full object-cover object-top" />}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(90deg, rgba(8,13,20,.3) 0%, rgba(8,13,20,.85) 100%)' }} />
        </div>
        {/* Right captain */}
        <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
          {captainSrcB && <img src={captainSrcB} alt="" className="w-full h-full object-cover object-top" />}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(270deg, rgba(8,13,20,.3) 0%, rgba(8,13,20,.85) 100%)' }} />
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 pt-2.5 z-10">
          <span className="inline-flex items-center gap-0.5 text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full"
            style={isLive
              ? { background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.35)', color: '#f87171' }
              : isDone
              ? { background: 'rgba(100,116,139,.15)', border: '1px solid rgba(100,116,139,.25)', color: '#64748b' }
              : { background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.35)', color: '#34d399' }}>
            <svg className="w-1.5 h-1.5 fill-current" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" /></svg>
            {isDone ? 'Ended' : isLive ? 'Live' : 'Open'}
          </span>
          {c.match_number != null && (
            <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,.55)', color: '#64748b', backdropFilter: 'blur(6px)' }}>
              Match #{c.match_number}
            </span>
          )}
        </div>

        {/* Center VS */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="absolute top-0 bottom-0 w-px"
            style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(16,185,129,.5) 50%, transparent 100%)' }} />
          <span className="relative text-[0.6rem] font-black px-1.5 py-0.5 rounded-lg"
            style={{ background: 'rgba(7,26,16,.85)', color: '#fff', border: '1px solid rgba(16,185,129,.5)', backdropFilter: 'blur(8px)', boxShadow: '0 0 10px rgba(16,185,129,.5)' }}>
            VS
          </span>
        </div>

        {/* Bottom team names */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pt-6 pb-2 z-10"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(8,13,20,.97) 100%)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <TeamBadge teamName={c.team_a?.name} size="xs" className="ring-1 ring-white shrink-0" />
              <p className="text-[0.6rem] font-bold text-white leading-tight truncate">{c.team_a?.name}</p>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-row-reverse">
              <TeamBadge teamName={c.team_b?.name} size="xs" className="ring-1 ring-white shrink-0" />
              <p className="text-[0.6rem] font-bold text-white leading-tight truncate">{c.team_b?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div className="flex items-center justify-between px-3 py-1.5"
        style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div className="flex items-center gap-1">
          <img src="/card-icons/starts%20in.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
          <span className="text-[0.6rem] font-bold" style={{ color: timeColor }}>{timeVal}</span>
        </div>
        <div className="flex items-center gap-1">
          <img src="/card-icons/prize%20pool.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
          <span className="text-[0.6rem] font-bold text-white">{c.prize || 'Winner Badge'}</span>
        </div>
      </div>
    </Link>
  )
}

export default function TournamentDetailPage() {
  const { id } = useParams()

  const { data: tournament, isLoading, isError } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentsApi.get(id).then((r) => r.data),
  })

  if (isLoading) return <p className="text-center py-12 text-sm" style={{ color: '#64748b' }}>Loading…</p>
  if (isError)   return <p className="text-center py-12 text-red-400">Tournament not found.</p>

  const sorted = sortContests(tournament.contests || [])

  return (
    <div className="flex flex-col gap-6">
      {/* Back nav */}
      <Link to="/tournaments" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition">
        ← Tournaments
      </Link>

      {/* Header */}
      <div
        className="rounded-2xl p-5"
        style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <img
            src={tournament.sport === 'BADMINTON' ? '/sports-logos/Badminton.jpg' : '/sports-logos/Cricket.png'}
            alt={tournament.sport}
            className="w-7 h-7 object-contain shrink-0"
          />
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,.15)', color: '#34d399', border: '1px solid rgba(16,185,129,.3)' }}>
            {tournament.sport === 'BADMINTON' ? 'Badminton' : 'Cricket'}
          </span>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={
              tournament.is_active
                ? { background: 'rgba(16,185,129,.1)', color: '#34d399', border: '1px solid rgba(16,185,129,.25)' }
                : { background: 'rgba(100,116,139,.15)', color: '#64748b', border: '1px solid rgba(100,116,139,.25)' }
            }
          >
            {tournament.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <h2 className="text-xl font-bold text-white">{tournament.name}</h2>
        {tournament.description && (
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>{tournament.description}</p>
        )}
        {(tournament.start_date || tournament.end_date) && (
          <p className="text-xs mt-2" style={{ color: '#475569' }}>
            {tournament.start_date && new Date(tournament.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {tournament.start_date && tournament.end_date && ' – '}
            {tournament.end_date && new Date(tournament.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Leaderboard CTA */}
      <Link
        to={`/tournaments/${id}/leaderboard`}
        className="flex items-center justify-between rounded-xl px-4 py-3 transition hover:brightness-110"
        style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.25)' }}
      >
        <span className="text-sm font-semibold text-emerald-400">📊 Tournament Leaderboard</span>
        <svg className="w-4 h-4" style={{ color: '#34d399' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      {/* Contests */}
      <div>
        <h3 className="font-semibold text-sm text-white mb-3">
          Contests
          {sorted.length > 0 && <span className="ml-2 font-normal" style={{ color: '#475569' }}>({sorted.length})</span>}
        </h3>

        {sorted.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#0f1623', border: '1px dashed #1e2d42' }}>
            <p className="text-sm" style={{ color: '#475569' }}>No contests scheduled yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((c) => <ContestCard key={c.id} c={c} />)}
          </div>
        )}
      </div>
    </div>
  )
}
