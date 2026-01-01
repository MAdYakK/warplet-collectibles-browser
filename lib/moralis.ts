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

  // ✅ Correct endpoint:
  // GET https://deep-index.moralis.io/api/v2.2/:address/nft/collections :contentReference[oaicite:2]{index=2}
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

  // ✅ Correct endpoint:
  // GET https://deep-index.moralis.io/api/v2.2/:address/nft :contentReference[oaicite:3]{index=3}
  const url = new URL(`${MORALIS_BASE}/${address}/nft`)
  url.searchParams.set('chain', moralisChain(chain))
  url.searchParams.set('token_addresses', contract)
  url.searchParams.set('exclude_spam', 'true')

  const res = await fetch(url.toString(), {
    headers: { 'X-API-Key': apiKey },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Moralis tokens error: ${res.status}`)

  const json = await res.json()
  const items = (json?.result ?? []) as any[]

  return items
    .map((t: any) => {
      const tokenId = String(t?.token_id ?? '')
      const meta = t?.metadata ? safeJson(t.metadata) : null

      const image =
        meta?.image ||
        meta?.image_url ||
        meta?.imageUrl ||
        t?.media?.original_media_url ||
        t?.media?.originalMediaUrl ||
        undefined

      return {
        chain,
        contractAddress: (t?.token_address || contract).toLowerCase(),
        tokenId,
        name: meta?.name || t?.name || undefined,
        image: normalizeIpfs(image),
        tokenStandard: t?.contract_type || undefined, // ERC721 / ERC1155 typically
      } as NftItem
    })
    .filter((x) => x.tokenId)
}

function safeJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function normalizeIpfs(url?: string) {
  if (!url) return url
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/')
  }
  return url
}
