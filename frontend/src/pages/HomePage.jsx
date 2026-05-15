import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { myContestsApi, tournamentsApi } from '../api/endpoints'

function sortActive(myContests) {
  return [...myContests]
    .filter((mc) => mc.contest && !mc.contest.is_completed)
    .sort((a, b) => {
      if (a.contest.is_locked && !b.contest.is_locked) return -1
      if (!a.contest.is_locked && b.contest.is_locked) return 1
      return new Date(a.contest.match_date) - new Date(b.contest.match_date)
    })
}

function statusChip(contest) {
  if (contest.is_completed) return { label: 'Completed', cls: 'badge-completed' }
  if (contest.is_locked)    return { label: '🔴 Live',   cls: 'badge-live' }
  return                           { label: 'Open',      cls: 'badge-open' }
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4 shrink-0" style={{ color: '#334155' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

export default function HomePage() {
  const { data: myContests = [] } = useQuery({
    queryKey: ['my-contests'],
    queryFn: () => myContestsApi.list().then((r) => r.data),
  })

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments', 'active'],
    queryFn: () => tournamentsApi.list({ active: true }).then((r) => r.data),
  })

  const activeContests = sortActive(myContests)

  return (
    <div className="flex flex-col gap-8">

      {/* ── My Contests ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">My Contests</h2>
          {myContests.length > 0 && (
            <Link to="/my-contests" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition">
              View all →
            </Link>
          )}
        </div>

        {activeContests.length === 0 ? (
          <div
            className="card-glow rounded-2xl p-8 text-center"
            style={{ background: 'linear-gradient(#0f1623,#0f1623) padding-box, linear-gradient(135deg,rgba(16,185,129,.4),rgba(6,182,212,.25)) border-box', border: '1px solid transparent' }}
          >
            <img src="/sports-logos/Badminton.jpg" alt="Badminton" className="w-12 h-12 object-contain mx-auto mb-2" />
            <p className="text-sm mb-3" style={{ color: '#64748b' }}>No active contests yet.</p>
            <Link to="/tournaments" className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition">
              Browse tournaments →
            </Link>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
            {activeContests.map((mc) => {
              const { label, cls } = statusChip(mc.contest)
              return (
                <Link
                  key={mc.id}
                  to={`/contests/${mc.contest.id}`}
                  className="flex-none w-52 rounded-2xl p-4 snap-start transition hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(#111827,#111827) padding-box, linear-gradient(135deg,rgba(16,185,129,.5),rgba(6,182,212,.3)) border-box', border: '1px solid transparent' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
                      {label}
                    </span>
                    <span className="text-xs" style={{ color: '#475569' }}>
                      {new Date(mc.contest.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="font-semibold text-sm leading-tight truncate text-white">{mc.contest.name}</p>
                  <p className="text-xs mt-1 truncate" style={{ color: '#64748b' }}>
                    {mc.contest.match_number != null && mc.contest.tournament?.name
                      ? `Match #${mc.contest.match_number} - ${mc.contest.tournament.name}`
                      : mc.contest.match_number != null
                      ? `Match #${mc.contest.match_number}`
                      : mc.contest.tournament?.name || `${mc.contest.team_a?.name} vs ${mc.contest.team_b?.name}`}
                  </p>
                  <div className="mt-4 pt-3" style={{ borderTop: '1px solid #1e293b' }}>
                    <div className="flex items-baseline gap-1">
                      <span className="text-gradient text-xl font-black">{mc.total_points}</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>pts</span>
                    </div>
                    {mc.contest.is_locked && (
                      <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                        Rank{' '}
                        <span className="font-semibold text-white">
                          {mc.rank != null ? mc.rank : '--'}/{mc.total_participants}
                        </span>
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Active Tournaments ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Tournaments</h2>
          <Link to="/tournaments" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition">
            View all →
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: '#475569' }}>No active tournaments at the moment.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                to={`/tournaments/${t.id}`}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition hover:brightness-110"
                style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
              >
                <img
                  src={t.sport === 'BADMINTON' ? '/sports-logos/Badminton.jpg' : '/sports-logos/Cricket.png'}
                  alt={t.sport}
                  className="w-7 h-7 object-contain shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate">{t.name}</p>
                  {t.description && (
                    <p className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{t.description}</p>
                  )}
                </div>
                <ChevronRight />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
