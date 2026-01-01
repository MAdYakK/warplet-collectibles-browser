'use client'

import { useEffect } from 'react'

export default function MiniAppReady() {
  useEffect(() => {
    // Only run inside miniapp runtimes
    const isMiniApp = typeof window !== 'undefined' && Boolean((window as any).farcaster)
    if (!isMiniApp) return

    ;(async () => {
      // Dynamic import so the SDK is never loaded in normal browser mode
      const { sdk } = await import('@farcaster/miniapp-sdk')
      // Tell the client we're ready to display / fully initialize
      await sdk.actions.ready()
    })()
  }, [])

  return null
}
