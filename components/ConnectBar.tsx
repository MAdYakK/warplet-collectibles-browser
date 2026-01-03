'use client'

import { useEffect, useMemo } from 'react'
import { useAccount, useConnect } from 'wagmi'

function shortAddr(a?: string) {
  if (!a) return ''
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function isProbablyMiniApp() {
  if (typeof window === 'undefined') return false
  const inIframe = window.self !== window.top
  const hasFarcasterGlobal = Boolean((window as any).farcaster)
  return hasFarcasterGlobal || inIframe
}

export default function ConnectBar({
  showMyWalletButton,
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
    if (isConnected) return 'Connected'
    if (isPending) return 'Connecting…'
    if (!primary) return miniApp ? 'Loading…' : 'Open in Warpcast'
    return 'Connect'
  })()

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-white/60">
            Wallet
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {isConnected ? shortAddr(address) : miniApp ? 'Connecting…' : 'Not connected'}
          </div>
          {error ? <div className="mt-1 text-xs text-red-300">{error.message}</div> : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showMyWalletButton ? (
            <button
              type="button"
              onClick={onMyWallet}
              className="
                rounded-full px-4 py-2 text-xs font-semibold
                bg-white text-[#1b0736]
                active:scale-[0.98] transition
              "
            >
              My Wallet
            </button>
          ) : null}

          {!isConnected ? (
            <button
              className="
                rounded-full px-4 py-2 text-xs font-semibold
                bg-white text-[#1b0736]
                active:scale-[0.98] transition
              "
              onClick={() => primary && connect({ connector: primary })}
              disabled={isPending || (!primary && miniApp)}
            >
              {rightLabel}
            </button>
          ) : (
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/80">
              Ready
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
