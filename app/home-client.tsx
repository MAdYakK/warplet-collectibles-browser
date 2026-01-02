'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import ConnectBar from '../components/ConnectBar'
import CollectionTile from '../components/CollectionTile'

type CollectionSummary = {
  chain: string
  contractAddress: string
  tokenCount?: number
  name?: string
  image?: string
}

// Major EVM chains (Moralis supports many; we’ll ignore any that error)
const CHAINS: string[] = [
  'ethereum',
  'base',
  'polygon',
  'optimism',
  'arbitrum',
  'avalanche',
  'bsc',
]

const FEATURED_MINIAPP_URL =
  'https://farcaster.xyz/miniapps/2vgEwTqkDV2n/crytpodickpunks-mint'

const BANNER_MESSAGES = [
  'WARPLET COLLECTIBLES • BROWSE YOUR NFTs • SHARE TO FARCASTER',
  'YOUR WALLET, VISUALIZED • MAJOR EVM CHAINS',
  'COLLECT • SEND • SHARE • FLEX',
  'NFTS SHOULD BE FUN TO BROWSE',
  'ONCHAIN CULTURE • IN YOUR POCKET',
  'VIEW YOUR COLLECTIONS THE WARPLET WAY',
  'MINTED ENERGY ONLY • NO COPE',
]

function isFarcasterMiniApp(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean((window as any).farcaster)
}

async function openUrl(url: string) {
  if (typeof window === 'undefined') return
  if (isFarcasterMiniApp()) {
    const { sdk } = await import('@farcaster/miniapp-sdk')
    await sdk.actions.openUrl(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function Marquee({ text }: { text: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#1b0736] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#1b0736] to-transparent" />

      <div className="py-2">
        <div className="whitespace-nowrap will-change-transform animate-[marquee_18s_linear_infinite]">
          <span className="mx-4 text-xs font-semibold tracking-wide text-white/90">{text}</span>
          <span className="mx-4 text-xs font-semibold tracking-wide text-white/90">{text}</span>
          <span className="mx-4 text-xs font-semibold tracking-wide text-white/90">{text}</span>
        </div>
      </div>
    </div>
  )
}

export default function HomeClient() {
  const { isConnected, address } = useAccount()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [collections, setCollections] = useState<CollectionSummary[]>([])

  // Random banner once per page load
  const bannerText = useMemo(() => {
    return BANNER_MESSAGES[Math.floor(Math.random() * BANNER_MESSAGES.length)]
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!isConnected || !address) return

      setLoading(true)
      setErr(null)

      try {
        const results = await Promise.all(
          CHAINS.map(async (chain) => {
            try {
              const res = await fetch(
                `/api/nfts/collections?address=${address}&chain=${chain}`,
                { cache: 'no-store' }
              )
              const json = await res.json()
              if (!res.ok) return []
              const cols = (json.collections ?? []) as CollectionSummary[]
              // Ensure chain is set (some APIs might omit)
              return cols.map((c) => ({ ...c, chain: (c.chain ?? chain) as string }))
            } catch {
              return []
            }
          })
        )

        const merged = results.flat()

        // Sort: most items first
        merged.sort((a, b) => (b.tokenCount ?? 0) - (a.tokenCount ?? 0))

        setCollections(merged)
      } catch (e: any) {
        setErr(e?.message ?? 'Error')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [isConnected, address])

  const emptyState = useMemo(() => {
    if (!isConnected) return 'Connect your wallet to view collectibles.'
    if (loading) return 'Loading collections…'
    if (err) return err
    if (!collections.length) return 'No collections found.'
    return null
  }, [isConnected, loading, err, collections.length])

  return (
    <main
      className="min-h-screen text-white"
      style={{ backgroundColor: '#1b0736' }} // dark purple base
    >
      <div className="mx-auto max-w-md px-3 pb-24">
        {/* Sticky banner always visible */}
        <div className="sticky top-0 z-50 pt-3 pb-2" style={{ backgroundColor: '#1b0736' }}>
          <Marquee text={bannerText} />
        </div>

        {/* Featured area (scrolls away) */}
        <section className="mt-2">
          <div className="rounded-3xl border border-white/10 bg-transparent p-3">
            <ConnectBar />

            {/* Featured miniapp promo */}
            <div className="mt-3">
              <button
  type="button"
  onClick={() => openUrl(FEATURED_MINIAPP_URL)}
  className="
    w-full overflow-hidden rounded-3xl border border-white/10
    bg-transparent
    active:scale-[0.99] transition
    text-left
  "
  style={{ height: '25vh', minHeight: 160 }}
>
  <div
    className="relative h-full w-full"
    style={{
      backgroundImage: "url('/mintbanner.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
  >
    {/* Dark overlay for readability */}
    <div className="absolute inset-0 bg-black/30" />

    {/* Text overlay */}
    <div className="relative h-full w-full p-5 flex flex-col justify-end">
      <div className="text-sm font-semibold text-white/90">
        Featured Miniapp
      </div>
      <div className="mt-1 text-lg font-extrabold leading-tight text-white">
        CryptoDickPunks Mint
      </div>
      <div className="mt-1 text-xs text-white/80">
        Tap to open in Warpcast →
      </div>
    </div>
  </div>
</button>


            </div>
          </div>
        </section>

        {/* Collections grid (always 2 columns) */}
        <section className="mt-4">
          {emptyState ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              {emptyState}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {collections.map((c) => (
                <CollectionTile
                  key={`${c.chain}:${c.contractAddress}`}
                  c={{
                    ...c,
                    name: c.name ?? '',
                    tokenCount: c.tokenCount ?? 0,
                    // chain passed through for routing
                    chain: (c.chain ?? '').toLowerCase(),
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
