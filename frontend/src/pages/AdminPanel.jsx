import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, analyticsApi, teamsApi, playersApi, contestsApi, tournamentsApi } from '../api/endpoints'
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
const TABS = ['Tournaments', 'Teams', 'Players', 'Contests', 'Score Entry', 'All Teams', 'Analytics']

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

// ─── Helper: extract unique teams from a contests list ─────────────────────────
function teamsFromContests(contests, allTeams) {
  const ids = new Set((contests || []).flatMap((c) => [String(c.team_a_id), String(c.team_b_id)]))
  return (allTeams || []).filter((t) => ids.has(String(t.id))).sort((a, b) => a.name.localeCompare(b.name))
}

// ─── Contest Date Editor ──────────────────────────────────────────────────────
function ContestDateEditor({ contests, qc, setMsg, tournaments, allTeams }) {
  const [editId, setEditId] = useState('')
  const [editVal, setEditVal] = useState('')
  const [filterTournamentId, setFilterTournamentId] = useState('')
  const [filterTeamId, setFilterTeamId] = useState('')

  const byTournament = (contests || []).filter((c) => {
    if (!filterTournamentId) return true
    if (filterTournamentId === '__none__') return !c.tournament_id
    return c.tournament_id === filterTournamentId
  })
  const teamOptions = teamsFromContests(byTournament, allTeams)
  const filtered = byTournament.filter((c) => {
    if (c.is_completed) return false
    if (!filterTeamId) return true
    return String(c.team_a_id) === filterTeamId || String(c.team_b_id) === filterTeamId
  })

  const editDate = useMutation({
    mutationFn: () => adminApi.updateContest(editId, { match_date: new Date(editVal).toISOString(), is_locked: false }),
    onSuccess: () => { qc.invalidateQueries(['contests']); setMsg('Match time updated!') },
    onError: (e) => setMsg(e.response?.data?.detail || 'Error updating match time', 'error'),
  })
  return (
    <>
      <Select label="Tournament" value={filterTournamentId} onChange={(e) => { setFilterTournamentId(e.target.value); setFilterTeamId(''); setEditId('') }}>
        <option value="">— all tournaments —</option>
        {(tournaments || []).map((t) => <option key={t.id} value={t.id}>{t.sport === 'BADMINTON' ? '🏸' : '🏏'} {t.name}</option>)}
        <option value="__none__">— no tournament —</option>
      </Select>
      {teamOptions.length > 0 && (
        <Select label="Team" value={filterTeamId} onChange={(e) => { setFilterTeamId(e.target.value); setEditId('') }}>
          <option value="">— all teams —</option>
          {teamOptions.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
        </Select>
      )}
      <Select label="Contest" value={editId} onChange={(e) => {
        setEditId(e.target.value)
        const c = filtered.find((x) => x.id === e.target.value)
        if (c?.match_date) setEditVal(c.match_date.slice(0, 16))
      }}>
        <option value="">— select contest —</option>
        {filtered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      {editId && (
        <Input label="New match date/time" type="datetime-local" value={editVal}
          onChange={(e) => setEditVal(e.target.value)} />
      )}
      <Btn disabled={!editId || !editVal || editDate.isPending} onClick={() => editDate.mutate()}>
        Save Match Time
      </Btn>
    </>
  )
}

// ─── Contest Prize Editor ─────────────────────────────────────────────────────
function ContestPrizeEditor({ contests, qc, setMsg, tournaments, allTeams }) {
  const [editPrizeId, setEditPrizeId] = useState('')
  const [editPrizeVal, setEditPrizeVal] = useState('Winner Badge')
  const [filterTournamentId, setFilterTournamentId] = useState('')
  const [filterTeamId, setFilterTeamId] = useState('')

  const byTournament = (contests || []).filter((c) => {
    if (!filterTournamentId) return true
    if (filterTournamentId === '__none__') return !c.tournament_id
    return c.tournament_id === filterTournamentId
  })
  const teamOptions = teamsFromContests(byTournament, allTeams)
  const filtered = byTournament.filter((c) => {
    if (!filterTeamId) return true
    return String(c.team_a_id) === filterTeamId || String(c.team_b_id) === filterTeamId
  })

  const editPrize = useMutation({
    mutationFn: () => adminApi.updateContest(editPrizeId, { prize: editPrizeVal }),
    onSuccess: () => { qc.invalidateQueries(['contests']); setMsg('Prize updated!') },
    onError: (e) => setMsg(e.response?.data?.detail || 'Error updating prize', 'error'),
  })
  return (
    <>
      <Select label="Tournament" value={filterTournamentId} onChange={(e) => { setFilterTournamentId(e.target.value); setFilterTeamId(''); setEditPrizeId('') }}>
        <option value="">— all tournaments —</option>
        {(tournaments || []).map((t) => <option key={t.id} value={t.id}>{t.sport === 'BADMINTON' ? '🏸' : '🏏'} {t.name}</option>)}
        <option value="__none__">— no tournament —</option>
      </Select>
      {teamOptions.length > 0 && (
        <Select label="Team" value={filterTeamId} onChange={(e) => { setFilterTeamId(e.target.value); setEditPrizeId('') }}>
          <option value="">— all teams —</option>
          {teamOptions.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
        </Select>
      )}
      <Select label="Contest" value={editPrizeId} onChange={(e) => {
        setEditPrizeId(e.target.value)
        const c = filtered.find((x) => x.id === e.target.value)
        setEditPrizeVal(c?.prize || 'Winner Badge')
      }}>
        <option value="">— select contest —</option>
        {filtered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
  const [subTab, setSubTab] = useState('create')
  const qc = useQueryClient()
  const [msg, setMsg] = useState({ text: '', type: 'success' })

  const notify = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3000)
  }

  const { data: allTeams } = useQuery({ queryKey: ['teams'], queryFn: () => teamsApi.list().then((r) => r.data) })
  const { data: contests } = useQuery({ queryKey: ['contests'], queryFn: () => contestsApi.list().then((r) => r.data) })
  const { data: tournaments } = useQuery({ queryKey: ['all-tournaments'], queryFn: () => tournamentsApi.list().then((r) => r.data) })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {[['create', 'Create'], ['status', 'Status'], ['edit', 'Edit']].map(([key, label]) => (
          <button key={key} onClick={() => { setSubTab(key); setMsg({ text: '', type: 'success' }) }}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition"
            style={subTab === key
              ? { background: 'var(--primary)', color: 'var(--primary-foreground)' }
              : { background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
            }>{label}</button>
        ))}
      </div>
      {msg.text && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
          style={msg.type === 'success'
            ? { background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.35)', color: '#34d399' }
            : { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', color: '#f87171' }}>
          <span>{msg.type === 'success' ? '✓' : '✕'}</span>
          {msg.text}
        </div>
      )}
      {subTab === 'create' && <ContestCreateSubTab allTeams={allTeams} tournaments={tournaments} qc={qc} setMsg={notify} />}
      {subTab === 'status' && <ContestStatusSubTab contests={contests} tournaments={tournaments} allTeams={allTeams} qc={qc} setMsg={notify} />}
      {subTab === 'edit'   && <ContestEditSubTab   contests={contests} tournaments={tournaments} allTeams={allTeams} qc={qc} setMsg={notify} />}
    </div>
  )
}

function ContestCreateSubTab({ allTeams, tournaments, qc, setMsg }) {
  const [form, setForm] = useState({ tournament_id: '', team_a_id: '', team_b_id: '', match_date: '', registration_cutoff: '', prize: 'Winner Badge' })
  const { data: tournamentDetail } = useQuery({
    queryKey: ['admin-tournament', form.tournament_id],
    queryFn: () => adminApi.getTournament(form.tournament_id).then((r) => r.data),
    enabled: !!form.tournament_id,
  })
  const availableTeams = form.tournament_id && tournamentDetail ? (tournamentDetail.teams || []) : (allTeams || [])
  const teamA = availableTeams.find((t) => t.id === form.team_a_id)
  const teamB = availableTeams.find((t) => t.id === form.team_b_id)
  const previewName = teamA && teamB ? `${teamA.name} v ${teamB.name}` : null
  const create = useMutation({
    mutationFn: () => adminApi.createContest({ ...form, tournament_id: form.tournament_id || null }),
    onSuccess: () => { qc.invalidateQueries(['contests']); setMsg('Contest created!') },
    onError: (e) => setMsg(e.response?.data?.detail || 'Error', 'error'),
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
      {previewName && <p className="text-xs text-primary bg-accent rounded px-2 py-1">Contest name: <strong>{previewName}</strong></p>}
      <Input label="Match date" type="datetime-local" value={form.match_date} onChange={(e) => setForm({ ...form, match_date: e.target.value })} />
      <Input label="Registration cutoff" type="datetime-local" value={form.registration_cutoff} onChange={(e) => setForm({ ...form, registration_cutoff: e.target.value })} />
      <Input label="Prize" value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} />
      <Btn disabled={!canCreate || create.isPending} onClick={() => create.mutate()}>Create Contest</Btn>
    </div>
  )
}

function ContestStatusSubTab({ contests, tournaments, allTeams, qc, setMsg }) {
  const [lockId, setLockId] = useState('')
  const [lockTournamentId, setLockTournamentId] = useState('')
  const [lockTeamId, setLockTeamId] = useState('')
  const [completeId, setCompleteId] = useState('')
  const [completeTournamentId, setCompleteTournamentId] = useState('')
  const [completeTeamId, setCompleteTeamId] = useState('')

  const lock = useMutation({
    mutationFn: (id) => adminApi.updateContest(id, { is_locked: true }),
    onSuccess: () => { qc.invalidateQueries(['contests']); setLockId(''); setLockTournamentId(''); setLockTeamId(''); setMsg('Contest locked!') },
    onError: (e) => setMsg(e.response?.data?.detail || 'Error locking contest', 'error'),
  })
  const markComplete = useMutation({
    mutationFn: (id) => adminApi.updateContest(id, { is_completed: true }),
    onSuccess: () => { qc.invalidateQueries(['contests']); setCompleteId(''); setCompleteTournamentId(''); setCompleteTeamId(''); setMsg('Contest marked as completed!') },
    onError: (e) => setMsg(e.response?.data?.detail || 'Error completing contest', 'error'),
  })

  const lockByTournament = (contests || []).filter((c) => {
    if (!lockTournamentId) return true
    if (lockTournamentId === '__none__') return !c.tournament_id
    return c.tournament_id === lockTournamentId
  })
  const lockTeamOptions = teamsFromContests(lockByTournament, allTeams)
  const lockFiltered = lockByTournament.filter((c) => {
    if (c.is_locked) return false
    if (!lockTeamId) return true
    return String(c.team_a_id) === lockTeamId || String(c.team_b_id) === lockTeamId
  })

  const completeByTournament = (contests || []).filter((c) => {
    if (!completeTournamentId) return true
    if (completeTournamentId === '__none__') return !c.tournament_id
    return c.tournament_id === completeTournamentId
  })
  const completeTeamOptions = teamsFromContests(completeByTournament, allTeams)
  const completeFiltered = completeByTournament.filter((c) => {
    if (c.is_completed || !c.is_locked) return false
    if (!completeTeamId) return true
    return String(c.team_a_id) === completeTeamId || String(c.team_b_id) === completeTeamId
  })

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-gray-500 uppercase">Lock a contest</p>
      <Select label="Tournament" value={lockTournamentId} onChange={(e) => { setLockTournamentId(e.target.value); setLockTeamId(''); setLockId('') }}>
        <option value="">— all tournaments —</option>
        {tournaments?.map((t) => <option key={t.id} value={t.id}>{t.sport === 'BADMINTON' ? '🏸' : '🏏'} {t.name}</option>)}
        <option value="__none__">— no tournament —</option>
      </Select>
      {lockTeamOptions.length > 0 && (
        <Select label="Team" value={lockTeamId} onChange={(e) => { setLockTeamId(e.target.value); setLockId('') }}>
          <option value="">— all teams —</option>
          {lockTeamOptions.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
        </Select>
      )}
      <Select label="Contest" value={lockId} onChange={(e) => setLockId(e.target.value)} disabled={!lockTournamentId}>
        <option value="">— select contest —</option>
        {lockFiltered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Btn disabled={!lockId || lock.isPending} onClick={() => lock.mutate(lockId)}>Lock Contest</Btn>

      <hr className="my-2" />
      <p className="text-xs font-semibold text-gray-500 uppercase">Mark as completed</p>
      <Select label="Tournament" value={completeTournamentId} onChange={(e) => { setCompleteTournamentId(e.target.value); setCompleteTeamId(''); setCompleteId('') }}>
        <option value="">— all tournaments —</option>
        {tournaments?.map((t) => <option key={t.id} value={t.id}>{t.sport === 'BADMINTON' ? '🏸' : '🏏'} {t.name}</option>)}
        <option value="__none__">— no tournament —</option>
      </Select>
      {completeTeamOptions.length > 0 && (
        <Select label="Team" value={completeTeamId} onChange={(e) => { setCompleteTeamId(e.target.value); setCompleteId('') }}>
          <option value="">— all teams —</option>
          {completeTeamOptions.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
        </Select>
      )}
      <Select label="Contest" value={completeId} onChange={(e) => setCompleteId(e.target.value)} disabled={!completeTournamentId}>
        <option value="">— select contest —</option>
        {completeFiltered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Btn disabled={!completeId || markComplete.isPending} onClick={() => markComplete.mutate(completeId)}>Mark as Completed</Btn>
    </div>
  )
}

function ContestEditSubTab({ contests, tournaments, allTeams, qc, setMsg }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-gray-500 uppercase">Change match time</p>
      <ContestDateEditor contests={contests} qc={qc} setMsg={setMsg} tournaments={tournaments} allTeams={allTeams} />
      <hr className="my-2" />
      <p className="text-xs font-semibold text-gray-500 uppercase">Edit prize</p>
      <ContestPrizeEditor contests={contests} qc={qc} setMsg={setMsg} tournaments={tournaments} allTeams={allTeams} />
    </div>
  )
}

// ─── Score Entry Tab ──────────────────────────────────────────────────────────

const GAME_NAME_PRESETS = [
  { code: 'MDA', name: "Men's Doubles A", label: "Men's Doubles A (5 Pointer)", type: 'DOUBLES' },
  { code: 'MDB', name: "Men's Doubles B", label: "Men's Doubles B (4 Pointer)", type: 'DOUBLES' },
  { code: 'MDC', name: "Men's Doubles C", label: "Men's Doubles C (3 Pointer)", type: 'DOUBLES' },
  { code: 'MDD', name: "Men's Doubles D", label: "Men's Doubles D (2 Pointer)", type: 'DOUBLES' },
  { code: 'MS',  name: "Men's Singles",   label: "Men's Singles (3 Pointer)",   type: 'SINGLES' },
  { code: 'WD',  name: "Women's Doubles", label: "Women's Doubles (4 Pointer)", type: 'DOUBLES' },
  { code: 'MXD', name: 'Mixed Doubles',   label: 'Mixed Doubles (4 Pointer)',   type: 'DOUBLES' },
]

function emptyForm() {
  return {
    gameType: 'DOUBLES',
    gameName: '',
    gameCode: '',
    sel: { a1: '', a2: '', b1: '', b2: '' },
    winningTeamId: '',
    sets: [
      { team_a_points: '', team_b_points: '', shots: {} },
      { team_a_points: '', team_b_points: '', shots: {} },
    ],
  }
}

function formFromGame(g, contest) {
  const gPlayers = g.players || []
  const aSide = gPlayers.filter((gp) => gp.player.team_id === contest.team_a_id)
  const bSide = gPlayers.filter((gp) => gp.player.team_id === contest.team_b_id)
  return {
    gameType: g.game_type,
    gameName: g.name || '',
    gameCode: g.game_code || '',
    winningTeamId: g.winning_team_id || '',
    sel: {
      a1: aSide[0]?.player_id || '',
      a2: aSide[1]?.player_id || '',
      b1: bSide[0]?.player_id || '',
      b2: bSide[1]?.player_id || '',
    },
    sets: g.game_details?.sets?.map((s) => ({
      team_a_points: String(s.scores?.[contest.team_a_id] ?? s.team_a_points ?? ''),
      team_b_points: String(s.scores?.[contest.team_b_id] ?? s.team_b_points ?? ''),
      shots: Object.fromEntries(
        Object.entries(s.shots || {}).map(([pid, v]) => [
          pid,
          { positive: String(v.positive ?? ''), negative: String(v.negative ?? '') },
        ])
      ),
    })) || [
      { team_a_points: '', team_b_points: '', shots: {} },
      { team_a_points: '', team_b_points: '', shots: {} },
    ],
  }
}

function getPlayerIds(form) {
  if (form.gameType === 'SINGLES') return [form.sel.a1, form.sel.b1].filter(Boolean)
  return [form.sel.a1, form.sel.a2, form.sel.b1, form.sel.b2].filter(Boolean)
}

function buildPayload(form, contest) {
  const playerIds = getPlayerIds(form)
  return {
    winning_team_id: form.winningTeamId,
    name: form.gameName || null,
    game_code: form.gameCode || null,
    player_ids: playerIds,
    game_details: {
      sets: form.sets.filter((s) => s.team_a_points !== '').map((s) => ({
        scores: {
          [contest.team_a_id]: Number(s.team_a_points),
          [contest.team_b_id]: Number(s.team_b_points),
        },
        shots: Object.fromEntries(
          playerIds
            .filter((pid) => s.shots?.[pid])
            .map((pid) => [
              pid,
              {
                positive: Number(s.shots[pid].positive || 0),
                negative: Number(s.shots[pid].negative || 0),
              },
            ])
        ),
      })),
    },
  }
}

// Shared form fields used in both Add and inline Edit
function ScoreFormFields({ form, patch, contest, playersA, playersB, availablePresets }) {
  const addSet = () => patch({ sets: [...form.sets, { team_a_points: '', team_b_points: '', shots: {} }] })
  const removeSet = () => form.sets.length > 2 && patch({ sets: form.sets.slice(0, -1) })

  // All players currently selected in the form, in order A1, A2, B1, B2
  const allPlayers = [...(playersA || []), ...(playersB || [])]
  const selectedPlayers = getPlayerIds(form)
    .map((pid) => allPlayers.find((p) => p.id === pid))
    .filter(Boolean)

  const patchShot = (setIdx, pid, field, val) => {
    const newSets = form.sets.map((s, i) => {
      if (i !== setIdx) return s
      return { ...s, shots: { ...s.shots, [pid]: { ...(s.shots?.[pid] || {}), [field]: val } } }
    })
    patch({ sets: newSets })
  }

  return (
    <div className="flex flex-col gap-3">
      <Select label="Game" value={form.gameCode}
        onChange={(e) => {
          const preset = GAME_NAME_PRESETS.find((p) => p.code === e.target.value)
          if (preset) patch({ gameCode: preset.code, gameName: preset.label, gameType: preset.type, sel: { a1: '', a2: '', b1: '', b2: '' } })
          else patch({ gameCode: '', gameName: '' })
        }}>
        <option value="">— select game —</option>
        {(availablePresets || GAME_NAME_PRESETS).map((p) => (
          <option key={p.code} value={p.code}>{p.label}</option>
        ))}
      </Select>
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
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase">Set Scores & Shots</p>
          <div className="flex gap-1">
            <button className="text-xs text-primary hover:underline" onClick={addSet}>+ Set</button>
            {form.sets.length > 2 && <button className="text-xs text-red-500 hover:underline" onClick={removeSet}>− Set</button>}
          </div>
        </div>

        {form.sets.map((s, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5">
            {/* Set score row */}
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-xs font-semibold text-gray-500">Set {i + 1}</span>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[0.6rem] text-gray-400">{contest.team_a?.name}</span>
                <input type="number" className="border border-input rounded px-2 py-1 text-sm text-center outline-none focus:ring-1 focus:ring-primary bg-background text-foreground w-full"
                  value={s.team_a_points} onChange={(e) => { const n = [...form.sets]; n[i] = { ...n[i], team_a_points: e.target.value }; patch({ sets: n }) }} />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[0.6rem] text-gray-400">{contest.team_b?.name}</span>
                <input type="number" className="border border-input rounded px-2 py-1 text-sm text-center outline-none focus:ring-1 focus:ring-primary bg-background text-foreground w-full"
                  value={s.team_b_points} onChange={(e) => { const n = [...form.sets]; n[i] = { ...n[i], team_b_points: e.target.value }; patch({ sets: n }) }} />
              </div>
            </div>

            {/* Per-player shot inputs */}
            {selectedPlayers.length > 0 && (
              <div className="mt-1 flex flex-col gap-1 border-t border-dashed border-border pt-2">
                <div className="grid grid-cols-3 gap-1 px-0.5">
                  <span className="text-[0.6rem] font-semibold text-gray-500 uppercase">Player</span>
                  <span className="text-[0.6rem] font-semibold text-green-500 text-center uppercase">+ Shots</span>
                  <span className="text-[0.6rem] font-semibold text-red-400 text-center uppercase">− Shots</span>
                </div>
                {selectedPlayers.map((p) => (
                  <div key={p.id} className="grid grid-cols-3 gap-1 items-center">
                    <span className="text-xs text-gray-400 truncate" title={p.name}>{p.name}</span>
                    <input
                      type="number" min="0" placeholder="0"
                      className="border border-input rounded px-2 py-1 text-xs text-center outline-none focus:ring-1 focus:ring-green-500 bg-background text-foreground"
                      value={s.shots?.[p.id]?.positive ?? ''}
                      onChange={(e) => patchShot(i, p.id, 'positive', e.target.value)}
                    />
                    <input
                      type="number" min="0" placeholder="0"
                      className="border border-input rounded px-2 py-1 text-xs text-center outline-none focus:ring-1 focus:ring-red-400 bg-background text-foreground"
                      value={s.shots?.[p.id]?.negative ?? ''}
                      onChange={(e) => patchShot(i, p.id, 'negative', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
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

  const usedCodes = new Set((contest.games || []).map((g) => g.game_code).filter(Boolean))
  const availablePresets = GAME_NAME_PRESETS.filter((p) => !usedCodes.has(p.code))

  const requiredPlayers = form.gameType === 'SINGLES' ? 2 : 4
  const canSave = form.gameCode && form.winningTeamId && getPlayerIds(form).length === requiredPlayers

  const createGame = useMutation({
    mutationFn: () => adminApi.createGame(contestId, {
      game_type: form.gameType,
      game_code: form.gameCode || null,
      name: form.gameName || null,
      player_ids: getPlayerIds(form),
    }),
    onSuccess: (res) => patchScore.mutate(res.data.id),
    onError: (e) => setErrMsg(e.response?.data?.detail || 'Error adding score'),
  })

  const patchScore = useMutation({
    mutationFn: (gameId) => adminApi.updateGame(contestId, gameId, buildPayload(form, contest)),
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
  const canSaveEdit = editForm.gameCode && editForm.winningTeamId && getPlayerIds(editForm).length === requiredEdit

  const updateScore = useMutation({
    mutationFn: (gameId) => adminApi.updateGame(contestId, gameId, buildPayload(editForm, contest)),
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
                {g.game_code && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold font-mono"
                    style={{ background: 'rgba(99,102,241,.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,.3)' }}>
                    {g.game_code}
                  </span>
                )}
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
  const [teamId, setTeamId] = useState('')
  const [contestId, setContestId] = useState('')

  const { data: tournaments } = useQuery({
    queryKey: ['all-tournaments'],
    queryFn: () => tournamentsApi.list().then((r) => r.data),
  })

  const { data: allContests } = useQuery({
    queryKey: ['contests'],
    queryFn: () => contestsApi.list().then((r) => r.data),
  })

  const { data: allTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.list().then((r) => r.data),
  })

  const byTournament = (allContests || []).filter((c) => c.tournament_id === tournamentId)
  const teamOptions = teamsFromContests(byTournament, allTeams)

  const tournamentContests = byTournament.filter((c) =>
    !teamId || String(c.team_a_id) === teamId || String(c.team_b_id) === teamId
  )

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
        onChange={(e) => { setTournamentId(e.target.value); setTeamId(''); setContestId('') }}>
        <option value="">— select tournament —</option>
        {tournaments?.map((t) => (
          <option key={t.id} value={t.id}>{t.sport === 'BADMINTON' ? '🏸' : '🏏'} {t.name}</option>
        ))}
      </Select>

      {/* Shared: Team filter */}
      {tournamentId && teamOptions.length > 0 && (
        <Select label="Filter by Team" value={teamId}
          onChange={(e) => { setTeamId(e.target.value); setContestId('') }}>
          <option value="">— all teams —</option>
          {teamOptions.map((t) => (
            <option key={t.id} value={String(t.id)}>{t.name}</option>
          ))}
        </Select>
      )}

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

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function StatCard({ label, value }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-muted p-3 gap-0.5 min-w-[90px]">
      <span className="text-xl font-bold tabular-nums">{value ?? '—'}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide text-center">{label}</span>
    </div>
  )
}

function AnalyticsTab() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsApi.summary().then((r) => r.data),
    refetchInterval: 60_000, // auto-refresh every minute
  })

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading analytics…</p>
  if (isError) return <p className="text-sm text-destructive py-4">Failed to load analytics.</p>

  const { active_now, visitors, logged_in_users, total_page_views, top_pages, dau_7d } = data

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Auto-refreshes every 60s</p>
        <Btn variant="ghost" onClick={() => refetch()}>Refresh now</Btn>
      </div>

      {/* Active now */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Live (last 30 min)</p>
        <div className="flex gap-3 flex-wrap">
          <StatCard label="Active sessions" value={active_now} />
          <StatCard label="Total page views" value={total_page_views} />
        </div>
      </section>

      <hr className="my-1" />

      {/* Unique visitors */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Unique visitors (by device)</p>
        <div className="flex gap-3 flex-wrap">
          <StatCard label="Last 24h" value={visitors.last_24h} />
          <StatCard label="Last 7 days" value={visitors.last_7d} />
          <StatCard label="Last 30 days" value={visitors.last_30d} />
          <StatCard label="All time" value={visitors.all_time} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Counts anonymous + logged-in as 1 if from the same browser.
        </p>
      </section>

      <hr className="my-1" />

      {/* Logged-in users */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Logged-in users</p>
        <div className="flex gap-3 flex-wrap">
          <StatCard label="Last 24h" value={logged_in_users.last_24h} />
          <StatCard label="Last 7 days" value={logged_in_users.last_7d} />
          <StatCard label="Last 30 days" value={logged_in_users.last_30d} />
        </div>
      </section>

      <hr className="my-1" />

      {/* DAU table */}
      {dau_7d.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Daily unique visitors — last 7 days</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-1 pr-4 font-medium">Date</th>
                <th className="text-right py-1 font-medium">Visitors</th>
              </tr>
            </thead>
            <tbody>
              {dau_7d.map((row) => (
                <tr key={row.date} className="border-b border-border/40">
                  <td className="py-1 pr-4 tabular-nums">{row.date}</td>
                  <td className="py-1 text-right tabular-nums font-semibold">{row.visitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Top pages */}
      {top_pages.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top pages (all time)</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-1 pr-4 font-medium">Page</th>
                <th className="text-right py-1 font-medium">Views</th>
              </tr>
            </thead>
            <tbody>
              {top_pages.map((row) => (
                <tr key={row.page} className="border-b border-border/40">
                  <td className="py-1 pr-4 font-mono">{row.page}</td>
                  <td className="py-1 text-right tabular-nums font-semibold">{row.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
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
    Analytics: <AnalyticsTab />,
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
