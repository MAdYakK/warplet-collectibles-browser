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
      className="flex items-center gap-3 rounded-2xl border p-3 active:scale-[0.995]"
    >
      <div className="h-14 w-14 overflow-hidden rounded-2xl border bg-neutral-50 flex items-center justify-center">
        {c.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
        ) : (
          <div className="text-xs text-neutral-400">No image</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">{c.name}</div>
        <div className="text-xs text-neutral-500">
          {c.tokenCount} item{c.tokenCount === 1 ? '' : 's'}
        </div>
      </div>

      <div className="text-xs text-neutral-400">›</div>
    </Link>
  )
}
