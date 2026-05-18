import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { playersApi } from '../api/endpoints'

export default function PlayersPage() {
  const { data: players = [], isLoading } = useQuery({
    queryKey: ['players', 'trending'],
    queryFn: () => playersApi.trending().then((r) => r.data),
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Trending</p>
        <h1 className="text-lg font-bold text-white mt-0.5">Players</h1>
      </div>

      {isLoading && (
        <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>Loading…</p>
      )}

      <div className="flex flex-col gap-2">
        {players.map((p) => (
          <Link
            key={p.id}
            to={`/players/${p.id}`}
            className="flex items-center gap-3 rounded-xl p-4 transition hover:brightness-110"
            style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
              style={{
                background: 'linear-gradient(135deg,rgba(16,185,129,.25),rgba(6,182,212,.2))',
                border: '1px solid rgba(16,185,129,.3)',
              }}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white truncate">{p.name}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{p.team?.name}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-emerald-400">{p.selection_count}</p>
              <p className="text-[0.65rem]" style={{ color: '#475569' }}>selected</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
