'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import type { ChainKey, NftItem } from '../../../../lib/types'
import TokenCard from '../../../../components/TokenCard'

export default function CollectionPage({
  params,
}: {
  params: { chain: ChainKey; contract: string }
}) {
  const { address, isConnected } = useAccount()
  const chain = params.chain
  const contract = params.contract.toLowerCase()

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [nfts, setNfts] = useState<NftItem[]>([])

  useEffect(() => {
    const run = async () => {
      if (!isConnected || !address) return
      setLoading(true)
      setErr(null)
      try {
        const res = await fetch(
          `/api/nfts/tokens?address=${address}&chain=${chain}&contract=${contract}`,
          { cache: 'no-store' }
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to load tokens')
        const items = (json.nfts ?? []) as NftItem[]
        setNfts(items)
      } catch (e: any) {
        setErr(e?.message ?? 'Error')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [isConnected, address, chain, contract])

  const headerText = useMemo(() => {
    if (!isConnected) return 'Connect to view this collection.'
    if (loading) return 'Loading items…'
    if (err) return err
    return `${nfts.length} item${nfts.length === 1 ? '' : 's'}`
  }, [isConnected, loading, err, nfts.length])

  return (
    <main className="mx-auto max-w-md">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="p-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-xl border px-4 py-2 text-sm font-semibold active:scale-[0.99]"
          >
            HOME
          </Link>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{contract}</div>
            <div className="text-xs text-neutral-500">{headerText}</div>
          </div>
        </div>
      </div>

      <div className="p-3 pb-24 space-y-3">
        {nfts.map((nft) => (
          <TokenCard key={`${nft.contractAddress}:${nft.tokenId}`} nft={nft} />
        ))}
      </div>
    </main>
  )
}
