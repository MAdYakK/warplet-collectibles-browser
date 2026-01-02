'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import TokenCard from '../../../../components/TokenCard'
import type { ChainKey, NftItem } from '../../../../lib/types'
import useViewMode from '../../../../lib/useViewMode'

type RouteParams = { chain?: string; contract?: string }

function normalizeChain(chain?: string): ChainKey {
  const c = (chain || '').toLowerCase()
  if (c === 'ethereum' || c === 'eth' || c === 'mainnet') return 'ethereum'
  return 'base'
}

export default function CollectionClient() {
  const params = useParams<RouteParams>()
  const { address, isConnected } = useAccount()

  const chain = useMemo(() => normalizeChain(params?.chain), [params?.chain])

  const contract = useMemo(() => {
    const raw = params?.contract
    return typeof raw === 'string' ? raw.toLowerCase() : ''
  }, [params?.contract])

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

  return (
    <main className="mx-auto max-w-md">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="p-3 flex items-center justify-between gap-3">
          <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-semibold active:scale-[0.99]">
            HOME
          </Link>

          <div className="flex items-center gap-2">
            <div className="rounded-xl border p-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMode('cards')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold active:scale-[0.99] ${
                  mode === 'cards' ? 'bg-neutral-100' : ''
                }`}
                aria-pressed={mode === 'cards'}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setMode('grid')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold active:scale-[0.99] ${
                  mode === 'grid' ? 'bg-neutral-100' : ''
                }`}
                aria-pressed={mode === 'grid'}
              >
                Grid
              </button>
            </div>

            <div className="min-w-0 text-right">
              <div className="text-sm font-semibold truncate">{contract || 'Collection'}</div>
              <div className="text-xs text-neutral-500">{statusText}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 pb-24">
        {mode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {nfts.map((nft) => (
              <TokenCard
                key={`${nft.contractAddress}:${nft.tokenId}`}
                nft={nft}
                variant="grid"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {nfts.map((nft) => (
              <TokenCard
                key={`${nft.contractAddress}:${nft.tokenId}`}
                nft={nft}
                variant="cards"
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
