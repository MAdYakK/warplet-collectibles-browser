'use client'

import useSWR, { useSWRConfig } from 'swr'
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

// helper: expected chainId hex for simple checks
function toHexChainId(n: number) {
  return `0x${n.toString(16)}` as const
}

export default function CollectionClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<RouteParams>()

  // wagmi is allowed to exist, but we DO NOT depend on it in miniapp mode
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()

  const { mutate } = useSWRConfig()

  const miniApp = useMemo(() => isProbablyMiniApp(), [])

  const chain = useMemo(() => String(params?.chain ?? '').toLowerCase(), [params?.chain])
  const chainObj = useMemo(() => chainFromRoute(chain), [chain])

  const contract = useMemo(() => String(params?.contract ?? '').toLowerCase(), [params?.contract])

  // Browsing param (read-only mode for sends)
  const browsedAddr = (searchParams?.get('addr') || '').trim().toLowerCase()

  // In miniapp, we’ll derive the wallet address from the Warpcast provider.
  // In browser/dev, fall back to wagmi.
  const [miniappAddress, setMiniappAddress] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!miniApp) return
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        const ethProvider = await sdk.wallet.getEthereumProvider()
        if (!ethProvider) return
        const accounts = (await (ethProvider as any).request?.({ method: 'eth_accounts' })) as string[] | undefined
        const a = String(accounts?.[0] || '').toLowerCase()
        if (!cancelled) setMiniappAddress(a)
      } catch {
        // ignore
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [miniApp])

  const connectedLower = (wagmiAddress || '').toLowerCase()

  const effectiveConnectedAddress = miniApp ? miniappAddress : connectedLower
  const targetAddress = (browsedAddr || effectiveConnectedAddress || '').toLowerCase()

  const disableActions =
    Boolean(browsedAddr) &&
    Boolean(effectiveConnectedAddress) &&
    browsedAddr !== effectiveConnectedAddress

  const { mode, setMode } = useViewMode({
    storageKey: 'warplet:collectionViewMode',
    defaultMode: 'cards',
  })

  // IMPORTANT: Don’t require wagmiConnected in miniapp — it can be false even when Warpcast provider is available.
  const canFetch = Boolean(targetAddress) && Boolean(contract) && (miniApp ? true : wagmiConnected)

  const tokensKey = canFetch ? `warplet:tokens:${targetAddress}:${chain}:${contract}` : null

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
    if (!miniApp && !wagmiConnected) return 'Connect to view'
    if (miniApp && !targetAddress) return 'Open in Warpcast'
    if (loading) return 'Loading…'
    if (err) return err
    return `${nfts.length} item${nfts.length === 1 ? '' : 's'}`
  }, [contract, miniApp, wagmiConnected, targetAddress, loading, err, nfts.length])

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

  // One global modal outside virtualized content
  const [sendOpen, setSendOpen] = useState(false)
  const [sendNft, setSendNft] = useState<NftItem | null>(null)
  const [sendAnchorRect, setSendAnchorRect] = useState<AnchorRect | null>(null)
  const [sendIs1155, setSendIs1155] = useState(false)
  const [sendMaxAmount, setSendMaxAmount] = useState(1)

  const openSend = (args: { nft: NftItem; anchorRect: AnchorRect | null; is1155: boolean; maxAmount: number }) => {
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

    // Optional: ensure chain is what we expect (helps when user is on wrong network)
    try {
      const chainIdHex = (await (ethProvider as any).request?.({ method: 'eth_chainId' })) as string | undefined
      const expected = toHexChainId(chainObj.id)
      if (chainIdHex && chainIdHex.toLowerCase() !== expected.toLowerCase()) {
        throw new Error(`Wrong network. Switch to ${chainObj.name}.`)
      }
    } catch (e) {
      // If provider blocks eth_chainId, continue — write may still work.
      // But if we *did* get a mismatch, we throw above.
      if (e instanceof Error && e.message.includes('Wrong network')) throw e
    }

    const walletClient = createWalletClient({
      chain: chainObj,
      transport: custom(ethProvider as any),
    })

    const addresses = await walletClient.getAddresses().catch(() => [])
    const from = (addresses?.[0] || '') as `0x${string}`
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

          <div className="rounded-2xl ring-1 ring-white/20 bg-white/10 px-3 py-2 text-right shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <div className="text-sm font-semibold truncate text-white">Collection</div>
            <div className="text-xs text-white/80">{statusText}</div>
          </div>
        </div>
      </div>

      <div ref={listRef} className="p-4 pb-24">
        {/* Browser/dev gate */}
        {!miniApp && !wagmiConnected ? (
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

      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title={sendNft ? `Send Token #${sendNft.tokenId}` : 'Send'}
        maxAmount={sendIs1155 ? sendMaxAmount : 1}
        anchorRect={sendAnchorRect}
        onConfirm={async (to, amount) => {
          if (!sendNft) throw new Error('Missing token')

          if (!miniApp) {
            throw new Error('Send is only supported inside Warpcast right now.')
          }

          // If browsing another wallet, block sends
          if (disableActions) {
            throw new Error('Switch back to your connected wallet to send.')
          }

          await sendWithWarpcastProvider({ to, amount, nft: sendNft, is1155: sendIs1155 })

          // optimistic remove/decrement + revalidate
          await optimisticAfterSend(sendNft, amount, sendIs1155)
          if (tokensKey) await mutate(tokensKey)
        }}
      />
    </main>
  )
}
