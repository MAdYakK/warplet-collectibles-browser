'use client'

import Link from 'next/link'

type CollectionSummary = {
  chain: string
  contractAddress: string
  image?: string | null
  name: string
  tokenCount: number
}

export default function CollectionTile({ c }: { c: CollectionSummary }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-transparent overflow-hidden">
      {/* Image is the only link */}
      <Link
        href={`/collection/${c.chain}/${c.contractAddress}`}
        className="block active:scale-[0.99] transition"
      >
        <div className="p-3">
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5">
            {c.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.image}
                alt={c.name}
                className="w-full aspect-square object-cover block"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-xs text-white/50">
                No image
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Transparent info area */}
      <div className="px-4 pb-4">
        <div className="text-sm font-semibold truncate text-white">{c.name}</div>
        <div className="mt-1 text-xs text-white/70">
          {c.tokenCount} item{c.tokenCount === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  )
}
