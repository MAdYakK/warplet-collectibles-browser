import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { fetchCollections } from '../../../../lib/moralis'
import { normalizeChain } from '../../../../lib/chains'

const getCollectionsCached = unstable_cache(
  async (address: string, chain: string) => {
    return fetchCollections(address, chain as any)
  },
  ['warplet:collections'],
  { revalidate: 120 } // seconds
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const addressRaw = searchParams.get('address')
  const chain = normalizeChain(searchParams.get('chain'))

  if (!addressRaw) return NextResponse.json({ error: 'Missing address' }, { status: 400 })

  const address = addressRaw.toLowerCase()

  try {
    const collections = await getCollectionsCached(address, chain)
    return NextResponse.json(
      { collections },
      {
        headers: {
          // helpful for debugging in prod
          'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
        },
      }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
