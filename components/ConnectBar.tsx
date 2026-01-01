'use client'

import { useEffect, useMemo } from 'react'
import { useAccount, useConnect } from 'wagmi'

function isProbablyMiniApp() {
  if (typeof window === 'undefined') return false
  // Preview and Warpcast may not always set window.farcaster immediately,
  // so also treat being inside an iframe as "probably miniapp".
  const inIframe = window.self !== window.top
  const hasFarcasterGlobal = Boolean((window as any).farcaster)
  return hasFarcasterGlobal || inIframe
}

export default function ConnectBar() {
  const { isConnected, address } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()

  const miniApp = useMemo(() => isProbablyMiniApp(), [])

  // Prefer a ready connector, but if none are marked ready yet,
  // still allow trying the first connector (miniapp connector often becomes ready after init).
  const primary =
    connectors.find((c) => c.ready) ||
    (connectors.length ? connectors[0] : undefined)

  // Auto-connect inside miniapp/preview once we have a connector
  useEffect(() => {
    if (!miniApp) return
    if (isConnected) return
    if (!primary) return
    if (isPending) return
    connect({ connector: primary })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniApp, isConnected, primary?.id])

  const rightLabel = (() => {
    if (isConnected) return 'Ready'
    if (isPending) return 'Connecting…'
    if (!primary) return miniApp ? 'Loading…' : 'Open in Warpcast'
    return 'Connect'
  })()

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border p-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold">Warplet Collectibles Browser</div>
        <div className="text-xs text-neutral-500 truncate">
          {isConnected ? `Connected: ${address}` : miniApp ? 'Connecting wallet…' : 'Not connected'}
        </div>
        {error ? <div className="mt-1 text-xs text-red-600">{error.message}</div> : null}
      </div>

      {!isConnected ? (
        <button
          className="shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold active:scale-[0.99]"
          onClick={() => primary && connect({ connector: primary })}
          disabled={isPending || (!primary && miniApp)}
        >
          {rightLabel}
        </button>
      ) : (
        <div className="text-xs rounded-xl bg-neutral-100 px-3 py-2">Ready</div>
      )}
    </div>
  )
}
