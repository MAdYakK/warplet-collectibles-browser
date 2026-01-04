'use client'

import { useEffect, useMemo, useState } from 'react'
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

  // In normal browser mode we can use wagmi connectors.
  // In miniapp mode we should NOT force wagmi connect() (it’s the source of connector.getChainId crashes).
  const primary = connectors?.[0]

  const pillBase =
    'rounded-full px-4 py-2 text-xs font-semibold active:scale-[0.98] transition whitespace-nowrap'
  const pillOn = 'bg-white text-[#1b0736]'
  const pillOff = 'bg-white/10 text-white border border-white/15 hover:bg-white/15'

  // Browser/dev connect button (wagmi)
  const onConnect = () => {
    if (!primary) return
    connect({ connector: primary })
  }

  // Miniapp: "Switch wallet" = ask Warpcast provider for accounts again.
  // Then reload to rehydrate wagmi/SWR state cleanly.
  const onSwitchWallet = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      const provider = await sdk.wallet.getEthereumProvider()
      if (!provider) throw new Error('No Warpcast wallet provider')

      await (provider as any).request?.({ method: 'eth_requestAccounts' })

      // Hard reset is the most reliable way to sync hooks/state in embedded contexts.
      // (Warpcast effectively owns the session; wagmi can lag behind.)
      window.location.reload()
    } catch (e) {
      console.warn('Switch wallet failed', e)
    }
  }

  // Browser/dev disconnect (wagmi)
  const onDisconnect = async () => {
    try {
      await disconnectAsync()
    } catch {
      // ignore
    }
  }

  // Optional: If you're in browser and not connected, don't show "Connecting…" forever.
  // In miniapp we assume Warpcast is handling connection UX.
  const leftStatus = (() => {
    if (isConnected) return shortAddr(address)
    if (miniApp) return 'Wallet via Warpcast'
    return 'Not connected'
  })()

  const rightError = error?.message ? String(error.message) : ''

  return (
    <div className="w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-white/60">Wallet</div>
          <div className="text-sm font-semibold text-white truncate">{leftStatus}</div>
          {rightError ? <div className="mt-1 text-xs text-red-300 truncate">{rightError}</div> : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showMyWalletButton ? (
            <button type="button" onClick={onMyWallet} className={[pillBase, pillOn].join(' ')}>
              My Wallet
            </button>
          ) : null}

          {/* Miniapp: do NOT show Connect/Disconnect, just Switch Wallet */}
          {miniApp ? (
            <button type="button" onClick={onSwitchWallet} className={[pillBase, pillOff].join(' ')}>
              Switch wallet
            </button>
          ) : !isConnected ? (
            <button
              type="button"
              onClick={onConnect}
              className={[pillBase, pillOn].join(' ')}
              disabled={isPending || !primary}
            >
              {isPending ? 'Connecting…' : 'Connect'}
            </button>
          ) : (
            <button type="button" onClick={onDisconnect} className={[pillBase, pillOff].join(' ')}>
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
