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
    <Link
      href={`/collection/${c.chain}/${c.contractAddress}`}
      className="
        group
        block
        rounded-3xl
        border
        bg-white/70
        backdrop-blur
        overflow-hidden
        active:scale-[0.99]
        transition
        shadow-sm
      "
    >
      <div className="p-3">
        <div className="rounded-3xl overflow-hidden border bg-neutral-50">
          {c.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.image}
              alt={c.name}
              className="w-full aspect-square object-cover block"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center text-xs text-neutral-400">
              No image
            </div>
          )}
        </div>

        <div className="mt-3 min-w-0">
          <div className="text-sm font-semibold truncate">{c.name}</div>
          <div className="mt-1 text-xs text-neutral-600">
            {c.tokenCount} item{c.tokenCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
          <span className="uppercase tracking-wide">{c.chain}</span>
          <span className="opacity-0 group-hover:opacity-100 transition">Open →</span>
        </div>
      </div>
    </Link>
  )
}
