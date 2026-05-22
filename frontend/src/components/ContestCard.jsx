import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TeamBadge from './TeamBadge'
import { getTeamCaptain } from '../utils/teamLogos'

function useCountdown(targetDate) {
  const [diff, setDiff] = useState(() => Math.max(0, new Date(targetDate) - Date.now()))
  useEffect(() => {
    const id = setInterval(() => setDiff(Math.max(0, new Date(targetDate) - Date.now())), 1000)
    return () => clearInterval(id)
  }, [targetDate])
  if (!targetDate || diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatPrize(prize) {
  return (prize || 'Winner Badge').replace('Winner Badge', 'Badge')
}

/**
 * Shared contest card — used on the home page (size="sm") and tournament
 * detail page (size="md").
 *
 * Props
 *   to              — React Router link target
 *   isLive          — contest is locked / in-progress
 *   isDone          — contest is completed
 *   matchDate       — ISO date string
 *   teamAName       — left team name
 *   teamBName       — right team name
 *   topRight        — label shown top-right (e.g. tournament name or "Match #1")
 *   prize           — prize string
 *   participantCount — number | null  (null = don't render the cell)
 *   size            — "sm" (w-44, horizontal scroll) | "md" (full-width, vertical list)
 */
export default function ContestCard({
  to,
  isLive,
  isDone,
  matchDate,
  teamAName,
  teamBName,
  topRight,
  prize,
  participantCount,
  size = 'md',
}) {
  const countdown = useCountdown(matchDate)
  const captainSrcA = getTeamCaptain(teamAName)
  const captainSrcB = getTeamCaptain(teamBName)

  // Status badge
  let statusLabel, statusStyle
  if (isDone) {
    statusLabel = 'Ended'
    statusStyle = { background: 'rgba(100,116,139,.15)', border: '1px solid rgba(100,116,139,.25)', color: '#64748b' }
  } else if (isLive) {
    statusLabel = 'Live'
    statusStyle = { background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.35)', color: '#f87171' }
  } else {
    statusLabel = 'Open'
    statusStyle = { background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.35)', color: '#34d399' }
  }

  // Compact time string used when the contest is not yet live
  let timeVal, timeColor
  if (countdown) {
    timeVal = countdown
    timeColor = '#34d399'
  } else {
    timeVal = new Date(matchDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    timeColor = '#94a3b8'
  }

  const isSmall = size === 'sm'
  const wrapperCls = isSmall
    ? 'flex-none w-44 snap-start rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.6),0_0_20px_rgba(16,185,129,0.35)]'
    : 'rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:brightness-110'
  const cardStyle = {
    background: '#080d14',
    border: `1px solid ${isLive ? 'rgba(239,68,68,.45)' : isDone ? 'rgba(100,116,139,.2)' : 'rgba(16,185,129,.25)'}`,
    boxShadow: isLive ? '0 0 16px rgba(239,68,68,.08)' : 'none',
  }
  const px = isSmall ? 'px-2' : 'px-3'
  const nameSz = isSmall ? 'text-[0.55rem]' : 'text-[0.6rem]'

  return (
    <Link to={to} className={wrapperCls} style={cardStyle}>
      {/* ── Image area ── */}
      <div className="relative h-28">
        {/* Left captain */}
        <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          {captainSrcA && <img src={captainSrcA} alt="" className="w-full h-full object-cover object-top" />}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(90deg, rgba(8,13,20,.3) 0%, rgba(8,13,20,.85) 100%)' }} />
        </div>
        {/* Right captain */}
        <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
          {captainSrcB && <img src={captainSrcB} alt="" className="w-full h-full object-cover object-top" />}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(270deg, rgba(8,13,20,.3) 0%, rgba(8,13,20,.85) 100%)' }} />
        </div>

        {/* Top bar */}
        <div className={`absolute top-0 left-0 right-0 flex items-center justify-between ${px} pt-2 z-10`}>
          <span className="inline-flex items-center gap-0.5 text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full"
            style={statusStyle}>
            <svg className="w-1.5 h-1.5 fill-current" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" /></svg>
            {statusLabel}
          </span>
          {topRight && (
            <span className="text-[0.5rem] truncate max-w-[80px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,.55)', color: '#64748b', backdropFilter: 'blur(6px)' }}>
              {topRight}
            </span>
          )}
        </div>

        {/* Center VS */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="absolute top-0 bottom-0 w-px"
            style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(16,185,129,.5) 50%, transparent 100%)' }} />
          <span className="relative text-[0.6rem] font-black px-1.5 py-0.5 rounded-lg"
            style={{ background: 'rgba(7,26,16,.85)', color: '#fff', border: '1px solid rgba(16,185,129,.5)', backdropFilter: 'blur(8px)', boxShadow: '0 0 10px rgba(16,185,129,.5)' }}>
            VS
          </span>
        </div>

        {/* Bottom team names */}
        <div className={`absolute bottom-0 left-0 right-0 ${px} pt-6 pb-1.5 z-10`}
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(8,13,20,.97) 100%)' }}>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <TeamBadge teamName={teamAName} size="xs" className="ring-1 ring-white shrink-0" />
              <p className={`${nameSz} font-bold text-white leading-tight truncate`}>{teamAName}</p>
            </div>
            <div className="flex items-center gap-1 min-w-0 flex-row-reverse">
              <TeamBadge teamName={teamBName} size="xs" className="ring-1 ring-white shrink-0" />
              <p className={`${nameSz} font-bold text-white leading-tight truncate`}>{teamBName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info strip ── */}
      <div className={`flex items-center justify-between ${px} py-1.5`}
        style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
        {/* Left: participant count when available */}
        {participantCount != null && (
          <div className="flex items-center gap-1">
            <img src="/card-icons/participants.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
            <span className="text-[0.6rem] font-bold text-white">
              {participantCount > 0 ? participantCount : '—'}
            </span>
          </div>
        )}
        {/* Right: prize when live, countdown when open */}
        {isLive ? (
          <div className={`flex items-center gap-1 ${participantCount == null ? 'ml-auto' : ''}`}>
            <img src="/card-icons/prize%20pool.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
            <span className="text-[0.6rem] font-bold text-white truncate max-w-[70px]">
              {formatPrize(prize)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <img src="/card-icons/starts%20in.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
            <span className="text-[0.6rem] font-bold tabular-nums" style={{ color: timeColor }}>{timeVal}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
