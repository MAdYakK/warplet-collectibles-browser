'use client'

import useSWR, { useSWRConfig } from 'swr'
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { erc721Abi, createWalletClient, custom } from 'viem'
import { mainnet, base, optimism, polygon } from 'viem/chains'

import TokenCard from '../../../../components/TokenCard'
import SendModal from '../../../../components/SendModal'
import type { NftItem } from '../../../../lib/types'
import useViewMode from '../../../../lib/useViewMode'

type RouteParams = { chain?: string; contract?: string }
const fetcher = (url: string) => fetch(url).then((r) => r.json())

const erc1155Abi = [
  {
    type: 'function',
    name: 'safeTransferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'id', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
] as const

type AnchorRect = { top: number; left: number; width: number; height: number }

function isProbablyMiniApp(): boolean {
  if (typeof window === 'undefined') return false
  const inIframe = window.self !== window.top
  const hasFarcasterGlobal = Boolean((window as any).farcaster)
  return hasFarcasterGlobal || inIframe
}

function chainFromRoute(route: string) {
  const c = String(route || '').toLowerCase()
  if (c === 'base') return base
  if (c === 'optimism') return optimism
  if (c === 'polygon' || c === 'matic') return polygon
  return mainnet
}

export default function CollectionClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<RouteParams>()
  const { address: connectedAddress, isConnected } = useAccount()
  const { mutate } = useSWRConfig()

  const miniApp = useMemo(() => isProbablyMiniApp(), [])
  const chain = useMemo(() => String(params?.chain ?? '').toLowerCase(), [params?.chain])
  const chainObj = useMemo(() => chainFromRoute(chain), [chain])
  const contract = useMemo(() => String(params?.contract ?? '').toLowerCase(), [params?.contract])

  const browsedAddr = (searchParams?.get('addr') || '').trim().toLowerCase()
  const connectedLower = (connectedAddress || '').toLowerCase()
  const targetAddress = (browsedAddr || connectedLower || '').toLowerCase()

  const disableActions = Boolean(browsedAddr) && Boolean(connectedLower) && browsedAddr !== connectedLower

  const { mode, setMode } = useViewMode({
    storageKey: 'warplet:collectionViewMode',
    defaultMode: 'cards',
  })

  const tokensKey =
    isConnected && targetAddress && contract ? `warplet:tokens:${targetAddress}:${chain}:${contract}` : null

  const { data: nftsData, isLoading, error } = useSWR<NftItem[]>(
    tokensKey,
    async () => {
      const json = await fetcher(`/api/nfts/tokens?address=${targetAddress}&chain=${chain}&contract=${contract}`)
      return (json.nfts ?? []) as NftItem[]
    },
    { dedupingInterval: 60_000, revalidateOnFocus: false, keepPreviousData: true }
  )

  const nfts = nftsData ?? []
  const loading = isLoading
  const err = error ? 'Failed to load tokens' : null

  const statusText = useMemo(() => {
    if (!contract) return 'Bad route'
    if (!isConnected) return 'Connect to view'
    if (loading) return 'Loading…'
    if (err) return err
    return `${nfts.length} item${nfts.length === 1 ? '' : 's'}`
  }, [contract, isConnected, loading, err, nfts.length])

  const pillBase = 'rounded-full px-3 py-2 text-xs font-semibold transition active:scale-[0.98]'

  // Virtualization
  const listRef = useRef<HTMLDivElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    if (!listRef.current) return
    setScrollMargin(listRef.current.offsetTop)
  }, [mode])

  const gridRows = useMemo(() => Math.ceil(nfts.length / 2), [nfts.length])

  const cardsVirtualizer = useWindowVirtualizer({
    count: nfts.length,
    estimateSize: () => 620,
    overscan: 8,
    scrollMargin,
  })

  const gridVirtualizer = useWindowVirtualizer({
    count: gridRows,
    estimateSize: () => 460,
    overscan: 8,
    scrollMargin,
  })

  const items = mode === 'grid' ? gridVirtualizer.getVirtualItems() : cardsVirtualizer.getVirtualItems()
  const totalSize = mode === 'grid' ? gridVirtualizer.getTotalSize() : cardsVirtualizer.getTotalSize()

  // Modal state
  const [sendOpen, setSendOpen] = useState(false)
  const [sendNft, setSendNft] = useState<NftItem | null>(null)
  const [sendAnchorRect, setSendAnchorRect] = useState<AnchorRect | null>(null)
  const [sendIs1155, setSendIs1155] = useState(false)
  const [sendMaxAmount, setSendMaxAmount] = useState(1)

  // ✅ BEACON: prove button click reaches CollectionClient
  const [sendClicks, setSendClicks] = useState(0)

  const openSend = (args: { nft: NftItem; anchorRect: AnchorRect | null; is1155: boolean; maxAmount: number }) => {
    setSendClicks((n) => n + 1)
    setSendNft(args.nft)
    setSendAnchorRect(args.anchorRect)
    setSendIs1155(args.is1155)
    setSendMaxAmount(Math.max(1, Math.floor(args.maxAmount || 1)))
    setSendOpen(true)
  }

  const optimisticAfterSend = async (sent: NftItem, amountSent: number, is1155: boolean) => {
    if (!tokensKey) return

    await mutate(
      tokensKey,
      (current?: NftItem[]) => {
        if (!current) return current

        const match = (x: NftItem) =>
          x.contractAddress.toLowerCase() === sent.contractAddress.toLowerCase() &&
          String(x.tokenId) === String(sent.tokenId)

        if (!is1155) return current.filter((x) => !match(x))

        return current
          .map((x) => {
            if (!match(x)) return x
            const raw = (x as any).amount ?? (x as any).balance ?? 1
            const cur = Number(raw) || 1
            const next = cur - amountSent
            if (next <= 0) return null as any
            const updated: any = { ...x }
            if ((x as any).amount != null) updated.amount = next
            if ((x as any).balance != null) updated.balance = next
            return updated as NftItem
          })
          .filter(Boolean) as NftItem[]
      },
      { revalidate: true }
    )
  }

  // ✅ Miniapp send: Warpcast provider + viem walletClient (NO wagmi)
  const sendWithWarpcastProvider = async ({
    to,
    amount,
    nft,
    is1155,
  }: {
    to: `0x${string}`
    amount: number
    nft: NftItem
    is1155: boolean
  }) => {
    const { sdk } = await import('@farcaster/miniapp-sdk')
    const ethProvider = await sdk.wallet.getEthereumProvider()
    if (!ethProvider) throw new Error('No Warpcast Ethereum provider available')

    const walletClient = createWalletClient({
      chain: chainObj,
      transport: custom(ethProvider as any),
    })

    const [from] = await walletClient.getAddresses()
    if (!from) throw new Error('Wallet not connected')

    if (is1155) {
      await walletClient.writeContract({
        address: nft.contractAddress as `0x${string}`,
        abi: erc1155Abi,
        functionName: 'safeTransferFrom',
        args: [from, to, BigInt(nft.tokenId), BigInt(amount), '0x'],
        account: from,
      })
    } else {
      await walletClient.writeContract({
        address: nft.contractAddress as `0x${string}`,
        abi: erc721Abi,
        functionName: 'safeTransferFrom',
        args: [from, to, BigInt(nft.tokenId)],
        account: from,
      })
    }
  }

  return (
    <main className="mx-auto max-w-md min-h-screen text-white" style={{ backgroundColor: '#1b0736' }}>
      <div
        className="sticky top-0 z-40 backdrop-blur border-b border-white/10"
        style={{ backgroundColor: 'rgba(27, 7, 54, 0.85)' }}
      >
        <div className="p-3 flex items-center justify-between gap-3">
          <div className="rounded-full ring-1 ring-white/20 bg-white/10 p-1 flex items-center gap-1 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
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
              className={[pillBase, mode === 'cards' ? 'bg-white text-[#1b0736]' : 'text-white/90 hover:bg-white/5'].join(
                ' '
              )}
              aria-pressed={mode === 'cards'}
            >
              Cards
            </button>

            <button
              type="button"
              onClick={() => setMode('grid')}
              className={[pillBase, mode === 'grid' ? 'bg-white text-[#1b0736]' : 'text-white/90 hover:bg-white/5'].join(
                ' '
              )}
              aria-pressed={mode === 'grid'}
            >
              Grid
            </button>
          </div>

          <div className="rounded-2xl ring-1 ring-white/20 bg-white/10 px-3 py-2 text-right shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <div className="text-sm font-semibold truncate text-white">Collection</div>
            <div className="text-xs text-white/80">{statusText}</div>
          </div>
        </div>
      </div>

      <div ref={listRef} className="p-4 pb-24">
        {!isConnected ? (
          <div className="rounded-3xl ring-1 ring-white/20 bg-white/10 p-4 text-sm text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            Connect to view
          </div>
        ) : loading ? (
          <div className="rounded-3xl ring-1 ring-white/20 bg-white/10 p-4 text-sm text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            Loading…
          </div>
        ) : err ? (
          <div className="rounded-3xl ring-1 ring-white/20 bg-white/10 p-4 text-sm text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            {err}
          </div>
        ) : nfts.length === 0 ? (
          <div className="rounded-3xl ring-1 ring-white/20 bg-white/10 p-4 text-sm text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            No items found.
          </div>
        ) : (
          <div style={{ height: `${totalSize}px`, position: 'relative' }}>
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
                      className="grid grid-cols-2 gap-3"
                    >
                      {left ? (
                        <TokenCard nft={left} variant="grid" disableActions={disableActions} onOpenSend={openSend} />
                      ) : (
                        <div />
                      )}
                      {right ? (
                        <TokenCard nft={right} variant="grid" disableActions={disableActions} onOpenSend={openSend} />
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
                      className="pb-5"
                    >
                      <TokenCard nft={nft} variant="cards" disableActions={disableActions} onOpenSend={openSend} />
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ✅ BEACON: if Send is wired, these numbers change */}
      <div className="fixed bottom-2 left-2 z-[2147483647] text-[10px] text-white/90 bg-black/50 px-2 py-1 rounded-full pointer-events-none">
        sendClicks: {sendClicks} | sendOpen: {String(sendOpen)} | sendNft: {sendNft ? 'yes' : 'no'}
      </div>

      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title={sendNft ? `Send Token #${sendNft.tokenId}` : 'Send'}
        maxAmount={sendIs1155 ? sendMaxAmount : 1}
        anchorRect={sendAnchorRect}
        onConfirm={async (to, amount) => {
          if (!sendNft) throw new Error('Missing token')

          if (!miniApp) throw new Error('Send is only supported inside Warpcast right now.')

          await sendWithWarpcastProvider({ to, amount, nft: sendNft, is1155: sendIs1155 })
          await optimisticAfterSend(sendNft, amount, sendIs1155)
        }}
      />
    </main>
  )
}
