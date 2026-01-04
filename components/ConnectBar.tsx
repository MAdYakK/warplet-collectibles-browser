'use client'

import { useEffect, useMemo } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

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

const DISCONNECT_LOCK_KEY = 'warplet:manualDisconnectLock'

function getDisconnectLock(): boolean {
  try {
    return sessionStorage.getItem(DISCONNECT_LOCK_KEY) === '1'
  } catch {
    return false
  }
}

function setDisconnectLock(on: boolean) {
  try {
    sessionStorage.setItem(DISCONNECT_LOCK_KEY, on ? '1' : '0')
  } catch {}
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
  const { disconnectAsync } = useDisconnect()

  const miniApp = useMemo(() => isProbablyMiniApp(), [])

  const primary = connectors.find((c) => c.ready) || (connectors.length ? connectors[0] : undefined)

  // Auto-connect in miniapp, but NOT right after a manual disconnect.
  useEffect(() => {
    if (!miniApp) return
    if (isConnected) return
    if (!primary) return
    if (isPending) return
    if (getDisconnectLock()) return

    connect({ connector: primary })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniApp, isConnected, primary?.id, isPending])

  const rightLabel = (() => {
    if (isConnected) return 'Disconnect'
    if (isPending) return 'Connecting…'
    if (!primary) return miniApp ? 'Loading…' : 'Open in Warpcast'
    return 'Connect'
  })()

  const pillBase = 'rounded-full px-4 py-2 text-xs font-semibold active:scale-[0.98] transition'
  const pillPrimary = 'bg-white text-[#1b0736]'
  const pillDisabled = 'bg-white/25 text-white/70 cursor-not-allowed'

  const onConnectClick = () => {
    // user manually initiated connect => allow auto-connect again
    setDisconnectLock(false)
    if (primary) connect({ connector: primary })
  }

  const onDisconnectClick = async () => {
    // prevent immediate auto-reconnect in miniapp
    setDisconnectLock(true)
    try {
      await disconnectAsync()
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-white/60">Wallet</div>
          <div className="text-sm font-semibold text-white truncate">
            {isConnected ? shortAddr(address) : miniApp ? 'Not connected' : 'Not connected'}
          </div>
          {error ? <div className="mt-1 text-xs text-red-300">{error.message}</div> : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showMyWalletButton ? (
            <button type="button" onClick={onMyWallet} className={[pillBase, pillPrimary].join(' ')}>
              My Wallet
            </button>
          ) : null}

          {/* Single primary action: Connect OR Disconnect (no "Ready") */}
          {!isConnected ? (
            <button
              type="button"
              className={[
                pillBase,
                isPending || (!primary && miniApp) ? pillDisabled : pillPrimary,
              ].join(' ')}
              onClick={onConnectClick}
              disabled={isPending || (!primary && miniApp)}
            >
              {rightLabel}
            </button>
          ) : (
            <button type="button" className={[pillBase, pillPrimary].join(' ')} onClick={onDisconnectClick}>
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
