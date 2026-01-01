import type { ChainKey } from './types'

export function normalizeChain(chain: string | null | undefined): ChainKey {
  if (!chain) return 'base'
  const c = chain.toLowerCase()
  if (c === 'eth' || c === 'ethereum' || c === 'mainnet') return 'ethereum'
  return 'base'
}

export function moralisChain(chain: ChainKey): 'base' | 'eth' {
  return chain === 'ethereum' ? 'eth' : 'base'
}

export function openseaChainSegment(chain: ChainKey): 'base' | 'ethereum' {
  return chain === 'ethereum' ? 'ethereum' : 'base'
}
