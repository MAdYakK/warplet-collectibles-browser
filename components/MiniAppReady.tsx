'use client'

import { useEffect } from 'react'

export default function MiniAppReady() {
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        if (cancelled) return
        await sdk.actions.ready()
      } catch {
        // Not in Warpcast / preview runtime (or SDK not available).
        // Ignore so normal browsers don't break.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
