import PlayerAvatar from './PlayerAvatar'

export default function PlayerCard({ player, selected, onToggle }) {
  const teamName = player.team?.name || player.team_name

  return (
    <div
      className="rounded-xl px-3 py-2 flex items-center gap-2 transition"
      style={{
        background: selected ? 'rgba(16,185,129,.08)' : '#0f1623',
        border: `1px solid ${selected ? 'rgba(16,185,129,.5)' : '#1e2d42'}`,
      }}
    >
      <PlayerAvatar player={player} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-white truncate">{player.name}</p>
        <p className="text-xs truncate" style={{ color: '#64748b' }}>{teamName}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className="text-xs" style={{ color: '#475569' }}>{player.bid_points.toLocaleString()} pts</p>
        <button
          onClick={() => onToggle(player.id)}
          className="w-7 h-7 flex items-center justify-center rounded-full text-base font-bold transition"
          style={
            selected
              ? { background: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }
              : { background: 'rgba(16,185,129,.15)', color: '#34d399', border: '1px solid rgba(16,185,129,.3)' }
          }
        >
          {selected ? '−' : '+'}
        </button>
      </div>
    </div>
  )
}
