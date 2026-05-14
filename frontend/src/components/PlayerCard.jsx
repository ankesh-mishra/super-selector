export default function PlayerCard({ player, selected, onToggle, isCaptain, isVC, onCaptain, onVC }) {
  const teamName = player.team?.name || player.team_name

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2 transition"
      style={{
        background: selected ? 'rgba(16,185,129,.08)' : '#0f1623',
        border: `1px solid ${selected ? 'rgba(16,185,129,.5)' : '#1e2d42'}`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-white truncate">{player.name}</p>
          <p className="text-xs truncate" style={{ color: '#64748b' }}>{teamName}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs" style={{ color: '#475569' }}>{player.bid_points} pts</p>
          <button
            onClick={() => onToggle(player.id)}
            className="mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full transition"
            style={
              selected
                ? { background: 'rgba(239,68,68,.15)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }
                : { background: 'rgba(16,185,129,.15)', color: '#34d399', border: '1px solid rgba(16,185,129,.3)' }
            }
          >
            {selected ? 'Remove' : 'Add'}
          </button>
        </div>
      </div>
      {selected && (
        <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid #1e2d42' }}>
          <button
            onClick={() => onCaptain(player.id)}
            className="flex-1 text-xs font-bold py-1 rounded-lg transition"
            style={
              isCaptain
                ? { background: '#059669', color: '#fff' }
                : { background: '#1a2236', color: '#64748b', border: '1px solid #1e2d42' }
            }
          >C</button>
          <button
            onClick={() => onVC(player.id)}
            className="flex-1 text-xs font-bold py-1 rounded-lg transition"
            style={
              isVC
                ? { background: '#2563eb', color: '#fff' }
                : { background: '#1a2236', color: '#64748b', border: '1px solid #1e2d42' }
            }
          >VC</button>
        </div>
      )}
    </div>
  )
}
