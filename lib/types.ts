export type ChainKey = 'base' | 'ethereum'

export type CollectionSummary = {
  chain: ChainKey
  contractAddress: string
  name: string
  symbol?: string
  tokenCount: number
  image?: string
}

export type NftItem = {
  chain: ChainKey
  contractAddress: string
  tokenId: string
  name?: string
  image?: string
  tokenStandard?: 'ERC721' | 'ERC1155' | string
}
