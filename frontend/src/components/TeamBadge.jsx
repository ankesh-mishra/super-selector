import { useState } from 'react'
import { getTeamLogo, getTeamInitials, getTeamColor } from '../utils/teamLogos'

/**
 * Shows a team logo if available, falls back to coloured initials badge.
 * size: 'sm' (h-5 w-5) | 'md' (h-8 w-8) | 'lg' (h-12 w-12)
 */
export default function TeamBadge({ teamName, size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false)
  const logo = getTeamLogo(teamName)

  const sizeClass = size === 'sm' ? 'h-5 w-5 text-[9px]'
    : size === 'lg' ? 'h-12 w-12 text-base'
    : 'h-8 w-8 text-xs'

  if (logo && !imgError) {
    return (
      <img
        src={logo}
        alt={teamName}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
      />
    )
  }

  return (
    <span
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold shrink-0
        ${getTeamColor(teamName)} ${className}`}
    >
      {getTeamInitials(teamName)}
    </span>
  )
}
