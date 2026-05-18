import { Link } from 'react-router-dom'

export default function LeaderboardTable({ entries, currentUserId, showContests, getTeamPath }) {
  if (!entries?.length) return <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>No entries yet.</p>

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #1e2d42' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#0a1120', borderBottom: '1px solid #1e2d42' }}>
            <th className="px-4 py-2 text-left text-xs uppercase tracking-wide" style={{ color: '#475569' }}>#</th>
            <th className="px-4 py-2 text-left text-xs uppercase tracking-wide" style={{ color: '#475569' }}>Team</th>
            <th className="px-4 py-2 text-right text-xs uppercase tracking-wide" style={{ color: '#475569' }}>Points</th>
            {showContests && <th className="px-4 py-2 text-right text-xs uppercase tracking-wide" style={{ color: '#475569' }}></th>}
            {getTeamPath && <th className="px-4 py-2 text-right text-xs uppercase tracking-wide" style={{ color: '#475569' }}></th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const isMe = e.user_id === currentUserId
            const displayName = e.team_name || e.user_name
            const subName = e.team_name ? e.user_name : null
            const teamPath = getTeamPath ? getTeamPath(e) : null
            return (
              <tr
                key={e.user_id}
                style={{
                  background: isMe ? 'rgba(16,185,129,.07)' : 'transparent',
                  borderTop: '1px solid #1e2d42',
                }}
              >
                <td className="px-4 py-2.5 text-sm" style={{ color: '#475569' }}>{e.rank}</td>
                <td className="px-4 py-2.5">
                  <span className={`font-medium ${isMe ? 'text-emerald-400' : 'text-white'}`}>{displayName}</span>
                  {subName && (
                    <span className="text-[0.65rem] ml-1" style={{ color: '#475569' }}>{subName}</span>
                  )}
                  {isMe && (
                    <span className="ml-1.5 text-xs text-emerald-500 font-normal">(you)</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-white">
                  {e.total_points.toFixed(1)}
                  {showContests && (
                    <span className="text-xs font-normal ml-1" style={{ color: '#64748b' }}>({e.contests_entered})</span>
                  )}
                </td>
                {showContests && null}
                {getTeamPath && (
                  <td className="px-4 py-2.5 text-right">
                    {teamPath ? (
                      <Link
                        to={teamPath}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                      >
                        View →
                      </Link>
                    ) : (
                      <span className="text-xs" style={{ color: '#334155' }}>🔒</span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
