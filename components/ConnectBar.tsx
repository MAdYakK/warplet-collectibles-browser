'use client'

import { useEffect } from 'react'
import { useAccount, useConnect } from 'wagmi'

function isMiniAppRuntime() {
  return typeof window !== 'undefined' && Boolean((window as any).farcaster)
}

export default function ConnectBar() {
  const { isConnected, address } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()

  const primary = connectors.find((c) => c.ready)

  // ✅ Auto-connect inside Warpcast preview/miniapp
  useEffect(() => {
    if (!isMiniAppRuntime()) return
    if (isConnected) return
    if (!primary) return
    if (isPending) return

    connect({ connector: primary })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, primary?.id])

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border p-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold">Warplet Collectibles Browser</div>
        <div className="text-xs text-neutral-500 truncate">
          {isConnected ? `Connected: ${address}` : 'Not connected'}
        </div>
        {error ? <div className="mt-1 text-xs text-red-600">{error.message}</div> : null}
      </div>

      {!isConnected ? (
        <button
          className="shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold active:scale-[0.99]"
          onClick={() => primary && connect({ connector: primary })}
          disabled={isPending || !primary}
        >
          {isPending ? 'Connecting…' : primary ? 'Connect' : 'Open in Warpcast'}
        </button>
      ) : (
        <div className="text-xs rounded-xl bg-neutral-100 px-3 py-2">Ready</div>
      )}
    </div>
  )
}
