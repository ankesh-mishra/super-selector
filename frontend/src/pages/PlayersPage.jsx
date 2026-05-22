import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { playersApi, tournamentsApi } from '../api/endpoints'
import PlayerAvatar from '../components/PlayerAvatar'

const TABS = ['By Selection', 'By Points']

export default function PlayersPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('By Selection')
  const [tournamentId, setTournamentId] = useState('')

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentsApi.list().then((r) => r.data),
  })

  const params = tournamentId ? { tournament_id: tournamentId } : undefined

  const { data: bySelection = [], isLoading: loadingSel } = useQuery({
    queryKey: ['players', 'trending', tournamentId],
    queryFn: () => playersApi.trending(params).then((r) => r.data),
  })

  const { data: byPoints = [], isLoading: loadingPts } = useQuery({
    queryKey: ['players', 'by-points', tournamentId],
    queryFn: () => playersApi.byPoints(params).then((r) => r.data),
    enabled: tab === 'By Points',
  })

  const players = tab === 'By Selection' ? bySelection : byPoints
  const isLoading = tab === 'By Selection' ? loadingSel : loadingPts

  return (
    <div className="flex flex-col gap-3">
      {/* Header row with back button */}
      <div className="flex items-center gap-2">
        <div>
          <button onClick={() => navigate(-1)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start">← Back</button>
          <h1 className="text-lg font-bold text-white mt-0.5">Players</h1>
        </div>
      </div>

      {/* Tournament filter */}
      <select
        value={tournamentId}
        onChange={(e) => setTournamentId(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-xs font-medium transition"
        style={{
          background: '#0f1623',
          border: '1px solid #1e2d42',
          color: tournamentId ? '#fff' : '#64748b',
          outline: 'none',
        }}
      >
        <option value="">All Tournaments</option>
        {tournaments.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      {/* Tab bar */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition"
            style={
              tab === t
                ? { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }
                : { background: '#0f1623', border: '1px solid #1e2d42', color: '#64748b' }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>Loading…</p>
      ) : players.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>No players found.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {players.map((p, i) => (
            <Link
              key={p.id}
              to={`/players/${p.id}`}
              className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition hover:brightness-110"
              style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
            >
              <span className="text-xs font-bold w-5 text-right shrink-0" style={{ color: '#334155' }}>
                {i + 1}
              </span>
              <PlayerAvatar player={p} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">{p.name}</p>
                <p className="text-xs truncate" style={{ color: '#64748b' }}>{p.team?.name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-emerald-400">
                  {tab === 'By Selection' ? p.selection_count : p.total_points?.toFixed(1)}
                </p>
                <p className="text-[0.65rem]" style={{ color: '#475569' }}>
                  {tab === 'By Selection' ? 'selected' : 'pts'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
