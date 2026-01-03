'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import TokenCard from '../../../../components/TokenCard'
import type { NftItem } from '../../../../lib/types'
import useViewMode from '../../../../lib/useViewMode'
import { useRouter } from 'next/navigation'


type RouteParams = { chain?: string; contract?: string }

export default function CollectionClient() {
  const params = useParams<RouteParams>()
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const chain = useMemo(() => String(params?.chain ?? '').toLowerCase(), [params?.chain])
  const contract = useMemo(() => String(params?.contract ?? '').toLowerCase(), [params?.contract])

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [nfts, setNfts] = useState<NftItem[]>([])

  const { mode, setMode } = useViewMode({
    storageKey: 'warplet:collectionViewMode',
    defaultMode: 'cards',
  })

  useEffect(() => {
    const run = async () => {
      if (!isConnected || !address) return
      if (!contract) return

      setLoading(true)
      setErr(null)

      try {
        const res = await fetch(
          `/api/nfts/tokens?address=${address}&chain=${chain}&contract=${contract}`,
          { cache: 'no-store' }
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to load tokens')
        setNfts((json.nfts ?? []) as NftItem[])
      } catch (e: any) {
        setErr(e?.message ?? 'Error')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [isConnected, address, chain, contract])

  const statusText = useMemo(() => {
    if (!contract) return 'Bad route'
    if (!isConnected) return 'Connect to view'
    if (loading) return 'Loading…'
    if (err) return err
    return `${nfts.length} item${nfts.length === 1 ? '' : 's'}`
  }, [contract, isConnected, loading, err, nfts.length])

  const pillBase =
    'rounded-full px-3 py-2 text-xs font-semibold transition active:scale-[0.98]'

  return (
    <main className="mx-auto max-w-md min-h-screen text-white" style={{ backgroundColor: '#1b0736' }}>
      <div
        className="sticky top-0 z-40 backdrop-blur border-b border-white/10"
        style={{ backgroundColor: 'rgba(27, 7, 54, 0.85)' }}
      >
        <div className="p-3 flex items-center justify-between gap-3">
          <div className="rounded-full border border-white/10 bg-white/5 p-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => router.push('/')}
              className={[
                pillBase,
                'text-white/90 hover:bg-white/5',
              ].join(' ')}
            >
              Back
            </button>


            <button
              type="button"
              onClick={() => setMode('cards')}
              className={[
                pillBase,
                mode === 'cards' ? 'bg-white text-[#1b0736]' : 'text-white/90 hover:bg-white/5',
              ].join(' ')}
              aria-pressed={mode === 'cards'}
            >
              Cards
            </button>

            <button
              type="button"
              onClick={() => setMode('grid')}
              className={[
                pillBase,
                mode === 'grid' ? 'bg-white text-[#1b0736]' : 'text-white/90 hover:bg-white/5',
              ].join(' ')}
              aria-pressed={mode === 'grid'}
            >
              Grid
            </button>
          </div>

          <div className="min-w-0 text-right">
            <div className="text-sm font-semibold truncate text-white">{contract || 'Collection'}</div>
            <div className="text-xs text-white/70">{statusText}</div>
          </div>
        </div>
      </div>

      <div className="p-3 pb-24">
        {mode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4">
            {nfts.map((nft) => (
              <TokenCard key={`${nft.contractAddress}:${nft.tokenId}`} nft={nft} variant="grid" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {nfts.map((nft) => (
              <TokenCard key={`${nft.contractAddress}:${nft.tokenId}`} nft={nft} variant="cards" />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
