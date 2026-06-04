import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tournamentsApi } from '../api/endpoints'

const RULES_BY_TOURNAMENT = {
  'ABL 2026': {
    quickFacts: [
      { label: 'Team Size', value: '11 Players' },
      { label: 'Max From One Team', value: '7 Players' },
      { label: 'Min Female Players', value: '2 Players' },
      { label: 'Bid Points Cap', value: '100,000' },
      { label: 'Fantasy Captain', value: 'x2.0' },
      { label: 'Fantasy Vice Captain', value: 'x1.5' },
    ],
    scoringRows: [
      { event: 'WIN', points: '+1.00', detail: 'Awarded to all selected players on the winning side of a game.' },
      { event: 'SET_WIN', points: '+0.50', detail: 'Awarded per set won.' },
      { event: 'STRAIGHT_SET_WIN_BONUS', points: '+0.50', detail: 'Bonus when the game is won 2-0.' },
      { event: 'DOMINANT_SET_BONUS', points: '+0.50', detail: 'Per set won by margin >= 10.' },
      { event: 'UNDERDOG_WIN_LARGE', points: '+1.00', detail: 'Winner bid total <= 50% of loser.' },
      { event: 'UNDERDOG_WIN_SMALL', points: '+0.50', detail: 'Winner bid total <= 75% of loser (if large not triggered).' },
      { event: 'POSITIVE_SHOT', points: '+0.05', detail: 'Per positive shot.' },
      { event: 'NEGATIVE_SHOT', points: '-0.05', detail: 'Per negative shot.' },
    ],
    notes: ['Underdog large/small bonuses are mutually exclusive.', 'For underdog checks, real captain bid points are treated as 40,000.'],
  },
}

function FactChip({ label, value }) {
  return (
    <div className="rounded-xl p-3" style={{ background: '#0a1120', border: '1px solid #1e2d42' }}>
      <p className="text-[0.65rem] uppercase tracking-wider" style={{ color: '#64748b' }}>{label}</p>
      <p className="text-sm font-bold mt-1 text-white">{value}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl p-4" style={{ background: '#0f1623', border: '1px solid #1e2d42' }}>
      <h2 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#64748b' }}>{title}</h2>
      {children}
    </section>
  )
}

export default function ScoringRulesPage() {
  const navigate = useNavigate()
  const [selectedTournament, setSelectedTournament] = useState('ABL 2026')

  const { data: tournaments = [] } = useQuery({
    queryKey: ['rules-tournaments'],
    queryFn: () => tournamentsApi.list().then((r) => r.data),
  })

  const tournamentOptions = useMemo(() => {
    const names = new Set(tournaments.map((t) => t.name).filter(Boolean))
    names.add('ABL 2026')
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [tournaments])

  const activeRules = RULES_BY_TOURNAMENT[selectedTournament]

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start">← Back</button>

      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(#0f1623,#0f1623) padding-box, linear-gradient(135deg,rgba(16,185,129,.4),rgba(6,182,212,.25)) border-box',
          border: '1px solid transparent',
        }}
      >
        <h1 className="text-xl font-black text-white">Scoring Rules</h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Pick a tournament to view points and rule behavior.</p>

        <div className="mt-3">
          <label htmlFor="rules-tournament" className="text-xs font-semibold" style={{ color: '#64748b' }}>
            Tournament
          </label>
          <select
            id="rules-tournament"
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="w-full mt-1 rounded-lg px-3 py-2 text-sm"
            style={{ background: '#0a1120', border: '1px solid #1e2d42', color: '#f8fafc' }}
          >
            {tournamentOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {activeRules ? (
        <div className="space-y-3">
          <Section title="Quick Facts">
            <div className="grid grid-cols-2 gap-2">
              {activeRules.quickFacts.map((fact) => (
                <FactChip key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </div>
          </Section>

          <Section title="Scoring Events">
            <div className="space-y-2 sm:hidden">
              {activeRules.scoringRows.map((row) => (
                <div key={row.event} className="rounded-lg px-3 py-2.5" style={{ background: '#0a1120', border: '1px solid #1e2d42' }}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-white text-xs leading-snug break-words">{row.event}</span>
                    <span className="font-bold text-xs tabular-nums shrink-0" style={{ color: row.points.startsWith('-') ? '#f87171' : '#34d399' }}>{row.points}</span>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: '#94a3b8' }}>{row.detail}</p>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-hidden rounded-xl" style={{ border: '1px solid #1e2d42' }}>
              <div className="grid grid-cols-[minmax(0,1.6fr)_96px_minmax(0,2.4fr)] gap-x-4 px-3 py-2 text-[0.65rem] uppercase tracking-wide font-semibold" style={{ background: '#0a1120', color: '#64748b' }}>
                <span>Event</span>
                <span className="text-right">Points</span>
                <span>How It Applies</span>
              </div>
              <div className="divide-y" style={{ borderColor: '#1e2d42' }}>
                {activeRules.scoringRows.map((row) => (
                  <div key={row.event} className="grid grid-cols-[minmax(0,1.6fr)_96px_minmax(0,2.4fr)] gap-x-4 px-3 py-2.5 text-xs items-start">
                    <span className="font-semibold text-white leading-snug break-words">{row.event}</span>
                    <span className="font-bold text-right tabular-nums" style={{ color: row.points.startsWith('-') ? '#f87171' : '#34d399' }}>{row.points}</span>
                    <span style={{ color: '#94a3b8' }}>{row.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Important Notes">
            <div className="space-y-2">
              {activeRules.notes.map((note) => (
                <div key={note} className="rounded-lg px-3 py-2 text-xs" style={{ background: '#0a1120', border: '1px solid #1e2d42', color: '#cbd5e1' }}>
                  {note}
                </div>
              ))}
            </div>
          </Section>
        </div>
      ) : (
        <div className="rounded-2xl p-5 text-sm" style={{ background: '#0f1623', border: '1px solid #1e2d42', color: '#94a3b8' }}>
          Rules are not published for <span className="text-white font-semibold">{selectedTournament}</span> yet.
        </div>
      )}
    </div>
  )
}
