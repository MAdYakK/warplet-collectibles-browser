'use client'

import Link from 'next/link'
import React, { useState } from 'react'

type CollectionSummary = {
  chain: string
  contractAddress: string
  image?: string | null
  name: string
  tokenCount: number
}

function saveHomeScroll(addrKey: string) {
  try {
    const y = typeof window !== 'undefined' ? window.scrollY : 0
    sessionStorage.setItem(`warplet:homeScroll:${addrKey}`, String(y))
  } catch {}
}

export default function CollectionTile({
  c,
  browseAddr,
}: {
  c: CollectionSummary
  browseAddr?: string
}) {
  const addrKey = (browseAddr || '').toLowerCase()
  const [imgFailed, setImgFailed] = useState(false)

  const href = `/collection/${c.chain}/${c.contractAddress}${
    addrKey ? `?addr=${encodeURIComponent(addrKey)}` : ''
  }`

  return (
    <div className="space-y-2">
      <Link
        href={href}
        className="block active:scale-[0.99] transition"
        onClick={() => saveHomeScroll(addrKey || 'connected')}
      >
        <div
          className="
            rounded-3xl overflow-hidden
            border border-white/20
            bg-[#2a0c52]
            shadow-[0_14px_45px_rgba(0,0,0,0.45)]
          "
        >
          {c.image && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.image}
              alt={c.name}
              className="w-full aspect-square object-cover block"
              loading="lazy"
              decoding="async"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center bg-black/25">
              <div className="text-xs text-white/80">Image unavailable</div>
            </div>
          )}
        </div>
      </Link>

      <div
        className="
          rounded-2xl
          border border-white/20
          bg-[#6d28d9]
          px-3 py-2
          shadow-[0_10px_35px_rgba(0,0,0,0.35)]
        "
      >
        <div className="text-sm font-semibold text-white truncate">{c.name}</div>
        <div className="mt-0.5 text-xs text-white/90">
          {c.tokenCount} item{c.tokenCount === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  )
}
