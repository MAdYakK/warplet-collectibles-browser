'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import ConnectBar from '../components/ConnectBar'
import CollectionTile from '../components/CollectionTile'

// Local type definitions to avoid depending on '@/lib/types'
type ChainKey = 'base' | 'ethereum'

type CollectionSummary = {
  chain: string
  contractAddress: string
  tokenCount?: number
  name?: string
  image?: string
}

export default function HomePage() {
  const { isConnected, address } = useAccount()
  const [chain, setChain] = useState<ChainKey>('base')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [collections, setCollections] = useState<CollectionSummary[]>([])

  useEffect(() => {
    const run = async () => {
      if (!isConnected || !address) return
      setLoading(true)
      setErr(null)
      try {
        const res = await fetch(`/api/nfts/collections?address=${address}&chain=${chain}`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to load collections')
        const cols = (json.collections ?? []) as CollectionSummary[]

        // Sort: most items first
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
    <main className="mx-auto max-w-md p-3 pb-24">
      <ConnectBar />

      <div className="mt-3 flex items-center gap-2">
        <button
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${chain === 'base' ? 'bg-neutral-100' : ''}`}
          onClick={() => setChain('base')}
        >
          Base
        </button>
        <button
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${chain === 'ethereum' ? 'bg-neutral-100' : ''}`}
          onClick={() => setChain('ethereum')}
        >
          Ethereum
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {emptyState ? (
          <div className="rounded-2xl border p-4 text-sm text-neutral-600">{emptyState}</div>
        ) : (
          collections.map((c) => <CollectionTile key={`${c.chain}:${c.contractAddress}`} c={{ ...c, name: c.name ?? '', tokenCount: c.tokenCount ?? 0 }} />)
        )}
      </div>
    </main>
  )
}
