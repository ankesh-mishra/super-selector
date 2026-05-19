import { useNavigate } from 'react-router-dom'

export default function LeaderboardTable({ entries, currentUserId, showContests, getTeamPath, prize }) {
  const navigate = useNavigate()
  if (!entries?.length) return <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>No entries yet.</p>

  return (
    <div className="rounded-xl w-full" style={{ border: '1px solid #1e2d42' }}>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr style={{ background: '#0a1120', borderBottom: '1px solid #1e2d42' }}>
            <th className="w-10 px-3 py-2 text-left text-xs uppercase tracking-wide" style={{ color: '#475569' }}>#</th>
            <th className="px-3 py-2 text-left text-xs uppercase tracking-wide" style={{ color: '#475569' }}>Team</th>
            <th className="w-24 px-3 py-2 text-right text-xs uppercase tracking-wide" style={{ color: '#475569' }}>Points</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const isMe = e.user_id === currentUserId
            const displayName = e.team_name || e.user_name
            const subName = e.team_name ? e.user_name : null
            const teamPath = getTeamPath ? getTeamPath(e) : null
            const isTop = e.rank === 1
            return (
              <tr
                key={e.user_id}
                onClick={() => teamPath && navigate(teamPath)}
                style={{
                  background: isMe ? 'rgba(16,185,129,.07)' : 'transparent',
                  borderTop: '1px solid #1e2d42',
                  cursor: teamPath ? 'pointer' : 'default',
                }}
              >
                <td className="w-10 px-3 py-2.5 text-sm" style={{ color: '#475569' }}>{e.rank}</td>
                <td className="px-3 py-2.5 max-w-0 overflow-hidden">
                  <div className="flex items-baseline gap-1 overflow-hidden">
                    <span className={`font-medium truncate min-w-0 ${isMe ? 'text-emerald-400' : 'text-white'}`}>{displayName}</span>
                    {subName && (
                      <span className="text-[0.65rem] shrink-0 whitespace-nowrap" style={{ color: '#475569' }}>{subName}</span>
                    )}
                    {isMe && (
                      <span className="shrink-0 text-xs text-emerald-500 font-normal whitespace-nowrap">(you)</span>
                    )}
                    {isTop && prize && (
                      <span className="shrink-0 text-xs">🏆</span>
                    )}
                  </div>
                </td>
                <td className="w-24 px-3 py-2.5 text-right">
                  <span className="font-mono text-white">
                    {e.total_points.toFixed(1)}
                  </span>
                  {showContests && (
                    <span className="text-xs font-normal ml-1" style={{ color: '#64748b' }}>({e.contests_entered})</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
