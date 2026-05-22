import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { analyticsApi } from '../api/endpoints'

/**
 * Returns the persistent anonymous browser ID stored in localStorage.
 * Created once on first visit; survives across sessions.
 */
function getOrCreateSessionId() {
  const key = 'ss_anon_id'
  let id = localStorage.getItem(key)
  if (!id) {
    // Simple UUID v4 without external deps
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
    localStorage.setItem(key, id)
  }
  return id
}

/**
 * Fires a page-view event to the backend on every route change.
 * Errors are silently swallowed — tracking must never break the UI.
 */
export function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    const sessionId = getOrCreateSessionId()
    analyticsApi
      .trackPage({ page: location.pathname, session_id: sessionId })
      .catch(() => {}) // best-effort
  }, [location.pathname])
}
