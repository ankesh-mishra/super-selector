import { useState } from 'react'
import TeamBadge from './TeamBadge'
import { getTeamCaptain } from '../utils/teamLogos'

/**
 * Shows a team captain portrait card.
 * Falls back to TeamBadge if the image is unavailable.
 * size: 'sm' (h-10 w-9) | 'md' (h-16 w-14) | 'lg' (h-24 w-20)
 */
export default function CaptainBadge({ teamName, size = 'md', className = '' }) {
  const [error, setError] = useState(false)
  const src = getTeamCaptain(teamName)

  const dims =
    size === 'sm' ? 'h-10 w-9'
    : size === 'lg' ? 'h-24 w-20'
    : 'h-16 w-14'

  const badgeSize = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'

  if (!src || error) {
    return <TeamBadge teamName={teamName} size={badgeSize} className={className} />
  }

  return (
    <img
      src={src}
      alt={teamName ? `${teamName} captain` : 'Captain'}
      onError={() => setError(true)}
      className={`${dims} rounded-xl object-cover object-top shrink-0 ${className}`}
    />
  )
}
