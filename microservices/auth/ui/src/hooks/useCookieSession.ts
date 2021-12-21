import { useEffect, useState } from 'react'

function parseTokenCookie() {
  return (
    (document.cookie &&
      document.cookie.split('token=')[1] &&
      document.cookie.split('token=')[1].split(';')[0]) ||
    null
  )
}

function useCookieSession(): string | null {
  const [cookieSession, setCookieSession] = useState<string | null>(null)

  useEffect(() => {
    const cookie = parseTokenCookie()
    if (cookie != null) {
      setCookieSession(cookie)
    }
  }, [])

  return cookieSession
}

export default useCookieSession
