import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tournamentsApi } from '../api/endpoints'

function statusChip(contest) {
  if (contest.is_completed) return { label: 'Completed', cls: 'badge-completed' }
  if (contest.is_locked)    return { label: '🔴 Live',   cls: 'badge-live' }
  return                           { label: 'Open',      cls: 'badge-open' }
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
          <span className="text-2xl">{tournament.sport === 'BADMINTON' ? '🏸' : '🏏'}</span>
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
            {sorted.map((c) => {
              const { label, cls } = statusChip(c)
              return (
                <Link
                  key={c.id}
                  to={`/contests/${c.id}`}
                  className="flex items-center justify-between rounded-xl px-4 py-3 transition hover:brightness-110"
                  style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
                >
                  <div>
                    <p className="font-semibold text-sm text-white">{c.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      {new Date(c.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
