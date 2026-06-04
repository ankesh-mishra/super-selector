import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function NavItem({ to, icon, label, onClick }) {
  const { pathname } = useLocation()
  const active = pathname === to || pathname.startsWith(to + '/')
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <img src={icon} alt="" className="w-5 h-5 object-contain shrink-0" />
      {label}
    </Link>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
    close()
  }

  return (
    <>
      {/* Top bar */}
      <header style={{ background: '#0a1120', borderBottom: '1px solid #1e2d42' }} className="sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.webp" alt="Super Selector" className="w-10 h-10 object-contain" />
            <span className="tracking-tight font-sora">
              <span className="text-gradient" style={{ fontWeight: 800 }}>Super</span>
              <span className="text-white" style={{ fontWeight: 600 }}> Selector</span>
            </span>
          </Link>
          {user && (
            <button
              onClick={() => setOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={close} />
      )}

      {/* Drawer */}
      <div
        style={{ background: '#0a1120', borderLeft: '1px solid #1e2d42' }}
        className={`fixed top-0 right-0 h-full w-72 z-50 shadow-2xl flex flex-col transform transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div style={{ borderBottom: '1px solid #1e2d42' }} className="flex items-center justify-between px-4 h-14 shrink-0">
          <div>
            <p className="font-semibold text-sm text-white">{user?.team_name || user?.name}</p>
            {user?.team_name && <p className="text-xs text-slate-500">{user?.name}</p>}
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col p-3 gap-0.5 flex-1 overflow-y-auto">
          <NavItem to="/" icon="/Home.png" label="Home" onClick={close} />
          <NavItem to="/my-contests" icon="/My Contests.png" label="My Contests" onClick={close} />
          <NavItem to="/tournaments" icon="/Tournaments.png" label="Tournaments" onClick={close} />
          <NavItem to="/scoring-rules" icon="/About.png" label="Scoring Rules" onClick={close} />
          <NavItem to="/profile" icon="/My Profile.png" label="My Profile" onClick={close} />
          <NavItem to="/about" icon="/About.png" label="About" onClick={close} />
          {user?.is_admin && (
            <>
              <div className="my-2" style={{ borderTop: '1px solid #1e2d42' }} />
              <NavItem to="/admin" icon="⚙️" label="Admin Panel" onClick={close} />
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid #1e2d42' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
          >
            <span className="text-base">🚪</span> Logout
          </button>
        </div>
      </div>
    </>
  )
}
