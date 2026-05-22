import { Link, useNavigate } from 'react-router-dom'

function Section({ children }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
    >
      {children}
    </div>
  )
}

function Divider() {
  return (
    <div
      className="h-px w-full"
      style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.35) 40%, rgba(6,182,212,0.25) 60%, transparent)' }}
    />
  )
}

export default function AboutPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => navigate(-1)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start">← Back</button>

      {/* Hero */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center text-center gap-4"
        style={{
          background: 'linear-gradient(#0f1623,#0f1623) padding-box, linear-gradient(135deg,#10b981,#06b6d4) border-box',
          border: '1px solid transparent',
          boxShadow: '0 0 32px rgba(16,185,129,0.08), 0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <img src="/logo.webp" alt="Super Selector" className="w-16 h-16 object-contain" style={{ filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.6))' }} />
        <div>
          <h1 className="text-2xl font-sora font-extrabold tracking-tight">
            <span className="text-gradient">Super</span>
            <span className="text-white"> Selector</span>
          </h1>
          <p className="text-xs mt-1 font-medium" style={{ color: '#34d399' }}>
            Fantasy League · Strategy · Community
          </p>
        </div>
        <p className="text-sm leading-relaxed max-w-sm" style={{ color: '#94a3b8' }}>
          A fantasy league competition platform built purely for recreational fun and sports enthusiasm.
        </p>
      </div>

      {/* What is it */}
      <Section>
        <h2 className="text-sm font-bold text-white tracking-wide uppercase" style={{ color: '#64748b' }}>What is Super Selector?</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          Super Selector lets sports fans compete with friends and communities by creating teams,
          making selections, and climbing Super Selectors across tournaments and contests.
          The app is designed around <span className="text-emerald-400 font-medium">strategy</span>,{' '}
          <span className="text-cyan-400 font-medium">community engagement</span>, and the excitement
          of following live sports.
        </p>
      </Section>

      <Divider />

      {/* Inspiration */}
      <Section>
        <h2 className="text-sm font-bold tracking-wide uppercase" style={{ color: '#64748b' }}>The Name &amp; Inspiration</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          <span className="text-white font-semibold">"Super Selector"</span> is an ode to — and directly inspired by —
          the iconic{' '}
          <span className="text-emerald-400 font-medium">Super Selector</span>{' '}
          contest hosted by{' '}
          <a
            href="https://en.wikipedia.org/wiki/ESPN_Super_Selector"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition hover:text-emerald-300"
            style={{ color: '#34d399' }}
          >
            ESPNcricinfo
          </a>{' '}
          during the Cricket World Cup 2023. The experience and excitement around that contest
          heavily influenced the spirit behind this platform.
        </p>
      </Section>

      <Divider />

      {/* Built by Sonh */}
      <Section>
        <h2 className="text-sm font-bold tracking-wide uppercase" style={{ color: '#64748b' }}>Built by Sonh</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          Super Selector is developed by{' '}
          <span className="text-white font-semibold">Sonh</span> — a name inspired by a now sparingly
          used word across Eastern Uttar Pradesh, India.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          "Sonh" is derived from the Hindi word{' '}
          <span className="text-emerald-400 font-medium">"Sondh"</span>, often associated with an
          earthy, grounded essence — like the smell of soil after rain. The name reflects{' '}
          <span className="text-white">simplicity, authenticity, and rootedness</span>.
        </p>
      </Section>

      <Divider />

      {/* Location + Contact */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
        >
          <span className="text-xs font-bold tracking-wide uppercase" style={{ color: '#64748b' }}>Location</span>
          <div className="flex items-start gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <p className="text-sm text-white leading-snug">Bengaluru,<br />Karnataka, India</p>
          </div>
        </div>

        <div
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ background: '#0f1623', border: '1px solid #1e2d42' }}
        >
          <span className="text-xs font-bold tracking-wide uppercase" style={{ color: '#64748b' }}>Contact</span>
          <div className="flex items-start gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <a
              href="mailto:ankeshmishra@gmail.com"
              className="text-sm break-all transition hover:text-cyan-300"
              style={{ color: '#06b6d4' }}
            >
              ankeshmishra@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* Back link */}
      <Link
        to="/"
        className="text-xs text-center font-medium transition hover:text-emerald-300 pb-2"
        style={{ color: '#475569' }}
      >
        ← Back to Home
      </Link>
    </div>
  )
}
