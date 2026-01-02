import type { ChainKey, CollectionSummary, NftItem } from './types'
import { moralisChain } from './chains'

const MORALIS_BASE = 'https://deep-index.moralis.io/api/v2.2'

function mustEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

export async function fetchCollections(
  address: string,
  chain: ChainKey
): Promise<CollectionSummary[]> {
  const apiKey = mustEnv('MORALIS_API_KEY')

  const url = new URL(`${MORALIS_BASE}/${address}/nft/collections`)
  url.searchParams.set('chain', moralisChain(chain))
  url.searchParams.set('exclude_spam', 'true')
  url.searchParams.set('token_counts', 'true')

  const res = await fetch(url.toString(), {
    headers: { 'X-API-Key': apiKey },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Moralis collections error: ${res.status}`)

  const json = await res.json()
  const items = (json?.result ?? []) as any[]

  return items
    .map((c: any) => ({
      chain,
      contractAddress: (c?.token_address || '').toLowerCase(),
      name: c?.name || 'Untitled Collection',
      symbol: c?.symbol,
      tokenCount: Number(c?.token_count ?? c?.amount ?? c?.count ?? 0),
      image: c?.collection_logo || c?.logo || c?.image || undefined,
    }))
    .filter((x) => x.contractAddress)
}

export async function fetchTokens(
  address: string,
  chain: ChainKey,
  contract: string
): Promise<NftItem[]> {
  const apiKey = mustEnv('MORALIS_API_KEY')

  const url = new URL(`${MORALIS_BASE}/${address}/nft`)
  url.searchParams.set('chain', moralisChain(chain))
  url.searchParams.set('token_addresses', contract)
  url.searchParams.set('exclude_spam', 'true')
  // Ask Moralis to normalize metadata if it can
  url.searchParams.set('normalizeMetadata', 'true')

  const res = await fetch(url.toString(), {
    headers: { 'X-API-Key': apiKey },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Moralis tokens error: ${res.status}`)

  const json = await res.json()
  const items = (json?.result ?? []) as any[]

  // Build items (keep tokenUri internally so we can enrich missing images)
  const baseItems: Array<NftItem & { tokenUri?: string }> = items
    .map((t: any) => {
      const tokenId = String(t?.token_id ?? '')
      const tokenUriRaw = t?.token_uri || t?.tokenUri || undefined
      const tokenUri = tokenUriRaw ? normalizeMediaUrl(tokenUriRaw) : undefined

      const meta = t?.metadata ? safeJson(t.metadata) : null
      const norm = t?.normalized_metadata || null

      // Try multiple places Moralis might provide images
      const imageRaw =
        meta?.image ||
        meta?.image_url ||
        meta?.imageUrl ||
        norm?.image ||
        norm?.image_url ||
        norm?.imageUrl ||
        t?.media?.original_media_url ||
        t?.media?.originalMediaUrl ||
        undefined

      return {
        chain,
        contractAddress: (t?.token_address || contract).toLowerCase(),
        tokenId,
        name: meta?.name || norm?.name || t?.name || undefined,
        image: normalizeMediaUrl(imageRaw),
        tokenStandard: t?.contract_type || undefined,
        tokenUri,
      }
    })
    .filter((x) => x.tokenId)

  // Enrich missing images by fetching JSON from tokenUri (Arweave/IPFS/http)
  const enriched = await enrichMissingImagesFromTokenUri(baseItems)

  // Return as plain NftItem (strip tokenUri)
  return enriched.map(({ tokenUri, ...rest }) => rest)
}

async function enrichMissingImagesFromTokenUri<T extends { image?: string; tokenUri?: string }>(
  items: T[]
): Promise<T[]> {
  const out = [...items]

  // Keep this low to avoid hammering gateways / rate limits
  const CONCURRENCY = 5
  let idx = 0

  async function worker() {
    while (idx < out.length) {
      const i = idx++
      const it = out[i]

      if (it.image) continue
      if (!it.tokenUri) continue

      try {
        const meta = await fetchJson(it.tokenUri)

        // Prefer image; fall back to animation_url if that’s what the collection uses
        const imgRaw =
          meta?.image ||
          meta?.image_url ||
          meta?.imageUrl ||
          meta?.animation_url ||
          meta?.animationUrl ||
          undefined

        if (imgRaw) {
          out[i] = { ...it, image: normalizeMediaUrl(imgRaw) }
        }
      } catch {
        // ignore: keep as no image
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
  return out
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`metadata fetch failed: ${res.status}`)
  return await res.json()
}

function safeJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function normalizeMediaUrl(url?: string) {
  if (!url) return url

  // ipfs://CID/... → https://ipfs.io/ipfs/CID/...
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/')
  }

  // ar://TXID → https://arweave.net/TXID
  if (url.startsWith('ar://')) {
    return url.replace('ar://', 'https://arweave.net/')
  }

  return url
}
