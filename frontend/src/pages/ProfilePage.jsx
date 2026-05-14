import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { user, loginWithToken } = useAuth()
  const [teamName, setTeamName] = useState('')
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (user) setTeamName(user.team_name || '')
  }, [user])

  const update = useMutation({
    mutationFn: () => authApi.updateProfile({ team_name: teamName.trim() || null }),
    onSuccess: async () => {
      await loginWithToken(localStorage.getItem('token'))
      setEditing(false)
      setMsg('Profile updated!')
    },
    onError: (e) => setMsg(e.response?.data?.detail || 'Update failed.'),
  })

  const handleCancel = () => {
    setTeamName(user?.team_name || '')
    setEditing(false)
    setMsg('')
  }

  const initial = user?.name?.[0]?.toUpperCase() || '?'

  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => navigate(-1)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start">← Back</button>
      <h2 className="text-lg font-bold text-white">My Profile</h2>

      <div className="rounded-2xl p-5 flex flex-col gap-5" style={{ background: '#0f1623', border: '1px solid #1e2d42' }}>
        {/* Avatar */}
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="avatar" className="w-16 h-16 rounded-full" style={{ border: '2px solid #10b981' }} />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}>
            {initial}
          </div>
        )}

        <div style={{ borderTop: '1px solid #1e2d42' }} className="pt-4 flex flex-col gap-4">
          {/* Name */}
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#475569' }}>Name</p>
            <p className="font-medium text-white">{user?.name}</p>
          </div>
          {/* Email */}
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#475569' }}>Email</p>
            <p className="font-medium" style={{ color: '#94a3b8' }}>{user?.email}</p>
          </div>
          {/* Fantasy team name */}
          <div>
            <p className="text-xs mb-1" style={{ color: '#475569' }}>Fantasy Team Name</p>
            {editing ? (
              <div className="flex flex-col gap-2">
                <input
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                  style={{ background: '#1a2236', border: '1px solid #1e2d42' }}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Thunder Smashers"
                  maxLength={100}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => update.mutate()}
                    disabled={update.isPending}
                    className="flex-1 font-semibold text-sm py-2.5 rounded-xl transition disabled:opacity-40 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}
                  >
                    {update.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 text-sm py-2.5 rounded-xl transition"
                    style={{ border: '1px solid #1e2d42', color: '#64748b' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-white">
                  {user?.team_name || <span className="italic font-normal" style={{ color: '#475569' }}>Not set</span>}
                </p>
                <button
                  onClick={() => { setEditing(true); setMsg('') }}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                >
                  {user?.team_name ? 'Edit' : 'Set name'}
                </button>
              </div>
            )}
            {msg && (
              <p className={`text-xs mt-2 ${msg.includes('failed') || msg.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                {msg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
