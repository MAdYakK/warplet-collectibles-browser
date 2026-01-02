'use client'

import React, { useMemo, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { erc721Abi } from 'viem'
import type { NftItem } from '../lib/types'
import SendModal from './SendModal'

function isFarcasterMiniApp(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean((window as any).farcaster)
}

function getMiniAppUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

const openSeaAssetUrl = (chain: string, contractAddress: string, tokenId: string) => {
  const c = (chain || '').toLowerCase()
  if (c === 'polygon' || c === 'matic') return `https://opensea.io/assets/matic/${contractAddress}/${tokenId}`
  if (c === 'optimism') return `https://opensea.io/assets/optimism/${contractAddress}/${tokenId}`
  if (c === 'base') return `https://opensea.io/assets/base/${contractAddress}/${tokenId}`
  return `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`
}

const SHARE_TEXT =
  'Shared from Warplet Collectibles Browser by @madyak! It is easy to view your NFTs now, check it out!'

type Props = {
  nft: NftItem
  variant?: 'cards' | 'grid'
}

export default function TokenCard({ nft, variant = 'cards' }: Props) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const [sendOpen, setSendOpen] = useState(false)

  const osUrl = useMemo(
    () => openSeaAssetUrl(String(nft.chain), nft.contractAddress, nft.tokenId),
    [nft.chain, nft.contractAddress, nft.tokenId]
  )

  const img = nft.image

  const openUrl = async (url: string) => {
    if (isFarcasterMiniApp()) {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      await sdk.actions.openUrl(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const share = async () => {
    const appUrl = getMiniAppUrl()

    if (isFarcasterMiniApp()) {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      const embeds: [] | [string] | [string, string] =
        img && appUrl ? [img, appUrl] : img ? [img] : appUrl ? [appUrl] : []

      await sdk.actions.composeCast({ text: SHARE_TEXT, embeds })
    } else {
      const msg = `${SHARE_TEXT}\n\n${appUrl || ''}`.trim()
      alert(`Open in Warpcast to share.\n\nCopy text:\n${msg}`)
    }
  }

  // Shared container styles (transparent / purple-friendly)
  const shell =
    'rounded-3xl border border-white/10 bg-transparent overflow-hidden'
  const imageWrap =
    'rounded-3xl overflow-hidden border border-white/10 bg-white/5'

  if (variant === 'grid') {
    return (
      <div className={shell}>
        <button className="block w-full" onClick={() => openUrl(osUrl)}>
          <div className={imageWrap}>
            {img ? (
              <img
                src={img}
                alt={nft.name ?? `#${nft.tokenId}`}
                className="w-full aspect-square object-cover block"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-xs text-white/50">
                No image
              </div>
            )}
          </div>
        </button>

        <div className="px-3 py-3">
          <div className="text-xs font-semibold truncate text-white">
            {nft.name ?? `Token #${nft.tokenId}`}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setSendOpen(true)}
              className="
                flex-1 rounded-full
                bg-white text-[#1b0736]
                px-3 py-2 text-xs font-semibold
                active:scale-[0.98] transition
              "
            >
              Send
            </button>

            <button
              onClick={share}
              className="
                flex-1 rounded-full
                border border-white/20
                bg-white/5
                px-3 py-2 text-xs font-semibold
                text-white
                active:scale-[0.98] transition
              "
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

  return (
    <div className={shell}>
      <button className="block w-full" onClick={() => openUrl(osUrl)}>
        <div className="px-2 pt-2">
          <div className={imageWrap}>
            {img ? (
              <img src={img} alt={nft.name ?? `#${nft.tokenId}`} className="w-full h-auto block" />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-sm text-white/50">
                No image
              </div>
            )}
          </div>
        </div>
      </button>

      <div className="px-4 py-4">
        <div className="text-sm font-semibold truncate text-white">
          {nft.name ?? `Token #${nft.tokenId}`}
        </div>
        <div className="text-xs text-white/70 truncate">
          {nft.contractAddress} • {nft.tokenStandard ?? 'Unknown'}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setSendOpen(true)}
            className="
              flex-1 rounded-full
              bg-white text-[#1b0736]
              px-4 py-3 text-sm font-semibold
              active:scale-[0.98] transition
            "
          >
            Send
          </button>

          <button
            onClick={share}
            className="
              flex-1 rounded-full
              border border-white/20
              bg-white/5
              px-4 py-3 text-sm font-semibold
              text-white
              active:scale-[0.98] transition
            "
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
