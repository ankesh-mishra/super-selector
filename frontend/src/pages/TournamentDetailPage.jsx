import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tournamentsApi } from '../api/endpoints'
import { getTeamCaptain } from '../utils/teamLogos'

function useCountdown(targetDate, active) {
  const [diff, setDiff] = useState(() => active ? Math.max(0, new Date(targetDate) - Date.now()) : 0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setDiff(Math.max(0, new Date(targetDate) - Date.now())), 1000)
    return () => clearInterval(id)
  }, [targetDate, active])
  if (!active || !targetDate || diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
}

function CaptainFace({ teamName }) {
  const [err, setErr] = useState(false)
  const src = getTeamCaptain(teamName)
  return (
    <div className="w-11 h-11 rounded-full shrink-0 overflow-hidden" style={{ background: '#1e2d42', border: '2px solid #253650' }}>
      {src && !err && (
        <img
          src={src}
          alt={teamName}
          onError={() => setErr(true)}
          className="w-full h-full object-cover object-top"
        />
      )}
    </div>
  )
}

function TournamentContestCard({ contest }) {
  const isLive = contest.is_locked && !contest.is_completed
  const isUpcoming = !contest.is_locked && !contest.is_completed
  const countdown = useCountdown(contest.match_date, isUpcoming)

  let statusNode
  if (contest.is_completed) {
    statusNode = contest.winning_team_name
      ? <span className="font-semibold" style={{ color: '#34d399' }}>🏆 {contest.winning_team_name} won</span>
      : <span style={{ color: '#64748b' }}>Ended</span>
  } else if (isLive) {
    statusNode = (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />Live
      </span>
    )
  } else {
    statusNode = countdown
      ? <span className="font-semibold tabular-nums" style={{ color: '#34d399' }}>⏱ {countdown}</span>
      : <span style={{ color: '#64748b' }}>{new Date(contest.match_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
  }

  const prizeTxt = (contest.prize || 'Winner Badge').replace('Winner Badge', 'Badge')

  return (
    <Link
      to={`/contests/${contest.id}`}
      className="rounded-xl px-4 py-3 transition hover:brightness-110 block"
      style={{ background: '#0f1623', border: `1px solid ${isLive ? 'rgba(239,68,68,.35)' : '#1e2d42'}` }}
    >
      {/* Match number */}
      {contest.match_number != null && (
        <p className="text-[0.6rem] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#334155' }}>
          Match #{contest.match_number}
        </p>
      )}
      {/* Captain A | Teams | Captain B */}
      <div className="flex items-center gap-2">
        <CaptainFace teamName={contest.team_a?.name} />
        <p className="flex-1 text-right font-bold text-white text-sm leading-snug">{contest.team_a?.name}</p>
        <span className="shrink-0 text-xs font-semibold w-5 text-center" style={{ color: '#334155' }}>v</span>
        <p className="flex-1 text-left font-bold text-white text-sm leading-snug">{contest.team_b?.name}</p>
        <CaptainFace teamName={contest.team_b?.name} />
      </div>
      {/* Status row */}
      <div className="mt-2 text-center text-xs">
        {statusNode}
      </div>
      {/* Participants + prize strip (live & upcoming only) */}
      {!contest.is_completed && (
        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid #1e2d42' }}>
          <div className="flex items-center gap-1">
            <img src="/card-icons/participants.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
            <span className="text-xs font-bold text-white">{contest.participant_count ?? 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <img src="/card-icons/prize%20pool.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
            <span className="text-xs font-bold text-white">{prizeTxt}</span>
          </div>
        </div>
      )}
    </Link>
  )
}

export default function TournamentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [filterTeam, setFilterTeam] = useState('')

  const { data: tournament, isLoading, isError } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentsApi.get(id).then((r) => r.data),
  })

  if (isLoading) return <p className="text-center py-12 text-sm" style={{ color: '#64748b' }}>Loading…</p>
  if (isError)   return <p className="text-center py-12 text-red-400">Tournament not found.</p>

  const allContests = tournament.contests || []

  // Team filter options from tournament teams
  const teamOptions = (tournament.teams || []).map((t) => t.name).sort()

  const filtered = filterTeam
    ? allContests.filter((c) => c.team_a?.name === filterTeam || c.team_b?.name === filterTeam)
    : allContests

  const active = [...filtered]
    .filter((c) => !c.is_completed)
    .sort((a, b) => {
      if (a.is_locked && !b.is_locked) return -1
      if (!a.is_locked && b.is_locked) return 1
      return new Date(a.match_date) - new Date(b.match_date)
    })

  const completed = [...filtered]
    .filter((c) => c.is_completed)
    .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))

  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => navigate(-1)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start">← Back</button>

      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: '#0f1623', border: '1px solid #1e2d42' }}>
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
            {tournament.start_date && new Date(tournament.start_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {tournament.start_date && tournament.end_date && ' – '}
            {tournament.end_date && new Date(tournament.end_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Contests */}
      <div>
        {/* Header row: title + team filter */}
        <div className="flex items-end justify-between gap-3 mb-3">
          <h3 className="font-semibold text-sm text-white shrink-0">
            Contests
            {allContests.length > 0 && <span className="ml-2 font-normal" style={{ color: '#475569' }}>({allContests.length})</span>}
          </h3>
          {teamOptions.length > 0 && (
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="text-xs rounded-lg px-2.5 py-1.5 appearance-none font-medium outline-none focus:ring-1 focus:ring-emerald-500/40"
              style={{ background: '#0a1120', border: '1px solid #1e2d42', color: filterTeam ? '#e2e8f0' : '#64748b' }}
            >
              <option value="">All Teams</option>
              {teamOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        {allContests.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#0f1623', border: '1px dashed #1e2d42' }}>
            <p className="text-sm" style={{ color: '#475569' }}>No contests scheduled yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: '#64748b' }}>No contests for this team.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((c) => <TournamentContestCard key={c.id} contest={c} />)}

            {active.length > 0 && completed.length > 0 && (
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: '#1e2d42' }} />
                <span className="text-[0.6rem] font-semibold uppercase tracking-widest" style={{ color: '#334155' }}>Completed</span>
                <div className="flex-1 h-px" style={{ background: '#1e2d42' }} />
              </div>
            )}

            {completed.map((c) => <TournamentContestCard key={c.id} contest={c} />)}
          </div>
        )}
      </div>
    </div>
  )
}
