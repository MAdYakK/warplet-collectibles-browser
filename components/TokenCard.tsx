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
        img && appUrl ? [img, appUrl] :
        img ? [img] :
        appUrl ? [appUrl] :
        []

      await sdk.actions.composeCast({
        text: SHARE_TEXT,
        embeds,
      })
    } else {
      const msg = `${SHARE_TEXT}\n\n${appUrl || ''}`.trim()
      alert(`Open in Warpcast to share.\n\nCopy text:\n${msg}`)
    }
  }

  const cardClass =
    variant === 'grid'
      ? 'rounded-[28px] border border-white/10 bg-white/5 shadow-sm overflow-hidden'
      : 'rounded-[28px] border border-white/10 bg-white/5 shadow-sm overflow-hidden'

  const buttonBase =
    'rounded-full px-4 py-2 text-xs font-semibold transition active:scale-[0.98]'
  const enabledBtn = 'bg-white text-[#1b0736]'
  const disabledBtn = 'bg-white/20 text-white/50 cursor-not-allowed'

  return (
    <div className={cardClass}>
      <button className="block w-full text-left" onClick={() => openUrl(osUrl)}>
        <div className="p-3">
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/10">
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
              <div className="w-full aspect-square flex items-center justify-center bg-white/5">
                <div className="text-xs text-white/70">No image</div>
              </div>
            )}
          </div>

          <div className="mt-3 rounded-2xl bg-[#a78bfa]/15 border border-white/10 px-3 py-2">
            <div className="text-sm font-semibold text-white truncate">
              {nft.name ?? `Token #${nft.tokenId}`}
            </div>
            <div className="mt-0.5 text-[11px] text-white/75 truncate">
              {nft.contractAddress}
            </div>
          </div>
        </div>
      </button>

      <div className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            className={[
              buttonBase,
              disableActions ? disabledBtn : enabledBtn,
            ].join(' ')}
            onClick={() => setSendOpen(true)}
            disabled={disableActions}
            title={disableActions ? 'Disabled while browsing another wallet' : 'Send'}
          >
            Send
          </button>

          <button
            className={[
              buttonBase,
              disableActions ? disabledBtn : enabledBtn,
            ].join(' ')}
            onClick={share}
            disabled={disableActions}
            title={disableActions ? 'Disabled while browsing another wallet' : 'Share'}
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
