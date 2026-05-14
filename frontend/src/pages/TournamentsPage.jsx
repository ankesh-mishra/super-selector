import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { tournamentsApi } from '../api/endpoints'

const SPORTS = [
  { key: 'BADMINTON', label: 'Badminton', icon: '🏸' },
  { key: 'CRICKET',   label: 'Cricket',   icon: '🏏' },
]

export default function TournamentsPage() {
  const [sport, setSport] = useState('BADMINTON')

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments', sport],
    queryFn: () => tournamentsApi.list({ sport }).then((r) => r.data),
  })

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-white">Tournaments</h2>

      {/* Sport tabs */}
      <div className="flex gap-2">
        {SPORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSport(s.key)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition"
            style={
              sport === s.key
                ? { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', boxShadow: '0 0 12px rgba(16,185,129,.3)' }
                : { background: '#0f1623', border: '1px solid #1e2d42', color: '#64748b' }
            }
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <p className="text-center py-12 text-sm" style={{ color: '#64748b' }}>Loading…</p>
      )}

      {!isLoading && tournaments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">{SPORTS.find((s) => s.key === sport)?.icon}</p>
          <p className="text-sm" style={{ color: '#475569' }}>No {sport.toLowerCase()} tournaments yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {tournaments.map((t) => (
          <Link
            key={t.id}
            to={`/tournaments/${t.id}`}
            className="flex items-start gap-3 rounded-xl p-4 transition hover:brightness-110"
            style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="font-bold text-sm text-white truncate">{t.name}</p>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={
                    t.is_active
                      ? { background: 'rgba(16,185,129,.15)', color: '#34d399', border: '1px solid rgba(16,185,129,.3)' }
                      : { background: 'rgba(100,116,139,.15)', color: '#64748b', border: '1px solid rgba(100,116,139,.25)' }
                  }
                >
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {t.description && (
                <p className="text-xs truncate" style={{ color: '#64748b' }}>{t.description}</p>
              )}
              {(t.start_date || t.end_date) && (
                <p className="text-xs mt-1.5" style={{ color: '#475569' }}>
                  {t.start_date && new Date(t.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {t.start_date && t.end_date && ' – '}
                  {t.end_date && new Date(t.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#334155' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
