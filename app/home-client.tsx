'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter, useSearchParams } from 'next/navigation'
import ConnectBar from '../components/ConnectBar'
import CollectionTile from '../components/CollectionTile'

type CollectionSummary = {
  chain: string
  contractAddress: string
  tokenCount?: number
  name?: string
  image?: string
}

const CHAINS: string[] = ['ethereum', 'base', 'polygon', 'optimism', 'arbitrum', 'avalanche', 'bsc']

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

function dedupeCollections(list: CollectionSummary[]) {
  const map = new Map<string, CollectionSummary>()

  for (const c of list) {
    const chain = String(c.chain || '').toLowerCase()
    const contract = String(c.contractAddress || '').toLowerCase()
    if (!chain || !contract) continue
    const key = `${chain}:${contract}`

    const prev = map.get(key)
    if (!prev) {
      map.set(key, { ...c, chain, contractAddress: contract })
      continue
    }

    map.set(key, {
      ...prev,
      ...c,
      chain,
      contractAddress: contract,
      name: c.name?.trim() ? c.name : prev.name,
      image: c.image ? c.image : prev.image,
      tokenCount: Math.max(prev.tokenCount ?? 0, c.tokenCount ?? 0),
    })
  }

  return Array.from(map.values())
}

export default function HomeClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isConnected, address: connectedAddress } = useAccount()

  // Search input only (NOT the source of truth for browsing)
  const [browseInput, setBrowseInput] = useState('')
  const [browseStatus, setBrowseStatus] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [collections, setCollections] = useState<CollectionSummary[]>([])

  const bannerText = useMemo(() => {
    return BANNER_MESSAGES[Math.floor(Math.random() * BANNER_MESSAGES.length)]
  }, [])

  // ✅ Single source of truth for browsing:
  const addrParam = useMemo(() => {
    const q = (searchParams?.get('addr') || '').trim().toLowerCase()
    return q
  }, [searchParams])

  const targetAddress = (addrParam || connectedAddress || '').toLowerCase()
  const connectedLower = (connectedAddress || '').toLowerCase()

  const isBrowsingOther =
    Boolean(addrParam) &&
    Boolean(connectedLower) &&
    addrParam !== connectedLower


  // Prevent redundant reloads (StrictMode/dev + param changes)
  const lastQueryKeyRef = useRef<string>('')

  // Restore scroll per wallet AFTER targetAddress changes
  useEffect(() => {
    try {
      const key = `warplet:homeScroll:${targetAddress || 'connected'}`
      const saved = sessionStorage.getItem(key)
      if (saved) {
        const y = Number(saved)
        if (!Number.isNaN(y)) {
          sessionStorage.removeItem(key)
          window.scrollTo(0, y)
        }
      }
    } catch {}
  }, [targetAddress])

  useEffect(() => {
    const run = async () => {
      if (!isConnected || !targetAddress) return

      const qKey = `${targetAddress}`
      if (lastQueryKeyRef.current === qKey) return
      lastQueryKeyRef.current = qKey

      setLoading(true)
      setErr(null)

      try {
        const results = await Promise.all(
          CHAINS.map(async (chain) => {
            try {
              const res = await fetch(
                `/api/nfts/collections?address=${targetAddress}&chain=${chain}`,
                { cache: 'no-store' }
              )
              const json = await res.json()
              if (!res.ok) return []
              const cols = (json.collections ?? []) as CollectionSummary[]
              return cols.map((c) => ({
                ...c,
                chain: String(c.chain ?? chain).toLowerCase(),
                contractAddress: String(c.contractAddress ?? '').toLowerCase(),
              }))
            } catch {
              return []
            }
          })
        )

        const merged = dedupeCollections(results.flat())
        merged.sort((a, b) => (b.tokenCount ?? 0) - (a.tokenCount ?? 0))
        setCollections(merged)
      } catch (e: any) {
        setErr(e?.message ?? 'Error')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [isConnected, targetAddress])

  const emptyState = useMemo(() => {
    if (!isConnected) return 'Connect your wallet to view collectibles.'
    if (loading) return 'Loading collections…'
    if (err) return err
    if (!collections.length) return 'No collections found.'
    return null
  }, [isConnected, loading, err, collections.length])

  const onSearch = async () => {
    const q = browseInput.trim()
    if (!q) return

    setBrowseStatus('')
    try {
      const res = await fetch(`/api/resolve?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json?.address) {
        setBrowseStatus('Not found')
        return
      }
      const resolved = String(json.address).toLowerCase()

      // allow refresh
      lastQueryKeyRef.current = ''
      setBrowseStatus('')
      setBrowseInput('')

      router.push(`/?addr=${encodeURIComponent(resolved)}`)
    } catch {
      setBrowseStatus('Not found')
    }
  }

  const onMyWallet = () => {
    lastQueryKeyRef.current = ''
    setBrowseStatus('')
    setBrowseInput('')
    router.push('/')
  }

  return (
    <main className="min-h-screen text-white" style={{ backgroundColor: '#1b0736' }}>
      <div className="mx-auto max-w-md px-3 pb-24">
        <div className="sticky top-0 z-50 pt-3 pb-2" style={{ backgroundColor: '#1b0736' }}>
          <Marquee text={bannerText} />
        </div>

        <section className="mt-2">
          <div className="rounded-3xl border border-white/10 bg-transparent p-3">
            <ConnectBar
              showMyWalletButton={isBrowsingOther}
              onMyWallet={onMyWallet}
            />

            {/* Search other wallets */}
            <div className="mt-3">
              <div
                className="
                  rounded-3xl border border-white/10 bg-white/5 p-2
                  focus-within:ring-2 focus-within:ring-white/30
                  transition
                "
              >
                {/* Animated focus ring: subtle pulse while focused */}
                <div className="focus-within:animate-[pulse_1.4s_ease-in-out_infinite]">
                  <div className="flex items-center gap-2">
                    <input
                      value={browseInput}
                      onChange={(e) => setBrowseInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSearch()
                      }}
                      placeholder="Search: 0x… / ENS / farcaster username"
                      className="
                        flex-1 bg-transparent
                        px-3 py-2 text-sm
                        !text-white
                        placeholder:text-white/50
                        outline-none
                      "
                      style={{ color: '#ffffff', caretColor: '#ffffff' }}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={onSearch}
                      className="
                        rounded-full px-4 py-2 text-xs font-semibold
                        bg-white text-[#1b0736]
                        active:scale-[0.98] transition
                      "
                    >
                      Search
                    </button>
                  </div>

                  {browseStatus ? (
                    <div className="px-3 pt-2 text-xs text-white">{browseStatus}</div>
                  ) : addrParam ? (
                    <div className="px-3 pt-2 text-xs text-white">
                      Browsing: {addrParam}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Featured miniapp promo */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => openUrl(FEATURED_MINIAPP_URL)}
                className="
                  w-full overflow-hidden rounded-3xl border border-white/10
                  bg-transparent
                  active:scale-[0.99] transition
                "
                style={{ height: '25vh', minHeight: 160 }}
              >
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage: "url('/mintbanner.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              </button>

              {/* FEATURED TEXT PLACEHOLDER:
                  Add a text overlay here later if you want (title/subtitle/call-to-action). */}

              {/* FEATURED TEXT COLOR:
                  When you add text later, change its color here (e.g. text-white / text-black / custom). */}
            </div>
          </div>
        </section>

        <section className="mt-4">
          {emptyState ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white">
              {emptyState}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {collections.map((c) => (
                <CollectionTile
                  key={`${String(c.chain).toLowerCase()}:${String(c.contractAddress).toLowerCase()}`}
                  browseAddr={targetAddress}
                  c={{
                    ...c,
                    name: c.name ?? '',
                    tokenCount: c.tokenCount ?? 0,
                    chain: String(c.chain).toLowerCase(),
                    contractAddress: String(c.contractAddress).toLowerCase(),
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
