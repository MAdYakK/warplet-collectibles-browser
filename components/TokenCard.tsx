'use client'

import React, { useMemo, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { erc721Abi } from 'viem'
import type { NftItem } from '../lib/types'
import SendModal from './SendModal'

// Minimal ERC-1155 ABI for safeTransferFrom
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

export default function TokenCard({
  nft,
  variant = 'cards',
  disableActions = false,
}: {
  nft: NftItem
  variant?: 'cards' | 'grid'
  disableActions?: boolean
}) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const [sendOpen, setSendOpen] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

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

  // Determine quantity capability (ERC-1155 only)
  const tokenStd = String((nft as any).tokenStandard ?? '').toLowerCase()
  const is1155 = tokenStd.includes('1155')
  const rawAmount = (nft as any).amount ?? (nft as any).balance ?? 1
  const maxAmount = Math.max(1, Number(rawAmount) ? Number(rawAmount) : 1)

  const buttonBase = 'rounded-full px-4 py-2 text-xs font-semibold transition active:scale-[0.98]'
  const enabledBtn = 'bg-white text-[#1b0736]'
  const disabledBtn = 'bg-white/25 text-white/60 cursor-not-allowed'
  const gapClass = variant === 'grid' ? 'space-y-2' : 'space-y-3'

  return (
    <div className={gapClass}>
      {/* IMAGE BUBBLE */}
      <button
        type="button"
        className="block w-full text-left active:scale-[0.99] transition"
        onClick={() => openUrl(osUrl)}
      >
        <div className="rounded-3xl overflow-hidden border border-white/20 bg-[#2a0c52] shadow-[0_14px_45px_rgba(0,0,0,0.45)]">
          {img && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={nft.name ?? `#${nft.tokenId}`}
              className="w-full aspect-square object-cover block"
              loading="lazy"
              decoding="async"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center bg-black/25">
              <div className="text-xs text-white/80">No image</div>
            </div>
          )}
        </div>
      </button>

      {/* INFO + ACTIONS BUBBLE */}
      <div className="rounded-2xl border border-white/20 bg-[#6d28d9] px-3 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.35)]">
        <div className="text-sm font-semibold text-white truncate">
          {nft.name ?? `Token #${nft.tokenId}`}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className={[buttonBase, disableActions ? disabledBtn : enabledBtn].join(' ')}
            onClick={() => setSendOpen(true)}
            disabled={disableActions}
          >
            Send
          </button>

          <button
            className={[buttonBase, disableActions ? disabledBtn : enabledBtn].join(' ')}
            onClick={share}
            disabled={disableActions}
          >
            Share
          </button>
        </div>
      </div>

      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title={`Send Token #${nft.tokenId}`}
        maxAmount={is1155 ? maxAmount : 1}
        onConfirm={async (to, amount) => {
          if (!address) throw new Error('Wallet not connected')

          if (is1155) {
            // ERC-1155: safeTransferFrom(from, to, id, amount, data)
            await writeContractAsync({
              address: nft.contractAddress as `0x${string}`,
              abi: erc1155Abi,
              functionName: 'safeTransferFrom',
              args: [address, to, BigInt(nft.tokenId), BigInt(amount), '0x'],
            })
          } else {
            // ERC-721: safeTransferFrom(from, to, tokenId)
            await writeContractAsync({
              address: nft.contractAddress as `0x${string}`,
              abi: erc721Abi,
              functionName: 'safeTransferFrom',
              args: [address, to, BigInt(nft.tokenId)],
            })
          }
        }}
      />
    </div>
  )
}
