import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, teamsApi, playersApi, contestsApi, tournamentsApi } from '../api/endpoints'
import { Button } from '@/components/ui/button'
import { Input as ShadInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { NativeSelect } from '@/components/ui/native-select'

// ─── Mini wrappers (keep same call-site API as before) ────────────────────────

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>}
      {children}
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <Field label={label}>
      <ShadInput {...props} />
    </Field>
  )
}

function Select({ label, children, ...props }) {
  return (
    <Field label={label}>
      <NativeSelect {...props}>{children}</NativeSelect>
    </Field>
  )
}

function Btn({ children, variant = 'default', ...props }) {
  return (
    <Button size="sm" variant={variant} {...props}>
      {children}
    </Button>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = ['Tournaments', 'Teams', 'Players', 'Contests', 'Score Entry', 'All Teams']

// ─── Tournaments Tab ──────────────────────────────────────────────────────────
function TournamentsTab() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', sport: 'BADMINTON', description: '', start_date: '', end_date: '', is_active: true })
  const [msg, setMsg] = useState('')
  const [selectedTournamentId, setSelectedTournamentId] = useState('')

  const { data: tournaments } = useQuery({
    queryKey: ['all-tournaments'],
    queryFn: () => tournamentsApi.list().then((r) => r.data),
  })

  const { data: tournamentDetail } = useQuery({
    queryKey: ['admin-tournament', selectedTournamentId],
    queryFn: () => adminApi.getTournament(selectedTournamentId).then((r) => r.data),
    enabled: !!selectedTournamentId,
  })

  const { data: allTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.list().then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: () => adminApi.createTournament({
      ...form,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries(['all-tournaments'])
      setMsg('Tournament created!')
      setSelectedTournamentId(res.data.id)
    },
    onError: (e) => setMsg(e.response?.data?.detail || 'Error'),
  })

  const toggle = useMutation({
    mutationFn: ({ id, is_active }) => adminApi.updateTournament(id, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries(['all-tournaments'])
      qc.invalidateQueries(['admin-tournament', selectedTournamentId])
    },
  })

  const addTeam = useMutation({
    mutationFn: (teamId) => adminApi.addTournamentTeam(selectedTournamentId, teamId),
    onSuccess: () => qc.invalidateQueries(['admin-tournament', selectedTournamentId]),
    onError: (e) => setMsg(e.response?.data?.detail || 'Error adding team'),
  })

  const removeTeam = useMutation({
    mutationFn: (teamId) => adminApi.removeTournamentTeam(selectedTournamentId, teamId),
    onSuccess: () => qc.invalidateQueries(['admin-tournament', selectedTournamentId]),
    onError: (e) => setMsg(e.response?.data?.detail || 'Error removing team'),
  })

  const participatingIds = new Set((tournamentDetail?.teams || []).map((t) => t.id))
  const availableToAdd = (allTeams || []).filter((t) => !participatingIds.has(t.id))

  return (
    <div className="flex flex-col gap-3">
      {/* Create form */}
      <p className="text-xs font-semibold text-gray-500 uppercase">Create Tournament</p>
      <Select label="Sport" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}>
        <option value="BADMINTON">🏸 Badminton</option>
        <option value="CRICKET">🏏 Cricket</option>
      </Select>
      <Input label="Tournament name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Input label="Start date (optional)" type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
      <Input label="End date (optional)" type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
      <Btn disabled={!form.name || create.isPending} onClick={() => create.mutate()}>Create Tournament</Btn>
      {msg && <p className="text-sm text-primary">{msg}</p>}

      <hr className="my-2" />

      {/* Manage existing */}
      <p className="text-xs font-semibold text-gray-500 uppercase">Manage Tournament</p>
      <Select value={selectedTournamentId} onChange={(e) => setSelectedTournamentId(e.target.value)}>
        <option value="">— select tournament —</option>
        {tournaments?.map((t) => (
          <option key={t.id} value={t.id}>
            {t.sport === 'BADMINTON' ? '🏸' : '🏏'} {t.name}
          </option>
        ))}
      </Select>

      {selectedTournamentId && tournamentDetail && (
        <>
          {/* Active toggle */}
          <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
            <span className="text-sm font-medium">{tournamentDetail.name}</span>
            <button
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${tournamentDetail.is_active ? 'bg-accent text-primary' : 'bg-muted text-muted-foreground'}`}
              onClick={() => toggle.mutate({ id: selectedTournamentId, is_active: !tournamentDetail.is_active })}
            >
              {tournamentDetail.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>

          {/* Participating teams */}
          <p className="text-xs font-semibold text-gray-500 uppercase mt-1">Participating Teams</p>
          {tournamentDetail.teams?.length === 0 && (
            <p className="text-xs text-gray-400 italic">No teams added yet.</p>
          )}
          <div className="flex flex-col gap-1">
            {tournamentDetail.teams?.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                <span>{t.name}</span>
                <button
                  className="text-xs text-red-500 hover:underline"
                  onClick={() => removeTeam.mutate(t.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Add team */}
          {availableToAdd.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">Add Team</p>
              <div className="flex flex-col gap-1">
                {availableToAdd.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span>{t.name}</span>
                    <button
                      className="text-xs text-primary font-semibold hover:underline"
                      onClick={() => addTeam.mutate(t.id)}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────
function TeamsTab() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [sport, setSport] = useState('BADMINTON')
  const [msg, setMsg] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.list().then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: () => adminApi.createTeam({ name, sport }),
    onSuccess: () => { qc.invalidateQueries(['teams']); setName(''); setMsg('Team created!') },
    onError: (e) => setMsg(e.response?.data?.detail || 'Error'),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Select label="Sport" value={sport} onChange={(e) => setSport(e.target.value)}>
          <option value="BADMINTON">🏸 Badminton</option>
          <option value="CRICKET">🏏 Cricket</option>
        </Select>
        <div className="flex gap-2">
          <Input placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
          <Btn disabled={!name || create.isPending} onClick={() => create.mutate()}>Add</Btn>
        </div>
      </div>
      {msg && <p className="text-sm text-primary">{msg}</p>}
      <div className="flex flex-col gap-1">
        {teams?.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-sm py-1 border-b">
            <span>{t.sport === 'BADMINTON' ? '🏸' : t.sport === 'CRICKET' ? '🏏' : ''}</span>
            <span>{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Players Tab ──────────────────────────────────────────────────────────────
function PlayersTab() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', team_id: '', gender: 'MALE', bid_points: 0, is_real_captain: false })
  const [editPlayer, setEditPlayer] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [msg, setMsg] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.list().then((r) => r.data),
  })

  const { data: players } = useQuery({
    queryKey: ['players-all'],
    queryFn: () => playersApi.list({ active_only: false }).then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: () => adminApi.createPlayer({
      ...form,
      bid_points: Number(form.bid_points),
      is_real_captain: form.is_real_captain,
    }),
    onSuccess: () => { qc.invalidateQueries(['players-all']); setMsg('Player created!') },
    onError: (e) => setMsg(e.response?.data?.detail || 'Error'),
  })

  const update = useMutation({
    mutationFn: () => adminApi.updatePlayer(editPlayer.id, {
      ...editForm,
      bid_points: editForm.bid_points !== undefined ? Number(editForm.bid_points) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries(['players-all']); setEditPlayer(null); setMsg('Player updated!') },
    onError: (e) => setMsg(e.response?.data?.detail || 'Error'),
  })

  const startEdit = (player) => {
    setEditPlayer(player)
    setEditForm({
      name: player.name,
      gender: player.gender,
      bid_points: player.bid_points,
      is_real_captain: player.is_real_captain,
      is_active: player.is_active,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold text-gray-500 uppercase">Create Player</p>
      <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Select label="Team" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
        <option value="">— select team —</option>
        {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
      <Select label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
        <option value="MALE">Male</option>
        <option value="FEMALE">Female</option>
      </Select>
      <Input label="Bid Points" type="number" value={form.bid_points}
        onChange={(e) => setForm({ ...form, bid_points: e.target.value })}
        disabled={form.is_real_captain} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_real_captain}
          onChange={(e) => setForm({ ...form, is_real_captain: e.target.checked, bid_points: e.target.checked ? 0 : form.bid_points })} />
        Real Team Captain (bid points forced to 0)
      </label>
      <Btn disabled={!form.name || !form.team_id || create.isPending} onClick={() => create.mutate()}>
        Add Player
      </Btn>
      {msg && <p className="text-sm text-primary">{msg}</p>}

      <hr className="my-2" />

      {/* Inline edit form */}
      {editPlayer && (
        <div className="bg-accent/40 border border-primary/20 rounded-xl p-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-primary uppercase">Editing: {editPlayer.name}</p>
          <Input label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Select label="Gender" value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Select>
          <Input label="Bid Points" type="number" value={editForm.bid_points}
            onChange={(e) => setEditForm({ ...editForm, bid_points: e.target.value })}
            disabled={editForm.is_real_captain} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!editForm.is_real_captain}
              onChange={(e) => setEditForm({ ...editForm, is_real_captain: e.target.checked, bid_points: e.target.checked ? 0 : editForm.bid_points })} />
            Real Team Captain
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-2">
            <Btn disabled={update.isPending} onClick={() => update.mutate()}>Save</Btn>
            <button className="text-sm text-gray-500 hover:underline" onClick={() => setEditPlayer(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Players grouped by team */}
      <p className="text-xs font-semibold text-gray-500 uppercase">All Players</p>
      {teams?.map((team) => {
        const teamPlayers = (players || []).filter((p) => p.team_id === team.id)
        if (!teamPlayers.length) return null
        return (
          <div key={team.id} className="flex flex-col gap-1">
            <p className="text-xs font-medium text-gray-400 mt-1">{team.name}</p>
            {teamPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                <span className={!p.is_active ? 'text-gray-400 line-through' : ''}>
                  {p.name}{p.is_real_captain ? ' ★' : ''}
                  <span className="text-xs text-gray-400 ml-1">({p.gender}, {p.bid_points}pts)</span>
                </span>
                <button className="text-xs text-primary hover:underline" onClick={() => startEdit(p)}>Edit</button>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── Contest Prize Editor ─────────────────────────────────────────────────────
function ContestPrizeEditor({ contests, qc, setMsg }) {
  const [editPrizeId, setEditPrizeId] = useState('')
  const [editPrizeVal, setEditPrizeVal] = useState('Winner Badge')
  const editPrize = useMutation({
    mutationFn: () => adminApi.updateContest(editPrizeId, { prize: editPrizeVal }),
    onSuccess: () => { qc.invalidateQueries(['contests']); setMsg('Prize updated!') },
  })
  return (
    <>
      <Select label="Contest" value={editPrizeId} onChange={(e) => {
        setEditPrizeId(e.target.value)
        const c = (contests || []).find((x) => x.id === e.target.value)
        setEditPrizeVal(c?.prize || 'Winner Badge')
      }}>
        <option value="">— select contest —</option>
        {(contests || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      {editPrizeId && (
        <Input label="Prize" value={editPrizeVal} onChange={(e) => setEditPrizeVal(e.target.value)} />
      )}
      <Btn disabled={!editPrizeId || !editPrizeVal.trim() || editPrize.isPending} onClick={() => editPrize.mutate()}>Save Prize</Btn>
    </>
  )
}

// ─── Contests Tab ─────────────────────────────────────────────────────────────
function ContestsTab() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ tournament_id: '', team_a_id: '', team_b_id: '', match_date: '', registration_cutoff: '', prize: 'Winner Badge' })
  const [lockId, setLockId] = useState('')
  const [lockTournamentId, setLockTournamentId] = useState('')
  const [completeId, setCompleteId] = useState('')
  const [completeTournamentId, setCompleteTournamentId] = useState('')
  const [msg, setMsg] = useState('')

  const { data: allTeams } = useQuery({ queryKey: ['teams'], queryFn: () => teamsApi.list().then((r) => r.data) })
  const { data: contests } = useQuery({ queryKey: ['contests'], queryFn: () => contestsApi.list().then((r) => r.data) })
  const { data: tournaments } = useQuery({ queryKey: ['all-tournaments'], queryFn: () => tournamentsApi.list().then((r) => r.data) })
  const { data: tournamentDetail } = useQuery({
    queryKey: ['admin-tournament', form.tournament_id],
    queryFn: () => adminApi.getTournament(form.tournament_id).then((r) => r.data),
    enabled: !!form.tournament_id,
  })

  // Teams available for this contest — restricted to tournament's teams if tournament selected
  const availableTeams = form.tournament_id && tournamentDetail
    ? (tournamentDetail.teams || [])
    : (allTeams || [])

  // Preview the auto-generated name
  const teamA = availableTeams.find((t) => t.id === form.team_a_id)
  const teamB = availableTeams.find((t) => t.id === form.team_b_id)
  const previewName = teamA && teamB ? `${teamA.name} v ${teamB.name}` : null

  const create = useMutation({
    mutationFn: () => adminApi.createContest({ ...form, tournament_id: form.tournament_id || null }),
    onSuccess: () => { qc.invalidateQueries(['contests']); setMsg('Contest created!') },
    onError: (e) => setMsg(e.response?.data?.detail || 'Error'),
  })

  const lock = useMutation({
    mutationFn: (id) => adminApi.updateContest(id, { is_locked: true }),
    onSuccess: () => { qc.invalidateQueries(['contests']); setLockId(''); setLockTournamentId(''); setMsg('Locked!') },
  })

  const markComplete = useMutation({
    mutationFn: (id) => adminApi.updateContest(id, { is_completed: true }),
    onSuccess: () => { qc.invalidateQueries(['contests']); setCompleteId(''); setCompleteTournamentId(''); setMsg('Marked as completed!') },
  })

  const canCreate = form.team_a_id && form.team_b_id && form.team_a_id !== form.team_b_id && form.match_date && form.registration_cutoff

  return (
    <div className="flex flex-col gap-3">
      <Select label="Tournament (optional)" value={form.tournament_id} onChange={(e) => setForm({ ...form, tournament_id: e.target.value, team_a_id: '', team_b_id: '' })}>
        <option value="">— no tournament —</option>
        {tournaments?.map((t) => <option key={t.id} value={t.id}>{t.sport === 'BADMINTON' ? '🏸' : '🏏'} {t.name}</option>)}
      </Select>
      <Select label="Team A" value={form.team_a_id} onChange={(e) => setForm({ ...form, team_a_id: e.target.value })}>
        <option value="">— select —</option>
        {availableTeams.filter((t) => t.id !== form.team_b_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
      <Select label="Team B" value={form.team_b_id} onChange={(e) => setForm({ ...form, team_b_id: e.target.value })}>
        <option value="">— select —</option>
        {availableTeams.filter((t) => t.id !== form.team_a_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
      {previewName && (
        <p className="text-xs text-primary bg-accent rounded px-2 py-1">
          Contest name: <strong>{previewName}</strong>
        </p>
      )}
      <Input label="Match date" type="datetime-local" value={form.match_date}
        onChange={(e) => setForm({ ...form, match_date: e.target.value })} />
      <Input label="Registration cutoff" type="datetime-local" value={form.registration_cutoff}
        onChange={(e) => setForm({ ...form, registration_cutoff: e.target.value })} />
      <Input label="Prize" value={form.prize}
        onChange={(e) => setForm({ ...form, prize: e.target.value })} />
      <Btn disabled={!canCreate || create.isPending} onClick={() => create.mutate()}>Create Contest</Btn>

      <hr className="my-2" />
      <p className="text-xs font-semibold text-gray-500 uppercase">Lock a contest</p>
      <Select label="Tournament" value={lockTournamentId} onChange={(e) => { setLockTournamentId(e.target.value); setLockId('') }}>
        <option value="">— all tournaments —</option>
        {tournaments?.map((t) => <option key={t.id} value={t.id}>{t.sport === 'BADMINTON' ? '🏸' : '🏏'} {t.name}</option>)}
        <option value="__none__">— no tournament —</option>
      </Select>
      {(() => {
        const filtered = (contests || []).filter((c) => {
          if (c.is_locked) return false
          if (!lockTournamentId) return true
          if (lockTournamentId === '__none__') return !c.tournament_id
          return c.tournament_id === lockTournamentId
        })
        return (
          <Select label="Contest" value={lockId} onChange={(e) => setLockId(e.target.value)} disabled={!lockTournamentId}>
            <option value="">— select contest —</option>
            {filtered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )
      })()}
      <Btn disabled={!lockId || lock.isPending} onClick={() => lock.mutate(lockId)}>Lock Contest</Btn>

      <hr className="my-2" />
      <p className="text-xs font-semibold text-gray-500 uppercase">Mark contest as completed</p>
      <Select label="Tournament" value={completeTournamentId} onChange={(e) => { setCompleteTournamentId(e.target.value); setCompleteId('') }}>
        <option value="">— all tournaments —</option>
        {tournaments?.map((t) => <option key={t.id} value={t.id}>{t.sport === 'BADMINTON' ? '🏸' : '🏏'} {t.name}</option>)}
        <option value="__none__">— no tournament —</option>
      </Select>
      {(() => {
        const filtered = (contests || []).filter((c) => {
          if (c.is_completed) return false
          if (!c.is_locked) return false  // must be locked first
          if (!completeTournamentId) return true
          if (completeTournamentId === '__none__') return !c.tournament_id
          return c.tournament_id === completeTournamentId
        })
        return (
          <Select label="Contest" value={completeId} onChange={(e) => setCompleteId(e.target.value)} disabled={!completeTournamentId}>
            <option value="">— select contest —</option>
            {filtered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )
      })()}
      <Btn disabled={!completeId || markComplete.isPending} onClick={() => markComplete.mutate(completeId)}>Mark as Completed</Btn>

      <hr className="my-2" />
      <p className="text-xs font-semibold text-gray-500 uppercase">Edit contest prize</p>
      <ContestPrizeEditor contests={contests} qc={qc} setMsg={setMsg} />
      {msg && <p className="text-sm text-primary">{msg}</p>}
    </div>
  )
}

// ─── Score Entry Tab ──────────────────────────────────────────────────────────

const GAME_NAME_PRESETS = [
  "Men's Doubles A (5 Pointer)",
  "Men's Doubles B (4 Pointer)",
  "Men's Doubles C (3 Pointer)",
  "Men's Doubles D (2 Pointer)",
  "Men's Singles (3 Pointer)",
  "Women's Doubles (4 Pointer)",
  "Mixed Doubles (4 Pointer)",
]

function emptyForm() {
  return {
    gameType: 'DOUBLES',
    gameName: '',
    sel: { a1: '', a2: '', b1: '', b2: '' },
    winningTeamId: '',
    sets: [{ team_a_points: '', team_b_points: '' }, { team_a_points: '', team_b_points: '' }],
  }
}

function formFromGame(g, contest) {
  const gPlayers = g.players || []
  const aSide = gPlayers.filter((gp) => gp.player.team_id === contest.team_a_id)
  const bSide = gPlayers.filter((gp) => gp.player.team_id === contest.team_b_id)
  return {
    gameType: g.game_type,
    gameName: g.name || '',
    winningTeamId: g.winning_team_id || '',
    sel: {
      a1: aSide[0]?.player_id || '',
      a2: aSide[1]?.player_id || '',
      b1: bSide[0]?.player_id || '',
      b2: bSide[1]?.player_id || '',
    },
    sets: g.game_details?.sets?.map((s) => ({
      team_a_points: String(s.team_a_points),
      team_b_points: String(s.team_b_points),
    })) || [{ team_a_points: '', team_b_points: '' }, { team_a_points: '', team_b_points: '' }],
  }
}

function getPlayerIds(form) {
  if (form.gameType === 'SINGLES') return [form.sel.a1, form.sel.b1].filter(Boolean)
  return [form.sel.a1, form.sel.a2, form.sel.b1, form.sel.b2].filter(Boolean)
}

function buildPayload(form) {
  return {
    winning_team_id: form.winningTeamId,
    name: form.gameName || null,
    player_ids: getPlayerIds(form),
    game_details: {
      sets: form.sets.filter((s) => s.team_a_points !== '').map((s) => ({
        team_a_points: Number(s.team_a_points),
        team_b_points: Number(s.team_b_points),
      })),
    },
  }
}

// Shared form fields used in both Add and inline Edit
function ScoreFormFields({ form, patch, contest, playersA, playersB, availablePresets }) {
  const addSet = () => patch({ sets: [...form.sets, { team_a_points: '', team_b_points: '' }] })
  const removeSet = () => form.sets.length > 2 && patch({ sets: form.sets.slice(0, -1) })
  return (
    <div className="flex flex-col gap-3">
      <Select label="Game type" value={form.gameType}
        onChange={(e) => patch({ gameType: e.target.value, sel: { a1: '', a2: '', b1: '', b2: '' } })}>
        <option value="DOUBLES">Doubles</option>
        <option value="SINGLES">Singles</option>
      </Select>
      <Field label="Game name">
        <input list="game-name-presets"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="e.g. Men's Doubles B (4 Pointer)"
          value={form.gameName}
          onChange={(e) => patch({ gameName: e.target.value })} />
        <datalist id="game-name-presets">
          {(availablePresets || GAME_NAME_PRESETS).map((n) => <option key={n} value={n} />)}
        </datalist>
      </Field>
      <div className="flex flex-col gap-2 bg-muted rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase">Players</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-gray-600">{contest.team_a?.name}</p>
            <Select value={form.sel.a1} onChange={(e) => patch({ sel: { ...form.sel, a1: e.target.value } })}>
              <option value="">— player 1 —</option>
              {playersA?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            {form.gameType === 'DOUBLES' && (
              <Select value={form.sel.a2} onChange={(e) => patch({ sel: { ...form.sel, a2: e.target.value } })}>
                <option value="">— player 2 —</option>
                {playersA?.filter((p) => p.id !== form.sel.a1).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-gray-600">{contest.team_b?.name}</p>
            <Select value={form.sel.b1} onChange={(e) => patch({ sel: { ...form.sel, b1: e.target.value } })}>
              <option value="">— player 1 —</option>
              {playersB?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            {form.gameType === 'DOUBLES' && (
              <Select value={form.sel.b2} onChange={(e) => patch({ sel: { ...form.sel, b2: e.target.value } })}>
                <option value="">— player 2 —</option>
                {playersB?.filter((p) => p.id !== form.sel.b1).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            )}
          </div>
        </div>
      </div>
      <Select label="Winning team" value={form.winningTeamId} onChange={(e) => patch({ winningTeamId: e.target.value })}>
        <option value="">— select winner —</option>
        <option value={contest.team_a_id}>{contest.team_a?.name}</option>
        <option value={contest.team_b_id}>{contest.team_b?.name}</option>
      </Select>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase">Set Scores</p>
          <div className="flex gap-1">
            <button className="text-xs text-primary hover:underline" onClick={addSet}>+ Set</button>
            {form.sets.length > 2 && <button className="text-xs text-red-500 hover:underline" onClick={removeSet}>− Set</button>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-xs font-medium text-gray-500 px-1">
          <span>Set</span>
          <span className="text-center">{contest.team_a?.name}</span>
          <span className="text-center">{contest.team_b?.name}</span>
        </div>
        {form.sets.map((s, i) => (
          <div key={i} className="grid grid-cols-3 gap-2 items-center">
            <span className="text-xs text-gray-400">Set {i + 1}</span>
            <input type="number" className="border border-input rounded px-2 py-1 text-sm text-center outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
              value={s.team_a_points} onChange={(e) => { const n = [...form.sets]; n[i] = { ...n[i], team_a_points: e.target.value }; patch({ sets: n }) }} />
            <input type="number" className="border border-input rounded px-2 py-1 text-sm text-center outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
              value={s.team_b_points} onChange={(e) => { const n = [...form.sets]; n[i] = { ...n[i], team_b_points: e.target.value }; patch({ sets: n }) }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Add sub-tab ─────────────────────────────────────────────────────────────
function AddGameSubTab({ contest, contestId, playersA, playersB }) {
  const [form, setForm] = useState(emptyForm())
  const [saved, setSaved] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const qc = useQueryClient()
  const patch = (fields) => setForm((f) => ({ ...f, ...fields }))

  const usedNames = new Set((contest.games || []).map((g) => g.name).filter(Boolean))
  const availablePresets = GAME_NAME_PRESETS.filter((n) => !usedNames.has(n))

  const requiredPlayers = form.gameType === 'SINGLES' ? 2 : 4
  const canSave = form.winningTeamId && getPlayerIds(form).length === requiredPlayers

  const createGame = useMutation({
    mutationFn: () => adminApi.createGame(contestId, {
      game_type: form.gameType,
      name: form.gameName || null,
      player_ids: getPlayerIds(form),
    }),
    onSuccess: (res) => patchScore.mutate(res.data.id),
    onError: (e) => setErrMsg(e.response?.data?.detail || 'Error adding score'),
  })

  const patchScore = useMutation({
    mutationFn: (gameId) => adminApi.updateGame(contestId, gameId, buildPayload(form)),
    onSuccess: () => { qc.invalidateQueries(['contest', contestId]); setSaved(true) },
    onError: (e) => setErrMsg(e.response?.data?.detail || 'Error saving score'),
  })

  const isPending = createGame.isPending || patchScore.isPending

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 rounded-xl"
        style={{ background: '#052e1c', border: '2px solid #16a34a' }}>
        <span className="text-4xl">✅</span>
        <p className="font-bold text-green-400 text-base">Score saved! Points recalculated.</p>
        <button onClick={() => { setForm(emptyForm()); setSaved(false); setErrMsg('') }}
          className="text-sm font-semibold px-5 py-2 rounded-lg"
          style={{ background: '#16a34a', color: '#fff' }}>
          ＋ Add Another Game
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3" style={{ opacity: isPending ? 0.5 : 1, pointerEvents: isPending ? 'none' : 'auto' }}>
      {errMsg && (
        <div className="rounded-lg px-3 py-2 text-sm font-medium text-red-400"
          style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)' }}>
          {errMsg}
        </div>
      )}
      <ScoreFormFields form={form} patch={patch} contest={contest}
        playersA={playersA} playersB={playersB} availablePresets={availablePresets} />
      <Btn disabled={!canSave || isPending} onClick={() => createGame.mutate()}>
        {isPending ? 'Saving…' : 'Save Game Score'}
      </Btn>
    </div>
  )
}

// ─── View & Edit sub-tab ─────────────────────────────────────────────────────
function ViewGamesSubTab({ contest, contestId, playersA, playersB }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm())
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const qc = useQueryClient()
  const patchEdit = (fields) => setEditForm((f) => ({ ...f, ...fields }))

  // Newest first in admin view
  const games = [...(contest.games || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const handleEditClick = (g) => {
    setEditingId(g.id)
    setEditForm(formFromGame(g, contest))
    setSavedId(null)
    setErrMsg('')
  }

  const requiredEdit = editForm.gameType === 'SINGLES' ? 2 : 4
  const canSaveEdit = editForm.winningTeamId && getPlayerIds(editForm).length === requiredEdit

  const updateScore = useMutation({
    mutationFn: (gameId) => adminApi.updateGame(contestId, gameId, buildPayload(editForm)),
    onSuccess: (_, gameId) => { qc.invalidateQueries(['contest', contestId]); setSavedId(gameId); setEditingId(null) },
    onError: (e) => setErrMsg(e.response?.data?.detail || 'Error updating score'),
  })

  const deleteGame = useMutation({
    mutationFn: (gameId) => adminApi.deleteGame(contestId, gameId),
    onSuccess: () => { qc.invalidateQueries(['contest', contestId]); setConfirmDeleteId(null) },
    onError: (e) => setErrMsg(e.response?.data?.detail || 'Error deleting game'),
  })

  if (games.length === 0) {
    return <p className="text-sm text-center py-8" style={{ color: '#4a5568' }}>No games scored yet for this contest.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {errMsg && (
        <div className="rounded-lg px-3 py-2 text-sm font-medium text-red-400"
          style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)' }}>
          {errMsg}
        </div>
      )}
      {games.map((g) => {
        const aSide = (g.players || []).filter((gp) => gp.player.team_id === contest.team_a_id)
        const bSide = (g.players || []).filter((gp) => gp.player.team_id === contest.team_b_id)
        const sets = g.game_details?.sets || []
        const isEditing = editingId === g.id
        const isConfirmDelete = confirmDeleteId === g.id

        return (
          <div key={g.id} className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: '#0f1623', border: isEditing ? '1px solid rgba(99,102,241,.5)' : '1px solid #1e2d42' }}>

            {/* Card header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">{g.name || 'Unnamed Game'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(16,185,129,.12)', color: '#34d399', border: '1px solid rgba(16,185,129,.25)' }}>
                  {g.game_type === 'DOUBLES' ? '2v2' : '1v1'}
                </span>
                {savedId === g.id && <span className="text-xs text-green-400 font-semibold">✓ Updated</span>}
              </div>
              {!isEditing && (
                <div className="flex gap-1.5 shrink-0">
                  <button className="text-xs px-2.5 py-1 rounded font-semibold"
                    style={{ background: 'rgba(99,102,241,.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,.3)' }}
                    onClick={() => handleEditClick(g)}>Edit</button>
                  {isConfirmDelete ? (
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-red-400">Sure?</span>
                      <button className="text-xs px-2 py-1 rounded font-semibold"
                        style={{ background: 'rgba(239,68,68,.2)', color: '#f87171', border: '1px solid rgba(239,68,68,.4)' }}
                        onClick={() => deleteGame.mutate(g.id)}>Yes</button>
                      <button className="text-xs px-2 py-1 rounded font-semibold"
                        style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                        onClick={() => setConfirmDeleteId(null)}>No</button>
                    </div>
                  ) : (
                    <button className="text-xs px-2.5 py-1 rounded font-semibold"
                      style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }}
                      onClick={() => setConfirmDeleteId(g.id)}>Delete</button>
                  )}
                </div>
              )}
            </div>

            {isEditing ? (
              <>
                <ScoreFormFields form={editForm} patch={patchEdit} contest={contest} playersA={playersA} playersB={playersB} />
                <div className="flex gap-2">
                  <Btn disabled={!canSaveEdit || updateScore.isPending} onClick={() => updateScore.mutate(g.id)}>
                    {updateScore.isPending ? 'Saving…' : 'Save Changes'}
                  </Btn>
                  <button className="text-xs font-semibold px-4 py-1.5 rounded-lg"
                    style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
                    onClick={() => { setEditingId(null); setErrMsg('') }}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                {/* Players */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium" style={{ color: '#6b7280' }}>{contest.team_a?.name}</span>
                    {aSide.map((gp) => (
                      <span key={gp.player_id}
                        className={gp.player.team_id === g.winning_team_id ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                        {gp.player.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium" style={{ color: '#6b7280' }}>{contest.team_b?.name}</span>
                    {bSide.map((gp) => (
                      <span key={gp.player_id}
                        className={gp.player.team_id === g.winning_team_id ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                        {gp.player.name}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Set scores */}
                {sets.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="grid grid-cols-3 gap-1 text-xs font-medium px-1" style={{ color: '#4b5563' }}>
                      <span>Set</span>
                      <span className="text-center">{contest.team_a?.name}</span>
                      <span className="text-center">{contest.team_b?.name}</span>
                    </div>
                    {sets.map((s, i) => (
                      <div key={i} className="grid grid-cols-3 gap-1 text-xs px-1">
                        <span style={{ color: '#6b7280' }}>Set {i + 1}</span>
                        <span className={`text-center font-semibold ${contest.team_a_id === g.winning_team_id ? 'text-green-400' : 'text-gray-300'}`}>{s.team_a_points}</span>
                        <span className={`text-center font-semibold ${contest.team_b_id === g.winning_team_id ? 'text-green-400' : 'text-gray-300'}`}>{s.team_b_points}</span>
                      </div>
                    ))}
                  </div>
                )}
                {g.winning_team_id && (
                  <p className="text-xs font-semibold text-green-400">
                    🏆 {g.winning_team_id === contest.team_a_id ? contest.team_a?.name : contest.team_b?.name} won
                  </p>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Score Entry Tab (wrapper) ────────────────────────────────────────────────
function ScoreEntryTab() {
  const [subTab, setSubTab] = useState('view')
  const [tournamentId, setTournamentId] = useState('')
  const [contestId, setContestId] = useState('')

  const { data: tournaments } = useQuery({
    queryKey: ['all-tournaments'],
    queryFn: () => tournamentsApi.list().then((r) => r.data),
  })

  const { data: allContests } = useQuery({
    queryKey: ['contests'],
    queryFn: () => contestsApi.list().then((r) => r.data),
  })

  const tournamentContests = (allContests || []).filter((c) => c.tournament_id === tournamentId)

  const { data: contest } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: () => contestsApi.get(contestId).then((r) => r.data),
    enabled: !!contestId,
  })

  const { data: playersA } = useQuery({
    queryKey: ['players-team', contest?.team_a_id],
    queryFn: () => playersApi.list({ team_id: contest.team_a_id }).then((r) => r.data),
    enabled: !!contest?.team_a_id,
  })

  const { data: playersB } = useQuery({
    queryKey: ['players-team', contest?.team_b_id],
    queryFn: () => playersApi.list({ team_id: contest.team_b_id }).then((r) => r.data),
    enabled: !!contest?.team_b_id,
  })

  return (
    <div className="flex flex-col gap-3">

      {/* Sub-tab toggle */}
      <div className="flex gap-2">
        {[['view', 'View & Edit'], ['add', 'Add']].map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition"
            style={subTab === key
              ? { background: 'var(--primary)', color: 'var(--primary-foreground)' }
              : { background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
            }>{label}</button>
        ))}
      </div>

      {/* Shared: Tournament */}
      <Select label="Tournament" value={tournamentId}
        onChange={(e) => { setTournamentId(e.target.value); setContestId('') }}>
        <option value="">— select tournament —</option>
        {tournaments?.map((t) => (
          <option key={t.id} value={t.id}>{t.sport === 'BADMINTON' ? '🏸' : '🏏'} {t.name}</option>
        ))}
      </Select>

      {/* Shared: Contest */}
      {tournamentId && (
        <Select label="Contest" value={contestId} onChange={(e) => setContestId(e.target.value)}>
          <option value="">— select contest —</option>
          {tournamentContests.map((c) => (
            <option key={c.id} value={c.id}>Match #{c.match_number ?? '?'}: {c.name}</option>
          ))}
        </Select>
      )}

      {/* Sub-tab content */}
      {contest && subTab === 'view' && (
        <ViewGamesSubTab contest={contest} contestId={contestId} playersA={playersA} playersB={playersB} />
      )}
      {contest && subTab === 'add' && (
        <AddGameSubTab contest={contest} contestId={contestId} playersA={playersA} playersB={playersB} />
      )}
    </div>
  )
}

// ─── All Teams Tab ─────────────────────────────────────────────────────────────
function AllTeamsTab() {
  const [tournamentId, setTournamentId] = useState('')
  const [contestId, setContestId] = useState('')

  const { data: tournaments } = useQuery({
    queryKey: ['all-tournaments'],
    queryFn: () => tournamentsApi.list().then((r) => r.data),
  })

  const { data: allContests } = useQuery({
    queryKey: ['contests'],
    queryFn: () => contestsApi.list().then((r) => r.data),
  })

  const tournamentContests = (allContests || []).filter(
    (c) => c.tournament_id === tournamentId
  )

  const { data: teams, isLoading, error } = useQuery({
    queryKey: ['all-teams', contestId],
    queryFn: () => adminApi.allTeams(contestId).then((r) => r.data),
    enabled: !!contestId,
  })

  return (
    <div className="flex flex-col gap-3">
      <Select label="Tournament" value={tournamentId} onChange={(e) => { setTournamentId(e.target.value); setContestId('') }}>
        <option value="">— select tournament —</option>
        {tournaments?.map((t) => (
          <option key={t.id} value={t.id}>{t.sport === 'BADMINTON' ? '🏸' : '🏏'} {t.name}</option>
        ))}
      </Select>
      {tournamentId && (
        <Select label="Contest" value={contestId} onChange={(e) => setContestId(e.target.value)}>
          <option value="">— select contest —</option>
          {tournamentContests.map((c) => (
            <option key={c.id} value={c.id}>Match #{c.match_number ?? '?'}: {c.name}</option>
          ))}
        </Select>
      )}
      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && <p className="text-red-500 text-sm">Error loading teams.</p>}
      {teams?.length === 0 && contestId && <p className="text-gray-400 text-sm italic">No teams entered yet.</p>}
      {teams?.map((ut) => (
        <div key={ut.id} className="bg-card rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <p className="font-semibold text-sm">{ut.user?.name ?? ut.user_id.slice(0, 8) + '…'}</p>
            <p className="font-bold text-primary">{ut.total_points.toFixed(1)} pts</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {ut.players.map((utp) => (
              <span key={utp.id} className={`text-xs px-2 py-0.5 rounded-full border
                ${utp.is_captain ? 'bg-accent border-primary/40' : utp.is_vice_captain ? 'bg-blue-50 border-blue-300' : 'bg-muted border-border'}`}>
                {utp.player.name}
                {utp.is_captain ? ' (C)' : utp.is_vice_captain ? ' (VC)' : ''}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [tab, setTab] = useState('Teams')

  const tabComponents = {
    Tournaments: <TournamentsTab />,
    Teams: <TeamsTab />,
    Players: <PlayersTab />,
    Contests: <ContestsTab />,
    'Score Entry': <ScoreEntryTab />,
    'All Teams': <AllTeamsTab />,
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to="/" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition">← Home</Link>
      <h2 className="text-2xl font-semibold tracking-tight">Admin Panel</h2>

      {/* Tab bar — horizontal scroll for mobile */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition
              ${tab === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-2">
          {tabComponents[tab]}
        </CardContent>
      </Card>
    </div>
  )
}
