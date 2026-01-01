'use client'

import React from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { base, mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

function isMiniAppRuntime() {
  return typeof window !== 'undefined' && Boolean((window as any).farcaster)
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
    if (isMiniAppRuntime()) return [miniAppConnector()]
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
