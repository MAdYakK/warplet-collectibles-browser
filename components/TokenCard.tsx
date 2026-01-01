'use client'

import React, { useMemo, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { erc721Abi } from 'viem'
import type { NftItem } from '../lib/types'
import SendModal from './SendModal'

/**
 * Detect if we are running inside the Farcaster/Warpcast miniapp runtime.
 * Warpcast injects a global `window.farcaster` object.
 */
function isFarcasterMiniApp(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean((window as any).farcaster)
}

function getMiniAppUrl() {
  // Prefer explicit env var for production
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl

  // Fallback for dev / preview
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

/**
 * Build an OpenSea asset URL for a given chain, contract and tokenId.
 * (You can expand this mapping as needed.)
 */
const openSeaAssetUrl = (chain: string, contractAddress: string, tokenId: string) => {
  const c = (chain || '').toLowerCase()

  if (c === 'polygon' || c === 'matic') {
    return `https://opensea.io/assets/matic/${contractAddress}/${tokenId}`
  }
  if (c === 'optimism') {
    return `https://opensea.io/assets/optimism/${contractAddress}/${tokenId}`
  }
  if (c === 'base') {
    return `https://opensea.io/assets/base/${contractAddress}/${tokenId}`
  }

  // Default to Ethereum/mainnet path
  return `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`
}

const SHARE_TEXT =
  'Shared from Warplet Collectibles Browser by @madyak! It is easy to view your NFTs now, check it out!'

export default function TokenCard({ nft }: { nft: NftItem }) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const [sendOpen, setSendOpen] = useState(false)

  const osUrl = useMemo(
    () => openSeaAssetUrl(String(nft.chain), nft.contractAddress, nft.tokenId),
    [nft.chain, nft.contractAddress, nft.tokenId]
  )

  const img = nft.image

  // Open URL: use miniapp API inside Warpcast; otherwise, open a normal browser tab
  const openUrl = async (url: string) => {
    if (isFarcasterMiniApp()) {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      await sdk.actions.openUrl(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Share: use composeCast inside Warpcast; otherwise, show a helpful fallback
  const share = async () => {
  const appUrl = getMiniAppUrl()

  if (isFarcasterMiniApp()) {
    const { sdk } = await import('@farcaster/miniapp-sdk')

    // Build strict tuple type: [] | [string] | [string, string]
    const embeds: [] | [string] | [string, string] =
      img && appUrl ? [img, appUrl] :
      img ? [img] :
      appUrl ? [appUrl] :
      []

    await sdk.actions.composeCast({
      text: SHARE_TEXT,
      embeds,
    })
  } else {
    // Browser fallback: open a cast intent URL (optional)
    // Or just alert. We'll do a helpful fallback here:
    const msg = `${SHARE_TEXT}\n\n${appUrl || ''}`.trim()
    alert(`Open in Warpcast to share.\n\nCopy text:\n${msg}`)
  }
}


  return (
    <div className="rounded-3xl border overflow-hidden bg-white">
      <button className="block w-full" onClick={() => openUrl(osUrl)}>
        <div className="px-2 pt-2">
          <div className="rounded-2xl border overflow-hidden bg-neutral-50">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={nft.name ?? `#${nft.tokenId}`} className="w-full h-auto block" />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-sm text-neutral-400">
                No image
              </div>
            )}
          </div>
        </div>
      </button>

      <div className="px-4 py-3">
        <div className="text-sm font-semibold truncate">{nft.name ?? `Token #${nft.tokenId}`}</div>
        <div className="text-xs text-neutral-500 truncate">
          {nft.contractAddress} • {nft.tokenStandard ?? 'Unknown'}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="rounded-2xl border px-4 py-3 text-sm font-semibold"
            onClick={() => setSendOpen(true)}
          >
            Send
          </button>

          <button
            className="rounded-2xl border px-4 py-3 text-sm font-semibold"
            onClick={share}
          >
            Share
          </button>
        </div>
      </div>

      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title={`Send Token #${nft.tokenId}`}
        onConfirm={async (to) => {
          if (!address) throw new Error('Wallet not connected')

          await writeContractAsync({
            address: nft.contractAddress as `0x${string}`,
            abi: erc721Abi,
            functionName: 'safeTransferFrom',
            args: [address, to, BigInt(nft.tokenId)],
          })
        }}
      />
    </div>
  )
}
