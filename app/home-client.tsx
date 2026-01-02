'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import ConnectBar from '../components/ConnectBar'
import CollectionTile from '../components/CollectionTile'

type ChainKey = 'base' | 'ethereum'

type CollectionSummary = {
  chain: string
  contractAddress: string
  tokenCount?: number
  name?: string
  image?: string
}

const BANNER_MESSAGES = [
  'WARPLET COLLECTIBLES • BROWSE YOUR NFTs • SHARE TO FARCASTER',
  'YOUR WALLET, VISUALIZED • BASE + ETHEREUM',
  'COLLECT • SEND • SHARE • FLEX',
  'NFTS SHOULD BE FUN TO BROWSE',
  'ONCHAIN CULTURE • IN YOUR POCKET',
  'VIEW YOUR COLLECTIONS THE WARPLET WAY',
  'MINTED ENERGY ONLY • NO COPE',
]

function Marquee({ text }: { text: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white/70 backdrop-blur">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/90 to-transparent" />

      <div className="py-2">
        <div className="whitespace-nowrap will-change-transform animate-[marquee_18s_linear_infinite]">
          <span className="mx-4 text-xs font-semibold tracking-wide text-neutral-800">{text}</span>
          <span className="mx-4 text-xs font-semibold tracking-wide text-neutral-800">{text}</span>
          <span className="mx-4 text-xs font-semibold tracking-wide text-neutral-800">{text}</span>
        </div>
      </div>
    </div>
  )
}

export default function HomeClient() {
  const { isConnected, address } = useAccount()
  const [chain, setChain] = useState<ChainKey>('base')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [collections, setCollections] = useState<CollectionSummary[]>([])

  // ✅ Random banner once per page load
  const bannerText = useMemo(() => {
    return BANNER_MESSAGES[Math.floor(Math.random() * BANNER_MESSAGES.length)]
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!isConnected || !address) return
      setLoading(true)
      setErr(null)

      try {
        const res = await fetch(`/api/nfts/collections?address=${address}&chain=${chain}`, {
          cache: 'no-store',
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to load collections')

        const cols = (json.collections ?? []) as CollectionSummary[]
        cols.sort((a, b) => (b.tokenCount ?? 0) - (a.tokenCount ?? 0))
        setCollections(cols)
      } catch (e: any) {
        setErr(e?.message ?? 'Error')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [isConnected, address, chain])

  const emptyState = useMemo(() => {
    if (!isConnected) return 'Connect your wallet to view collectibles.'
    if (loading) return 'Loading collections…'
    if (err) return err
    if (!collections.length) return 'No collections found.'
    return null
  }, [isConnected, loading, err, collections.length])

  return (
    <main
      className="min-h-screen bg-neutral-50 text-neutral-900"
      // Later you can switch to an image:
      // style={{ backgroundImage: 'url(/bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="mx-auto max-w-md px-3 pb-24">
        {/* Sticky banner always visible */}
        <div className="sticky top-0 z-50 pt-3 pb-2 bg-neutral-50">
          <Marquee text={bannerText} />
        </div>

        {/* Featured area (scrolls away) */}
        <section className="mt-2">
          <div className="rounded-3xl border bg-white/70 backdrop-blur p-3">
            <ConnectBar />

            <div className="mt-3 flex items-center gap-2">
              <button
                className={[
                  'rounded-full px-4 py-2 text-xs font-semibold border transition',
                  chain === 'base'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white/60 text-neutral-900 border-neutral-200',
                ].join(' ')}
                onClick={() => setChain('base')}
              >
                Base
              </button>

              <button
                className={[
                  'rounded-full px-4 py-2 text-xs font-semibold border transition',
                  chain === 'ethereum'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white/60 text-neutral-900 border-neutral-200',
                ].join(' ')}
                onClick={() => setChain('ethereum')}
              >
                Ethereum
              </button>

              <div className="ml-auto text-xs text-neutral-500">
                {isConnected ? 'Connected' : 'Not connected'}
              </div>
            </div>

            <div className="mt-3">
              <div
                className="rounded-3xl border bg-gradient-to-b from-white/60 to-white/20 p-4"
                style={{ height: '25vh', minHeight: 140 }}
              >
                <div className="text-sm font-semibold">Featured</div>
                <div className="mt-1 text-xs text-neutral-600">
                  Later we can turn this into curated collections, a carousel, or a “continue browsing” row.
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border bg-white/50 p-3">
                    <div className="text-xs font-semibold">Spotlight</div>
                    <div className="mt-1 text-[11px] text-neutral-600">Drop or collection highlight</div>
                  </div>
                  <div className="rounded-2xl border bg-white/50 p-3">
                    <div className="text-xs font-semibold">What’s new</div>
                    <div className="mt-1 text-[11px] text-neutral-600">Updates / announcements</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Collections grid (always 2 columns) */}
        <section className="mt-4">
          {emptyState ? (
            <div className="rounded-3xl border bg-white/70 backdrop-blur p-4 text-sm text-neutral-700">
              {emptyState}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {collections.map((c) => (
                <CollectionTile
                  key={`${c.chain}:${c.contractAddress}`}
                  c={{ ...c, name: c.name ?? '', tokenCount: c.tokenCount ?? 0 }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
