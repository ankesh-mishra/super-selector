import client from './client'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => client.post('/api/auth/register', data),
  login: (data) => client.post('/api/auth/login', data),
  me: () => client.get('/api/auth/me'),
  updateProfile: (data) => client.patch('/api/auth/profile', data),
}

// ── Teams ─────────────────────────────────────────────────────────────────────
export const teamsApi = {
  list: () => client.get('/api/teams'),
  get: (id) => client.get(`/api/teams/${id}`),
  players: (teamId) => client.get(`/api/teams/${teamId}/players`),
}

// ── Players ───────────────────────────────────────────────────────────────────
export const playersApi = {
  list: (params) => client.get('/api/players', { params }),
  trending: (params) => client.get('/api/players/trending', { params }),
  byPoints: (params) => client.get('/api/players/by-points', { params }),
  stats: (id) => client.get(`/api/players/${id}/stats`),
}

// ── Tournaments ───────────────────────────────────────────────────────────────
export const tournamentsApi = {
  list: (params) => client.get('/api/tournaments', { params }),
  get: (id) => client.get(`/api/tournaments/${id}`),
}

// ── Contests ──────────────────────────────────────────────────────────────────
export const contestsApi = {
  list: () => client.get('/api/contests'),
  get: (id) => client.get(`/api/contests/${id}`),
  trending: () => client.get('/api/contests/trending'),
}

// ── User Teams ────────────────────────────────────────────────────────────────
export const userTeamsApi = {
  create: (contestId, data) => client.post(`/api/contests/${contestId}/my-team`, data),
  update: (contestId, data) => client.put(`/api/contests/${contestId}/my-team`, data),
  get: (contestId) => client.get(`/api/contests/${contestId}/my-team`),
  getByUser: (contestId, userId) => client.get(`/api/contests/${contestId}/teams/${userId}`),
}

// ── My Contests ───────────────────────────────────────────────────────────────
export const myContestsApi = {
  list: () => client.get('/api/auth/my-contests'),
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
export const leaderboardApi = {
  contest: (contestId) => client.get(`/api/leaderboard/contests/${contestId}`),
  tournament: (tournamentId) => client.get(`/api/leaderboard/tournaments/${tournamentId}`),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {  createTournament: (data) => client.post('/api/admin/tournaments', data),
  updateTournament: (id, data) => client.patch(`/api/admin/tournaments/${id}`, data),
  getTournament: (id) => client.get(`/api/admin/tournaments/${id}`),
  addTournamentTeam: (tournamentId, teamId) =>
    client.post(`/api/admin/tournaments/${tournamentId}/teams`, { team_id: teamId }),
  removeTournamentTeam: (tournamentId, teamId) =>
    client.delete(`/api/admin/tournaments/${tournamentId}/teams/${teamId}`),
  createTeam: (data) => client.post('/api/admin/teams', data),
  createPlayer: (data) => client.post('/api/admin/players', data),
  updatePlayer: (id, data) => client.patch(`/api/admin/players/${id}`, data),
  createContest: (data) => client.post('/api/admin/contests', data),
  updateContest: (id, data) => client.patch(`/api/admin/contests/${id}`, data),
  createGame: (contestId, data) => client.post(`/api/admin/contests/${contestId}/games`, data),
  updateGame: (contestId, gameId, data) =>
    client.patch(`/api/admin/contests/${contestId}/games/${gameId}`, data),
  deleteGame: (contestId, gameId) =>
    client.delete(`/api/admin/contests/${contestId}/games/${gameId}`),
  allTeams: (contestId) => client.get(`/api/admin/contests/${contestId}/all-teams`),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  // Fire-and-forget — caller should catch errors silently
  trackPage: (data) => client.post('/api/analytics/pageview', data),
  summary: () => client.get('/api/analytics/summary'),
}
