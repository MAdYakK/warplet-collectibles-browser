'use client'

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useWindowVirtualizer } from '@tanstack/react-virtual'


import TokenCard from '../../../../components/TokenCard'
import type { NftItem } from '../../../../lib/types'
import useViewMode from '../../../../lib/useViewMode'

type RouteParams = { chain?: string; contract?: string }

function shortAddr(a: string) {
  if (!a) return ''
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export default function CollectionClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<RouteParams>()
  const { address: connectedAddress, isConnected } = useAccount()

  const chain = useMemo(() => String(params?.chain ?? '').toLowerCase(), [params?.chain])
  const contract = useMemo(() => String(params?.contract ?? '').toLowerCase(), [params?.contract])

  const browsedAddr = (searchParams?.get('addr') || '').trim().toLowerCase()
  const targetAddress = (browsedAddr || connectedAddress || '').toLowerCase()

  const connectedLower = (connectedAddress || '').toLowerCase()

  const disableActions =
    Boolean(browsedAddr) &&
    Boolean(connectedLower) &&
    browsedAddr !== connectedLower


  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [nfts, setNfts] = useState<NftItem[]>([])

  const { mode, setMode } = useViewMode({
    storageKey: 'warplet:collectionViewMode',
    defaultMode: 'cards',
  })

  useEffect(() => {
    const run = async () => {
      if (!isConnected || !targetAddress) return
      if (!contract) return

      setLoading(true)
      setErr(null)

      try {
        const res = await fetch(
          `/api/nfts/tokens?address=${targetAddress}&chain=${chain}&contract=${contract}`,
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
  }, [isConnected, targetAddress, chain, contract])

  const statusText = useMemo(() => {
    if (!contract) return 'Bad route'
    if (!isConnected) return 'Connect to view'
    if (loading) return 'Loading…'
    if (err) return err
    return `${nfts.length} item${nfts.length === 1 ? '' : 's'}`
  }, [contract, isConnected, loading, err, nfts.length])

  const pillBase =
    'rounded-full px-3 py-2 text-xs font-semibold transition active:scale-[0.98]'

  // ---------------------------
  // Virtualization (window scroll)
  // ---------------------------
  const listRef = useRef<HTMLDivElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    if (!listRef.current) return
    // offsetTop = distance from top of page; used so virtualizer positions correctly
    setScrollMargin(listRef.current.offsetTop)
  }, [mode])

  // For grid: render rows of 2
  const gridRows = useMemo(() => Math.ceil(nfts.length / 2), [nfts.length])

  const cardsVirtualizer = useWindowVirtualizer({
  count: nfts.length,
  estimateSize: () => 560, // guess; measured
  overscan: 8,
  scrollMargin,
})

const gridVirtualizer = useWindowVirtualizer({
  count: gridRows,
  estimateSize: () => 360, // guess; measured
  overscan: 8,
  scrollMargin,
})


  const items = mode === 'grid' ? gridVirtualizer.getVirtualItems() : cardsVirtualizer.getVirtualItems()
  const totalSize = mode === 'grid' ? gridVirtualizer.getTotalSize() : cardsVirtualizer.getTotalSize()

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
              onClick={() => router.push(browsedAddr ? `/?addr=${encodeURIComponent(browsedAddr)}` : '/')}
              className={[pillBase, 'text-white/90 hover:bg-white/5'].join(' ')}
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
            <div className="flex items-center justify-end gap-2">
              {disableActions ? (
                <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/90">
                  Browsing {shortAddr(targetAddress)}
                </div>
              ) : null}

              <div className="text-sm font-semibold truncate text-white">
                {contract || 'Collection'}
              </div>
            </div>

            <div className="text-xs text-white/80">{statusText}</div>
          </div>
        </div>
      </div>

      {/* listRef: used to compute scrollMargin so window-virtualization aligns below header */}
      <div ref={listRef} className="p-3 pb-24">
        {/* Empty/Loading */}
        {!isConnected ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white">
            Connect to view
          </div>
        ) : loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white">
            Loading…
          </div>
        ) : err ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white">
            {err}
          </div>
        ) : nfts.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white">
            No items found.
          </div>
        ) : (
          // Virtualized container
          <div
            style={{
              height: `${totalSize}px`,
              position: 'relative',
            }}
          >
            {mode === 'grid' ? (
              <>
                {items.map((v) => {
                  const rowIndex = v.index
                  const leftIndex = rowIndex * 2
                  const rightIndex = leftIndex + 1
                  const left = nfts[leftIndex]
                  const right = nfts[rightIndex]

                  return (
                    <div
                      key={v.key}
                      data-index={v.index}
                      ref={gridVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${v.start - scrollMargin}px)`,
                      }}
                      className="grid grid-cols-2 gap-4"
                    >
                      {left ? (
                        <TokenCard
                          nft={left}
                          variant="grid"
                          disableActions={disableActions}
                        />
                      ) : (
                        <div />
                      )}

                      {right ? (
                        <TokenCard
                          nft={right}
                          variant="grid"
                          disableActions={disableActions}
                        />
                      ) : (
                        <div />
                      )}
                    </div>
                  )
                })}
              </>
            ) : (
              <>
                {items.map((v) => {
                  const nft = nfts[v.index]
                  return (
                    <div
                      key={v.key}
                      data-index={v.index}
                      ref={cardsVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${v.start - scrollMargin}px)`,
                      }}
                      className="pb-4"
                    >
                      <TokenCard
                        nft={nft}
                        variant="cards"
                        disableActions={disableActions}
                      />
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
