'use client'

import { useEffect, useMemo } from 'react'
import { useAccount, useConnect } from 'wagmi'

function isProbablyMiniApp() {
  if (typeof window === 'undefined') return false
  const inIframe = window.self !== window.top
  const hasFarcasterGlobal = Boolean((window as any).farcaster)
  return hasFarcasterGlobal || inIframe
}

function shortAddr(addr?: string) {
  if (!addr) return ''
  const a = addr.trim()
  if (a.length <= 12) return a
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export default function ConnectBar({
  showMyWalletButton = false,
  onMyWallet,
}: {
  showMyWalletButton?: boolean
  onMyWallet?: () => void
}) {
  const { isConnected, address } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()

  const miniApp = useMemo(() => isProbablyMiniApp(), [])

  const primary =
    connectors.find((c) => c.ready) || (connectors.length ? connectors[0] : undefined)

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
    <div className="rounded-3xl border border-white/10 bg-transparent p-3">
      {/* Row 1: title + buttons (buttons never get pushed off) */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white truncate">
          Warplet Collectibles Browser
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showMyWalletButton ? (
            <button
              type="button"
              onClick={() => onMyWallet?.()}
              className="
                rounded-full px-4 py-2 text-xs font-semibold
                border border-white/15 bg-white/5 text-white
                active:scale-[0.98] transition
              "
              title="Return to your wallet"
            >
              My Wallet
            </button>
          ) : null}

          {!isConnected ? (
            <button
              className="
                rounded-full
                bg-white text-[#1b0736]
                px-4 py-2 text-xs font-semibold
                active:scale-[0.98] transition
              "
              onClick={() => primary && connect({ connector: primary })}
              disabled={isPending || (!primary && miniApp)}
            >
              {rightLabel}
            </button>
          ) : (
            <div className="text-xs rounded-full bg-white text-[#1b0736] px-3 py-2 font-semibold">
              Ready
            </div>
          )}
        </div>
      </div>

      {/* Row 2: status text (can be long, won’t affect buttons) */}
      <div className="mt-1 text-xs text-white/80 truncate">
        {isConnected
          ? `Connected: ${shortAddr(address)}`
          : miniApp
          ? 'Connecting wallet…'
          : 'Not connected'}
      </div>

      {error ? <div className="mt-1 text-xs text-white">{error.message}</div> : null}
    </div>
  )
}
