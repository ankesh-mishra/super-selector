import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { myContestsApi } from '../api/endpoints'

function statusOrder(mc) {
  if (!mc.contest) return 3
  if (!mc.contest.is_completed && mc.contest.is_locked) return 0
  if (!mc.contest.is_completed && !mc.contest.is_locked) return 1
  return 2
}

function statusChip(contest) {
  if (contest.is_completed) return { label: 'Completed', cls: 'badge-completed' }
  if (contest.is_locked)    return { label: '🔴 Live',   cls: 'badge-live' }
  return                           { label: 'Open',      cls: 'badge-open' }
}

export default function MyContestsPage() {
  const { data: myContests = [], isLoading } = useQuery({
    queryKey: ['my-contests'],
    queryFn: () => myContestsApi.list().then((r) => r.data),
  })

  if (isLoading) return <p className="text-center py-12 text-sm" style={{ color: '#64748b' }}>Loading…</p>

  const sorted = [...myContests].sort(
    (a, b) => statusOrder(a) - statusOrder(b) || new Date(a.contest.match_date) - new Date(b.contest.match_date)
  )

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-white">My Contests</h2>

      {sorted.length === 0 ? (
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
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((mc) => {
            const { label, cls } = statusChip(mc.contest)
            return (
              <Link
                key={mc.id}
                to={`/contests/${mc.contest.id}`}
                className="rounded-2xl p-4 transition hover:brightness-110"
                style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-white leading-tight">{mc.contest.name}</p>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
                </div>
                <p className="text-xs" style={{ color: '#64748b' }}>
                  {mc.contest.team_a?.name} vs {mc.contest.team_b?.name}
                </p>
                <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: '1px solid #1e2d42' }}>
                  <p className="text-xs" style={{ color: '#475569' }}>
                    {new Date(mc.contest.match_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <div>
                    <span className="text-gradient font-black text-base">{mc.total_points}</span>
                    <span className="text-xs ml-1" style={{ color: '#64748b' }}>pts</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
