import type { ChainKey } from './types'
import { openseaChainSegment } from './chains'

export function openSeaAssetUrl(chain: ChainKey, contract: string, tokenId: string) {
  return `https://opensea.io/assets/${openseaChainSegment(chain)}/${contract}/${tokenId}`
}
