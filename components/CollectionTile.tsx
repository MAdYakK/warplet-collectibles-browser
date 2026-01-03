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

  return (
    <div
      className="
        rounded-[28px]
        border border-white/10
        bg-white/5
        shadow-sm
        overflow-hidden
      "
    >
      <Link
        href={`/collection/${c.chain}/${c.contractAddress}${addrKey ? `?addr=${encodeURIComponent(addrKey)}` : ''}`}
        className="block active:scale-[0.99] transition"
        onClick={() => saveHomeScroll(addrKey || 'connected')}
      >
        <div className="p-3">
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/10">
            {c.image && !imgFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.image}
                alt={c.name}
                className="w-full aspect-square object-cover block"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center bg-white/5">
                <div className="text-center px-3">
                  <div className="text-xs font-semibold text-white/90 truncate">
                    {c.name || 'Collection'}
                  </div>
                  <div className="mt-1 text-[11px] text-white/60">
                    Image unavailable
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rounded tinted info block */}
          <div className="mt-3 rounded-2xl bg-[#a78bfa]/15 border border-white/10 px-3 py-2">
            <div className="text-sm font-semibold text-white truncate">{c.name}</div>
            <div className="mt-0.5 text-xs text-white/80">
              {c.tokenCount} item{c.tokenCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
