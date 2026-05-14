import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { contestsApi, playersApi, userTeamsApi } from '../api/endpoints'
import PlayerCard from '../components/PlayerCard'

const TEAM_SIZE = 11
const MAX_FROM_ONE_TEAM = 7
const MIN_FEMALE = 2
const MAX_BID = 100_000

export default function TeamBuilderPage() {
  const { id: contestId } = useParams()
  const navigate = useNavigate()

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [captainId, setCaptainId] = useState(null)
  const [vcId, setVcId] = useState(null)
  const [filterTeam, setFilterTeam] = useState('all')
  const [error, setError] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)

  const { data: contest } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: () => contestsApi.get(contestId).then((r) => r.data),
  })

  const { data: existingTeam } = useQuery({
    queryKey: ['my-team', contestId],
    queryFn: () => userTeamsApi.get(contestId).then((r) => r.data).catch(() => null),
    enabled: !!contestId,
    retry: false,
  })

  const { data: players } = useQuery({
    queryKey: ['players', contestId],
    queryFn: async () => {
      if (!contest) return []
      const [a, b] = await Promise.all([
        playersApi.list({ team_id: contest.team_a_id }).then((r) => r.data),
        playersApi.list({ team_id: contest.team_b_id }).then((r) => r.data),
      ])
      return [...a, ...b]
    },
    enabled: !!contest,
  })

  useEffect(() => {
    if (!existingTeam || !players) return
    if (contest?.is_locked) {
      navigate(`/contests/${contestId}/my-team`, { replace: true })
      return
    }
    setIsEditMode(true)
    const ids = new Set(existingTeam.players.map((utp) => utp.player_id))
    setSelectedIds(ids)
    const cap = existingTeam.players.find((utp) => utp.is_captain)
    const vc = existingTeam.players.find((utp) => utp.is_vice_captain)
    if (cap) setCaptainId(cap.player_id)
    if (vc) setVcId(vc.player_id)
  }, [existingTeam, players, contest, contestId, navigate])

  const selectedPlayers = useMemo(
    () => (players || []).filter((p) => selectedIds.has(p.id)),
    [players, selectedIds]
  )

  const totalBid    = useMemo(() => selectedPlayers.reduce((s, p) => s + p.bid_points, 0), [selectedPlayers])
  const femaleCount = useMemo(() => selectedPlayers.filter((p) => p.gender === 'FEMALE').length, [selectedPlayers])
  const teamCount   = useMemo(() => {
    const c = {}
    selectedPlayers.forEach((p) => { c[p.team_id] = (c[p.team_id] || 0) + 1 })
    return c
  }, [selectedPlayers])
  const realCaptainCount = useMemo(() => selectedPlayers.filter((p) => p.is_real_captain).length, [selectedPlayers])
  const maxTeamCount = Math.max(0, ...Object.values(teamCount))

  const validationErrors = []
  if (selectedIds.size !== TEAM_SIZE)  validationErrors.push(`Select ${TEAM_SIZE} players (${selectedIds.size} selected)`)
  if (totalBid > MAX_BID)              validationErrors.push(`Budget exceeded: ${totalBid.toLocaleString()} / ${MAX_BID.toLocaleString()}`)
  if (femaleCount < MIN_FEMALE)        validationErrors.push(`Min ${MIN_FEMALE} female required (${femaleCount} selected)`)
  if (maxTeamCount > MAX_FROM_ONE_TEAM) validationErrors.push(`Max ${MAX_FROM_ONE_TEAM} from one team`)
  if (realCaptainCount !== 1)          validationErrors.push(`Must select exactly 1 real team captain (${realCaptainCount} selected)`)
  if (!captainId)                      validationErrors.push('Designate a fantasy captain (C)')
  if (!vcId)                           validationErrors.push('Designate a vice captain (VC)')
  const canSubmit = validationErrors.length === 0

  const togglePlayer = (playerId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
        if (captainId === playerId) setCaptainId(null)
        if (vcId === playerId) setVcId(null)
      } else {
        if (next.size >= TEAM_SIZE) return prev
        next.add(playerId)
      }
      return next
    })
  }

  const handleSetCaptain = (playerId) => { if (vcId === playerId) setVcId(null); setCaptainId(playerId) }
  const handleSetVC      = (playerId) => { if (captainId === playerId) setCaptainId(null); setVcId(playerId) }

  const submitMutation = useMutation({
    mutationFn: () => {
      const payload = { players: [...selectedIds].map((pid) => ({
        player_id: pid,
        is_captain: pid === captainId,
        is_vice_captain: pid === vcId,
      }))}
      return isEditMode ? userTeamsApi.update(contestId, payload) : userTeamsApi.create(contestId, payload)
    },
    onSuccess: () => navigate(`/contests/${contestId}/my-team`),
    onError: (e) => setError(e.response?.data?.detail || 'Submission failed.'),
  })

  const filteredPlayers = (players || []).filter((p) => filterTeam === 'all' || p.team_id === filterTeam)

  if (!contest || !players) return <p className="text-center py-12 text-sm" style={{ color: '#64748b' }}>Loading…</p>

  const statOk  = (ok) => ok ? '#34d399' : '#f87171'

  return (
    <div className="flex flex-col gap-4">
      <Link to={`/contests/${contestId}`} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition">← Contest</Link>
      <h2 className="text-lg font-bold text-white">{isEditMode ? 'Edit Your Team' : 'Build Your Team'}</h2>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2 rounded-xl p-3 text-center text-xs" style={{ background: '#0f1623', border: '1px solid #1e2d42' }}>
        <div>
          <p className="font-black text-base" style={{ color: statOk(selectedIds.size === TEAM_SIZE) }}>{selectedIds.size}/{TEAM_SIZE}</p>
          <p style={{ color: '#64748b' }}>Players</p>
        </div>
        <div>
          <p className="font-black text-base" style={{ color: totalBid > MAX_BID ? '#f87171' : '#f0f4f8' }}>
            {(totalBid / 1000).toFixed(0)}K
          </p>
          <p style={{ color: '#64748b' }}>/ {MAX_BID / 1000}K</p>
        </div>
        <div>
          <p className="font-black text-base" style={{ color: statOk(femaleCount >= MIN_FEMALE) }}>{femaleCount}</p>
          <p style={{ color: '#64748b' }}>♀ (min {MIN_FEMALE})</p>
        </div>
        <div>
          <p className="font-black text-base" style={{ color: statOk(realCaptainCount === 1) }}>{realCaptainCount}</p>
          <p style={{ color: '#64748b' }}>Real C</p>
        </div>
      </div>

      {/* Team filter tabs */}
      <div className="flex gap-2">
        {['all', contest.team_a_id, contest.team_b_id].map((tid) => {
          const label = tid === 'all' ? 'All' : tid === contest.team_a_id ? contest.team_a?.name : contest.team_b?.name
          return (
            <button
              key={tid}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition"
              style={
                filterTeam === tid
                  ? { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }
                  : { background: '#0f1623', border: '1px solid #1e2d42', color: '#64748b' }
              }
              onClick={() => setFilterTeam(tid)}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <ul className="rounded-xl p-3 text-xs flex flex-col gap-1" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', color: '#f87171' }}>
          {validationErrors.map((e, i) => <li key={i}>• {e}</li>)}
        </ul>
      )}

      {/* Player grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredPlayers.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            selected={selectedIds.has(p.id)}
            onToggle={togglePlayer}
            isCaptain={captainId === p.id}
            isVC={vcId === p.id}
            onCaptain={handleSetCaptain}
            onVC={handleSetVC}
            disabled={!selectedIds.has(p.id) && selectedIds.size >= TEAM_SIZE}
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        disabled={!canSubmit || submitMutation.isPending}
        onClick={() => submitMutation.mutate()}
        className="font-semibold py-3 rounded-xl transition disabled:opacity-40 hover:opacity-90"
        style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}
      >
        {submitMutation.isPending ? 'Submitting…' : isEditMode ? 'Update Team' : 'Submit Team'}
      </button>
    </div>
  )
}
