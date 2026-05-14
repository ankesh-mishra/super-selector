import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let data
      if (isRegister) {
        ;({ data } = await authApi.register({ email: form.email, password: form.password, name: form.name }))
      } else {
        ;({ data } = await authApi.login({ email: form.email, password: form.password }))
      }
      await loginWithToken(data.access_token)
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.detail || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition"

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#080d14' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'linear-gradient(#0f1623,#0f1623) padding-box, linear-gradient(135deg,#10b981,#06b6d4) border-box',
          border: '1px solid transparent',
          boxShadow: '0 0 40px rgba(16,185,129,.08), 0 16px 48px rgba(0,0,0,.5)',
        }}
      >
        <div className="text-center mb-7">
          <img src="/logo.webp" alt="Super Selector" className="w-20 h-20 object-contain mx-auto mb-3" />
          <h1 className="font-sora text-xl tracking-tight">
            <span className="text-gradient" style={{ fontWeight: 800 }}>Super</span>
            <span className="text-white" style={{ fontWeight: 600 }}> Selector</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>Fantasy Sports League</p>
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center mb-4 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,.1)' }}>
            {error}
          </p>
        )}

        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          {isRegister && (
            <input
              className={inputCls}
              style={{ background: '#1a2236', border: '1px solid #1e2d42' }}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          )}
          <input
            type="email"
            className={inputCls}
            style={{ background: '#1a2236', border: '1px solid #1e2d42' }}
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            className={inputCls}
            style={{ background: '#1a2236', border: '1px solid #1e2d42' }}
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="font-semibold py-3 rounded-xl transition disabled:opacity-50 hover:opacity-90 mt-1"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}
          >
            {loading ? '…' : isRegister ? 'Register' : 'Login'}
          </button>
          <button
            type="button"
            className="text-xs text-center transition hover:text-emerald-300"
            style={{ color: '#34d399' }}
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </form>
      </div>
    </div>
  )
}
