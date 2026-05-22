/**
 * Renders a player's profile photo, or a gradient initial-letter fallback.
 * size: 'sm' (w-8 h-8), 'md' (w-11 h-11 – default), 'lg' (w-14 h-14)
 */
import { useState } from 'react'

const SIZES = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-2xl',
}

export default function PlayerAvatar({ player, size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false)
  const dim = SIZES[size] ?? SIZES.md
  const initial = player?.name?.charAt(0).toUpperCase() ?? '?'

  if (player?.photo_url && !imgError) {
    return (
      <img
        src={player.photo_url}
        alt={player.name}
        className={`${dim} rounded-full object-cover object-top shrink-0 ${className}`}
        style={{ border: '1px solid rgba(16,185,129,.3)' }}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center shrink-0 font-black text-white ${className}`}
      style={{
        background: 'linear-gradient(135deg,rgba(16,185,129,.25),rgba(6,182,212,.2))',
        border: '1px solid rgba(16,185,129,.3)',
      }}
    >
      {initial}
    </div>
  )
}
