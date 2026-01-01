'use client'

import React from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { base, mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

function isProbablyMiniApp() {
  if (typeof window === 'undefined') return false

  // Real Warpcast usually sets this
  const hasFarcasterGlobal = Boolean((window as any).farcaster)

  // Preview tools often run your app in an iframe
  const inIframe = (() => {
    try {
      return window.self !== window.top
    } catch {
      return true
    }
  })()

  return hasFarcasterGlobal || inIframe
}

function hasInjected() {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined'
}

const config = createConfig({
  chains: [base, mainnet],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
  connectors: (() => {
    // ✅ Prefer Farcaster miniapp connector inside Warpcast OR preview iframe
    if (isProbablyMiniApp()) return [miniAppConnector()]

    // ✅ Browser fallback
    if (hasInjected()) return [injected()]

    return []
  })(),
})

const qc = new QueryClient()

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
