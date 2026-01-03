import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { fetchTokens } from '../../../../lib/moralis'
import { normalizeChain } from '../../../../lib/chains'

const getTokensCached = unstable_cache(
  async (address: string, chain: string, contract: string) => {
    return fetchTokens(address, chain as any, contract)
  },
  ['warplet:tokens'],
  { revalidate: 120 } // seconds
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const addressRaw = searchParams.get('address')
  const chain = normalizeChain(searchParams.get('chain'))
  const contractRaw = (searchParams.get('contract') || '').toLowerCase()

  if (!addressRaw) return NextResponse.json({ error: 'Missing address' }, { status: 400 })
  if (!contractRaw) return NextResponse.json({ error: 'Missing contract' }, { status: 400 })

  const address = addressRaw.toLowerCase()
  const contract = contractRaw.toLowerCase()

  try {
    const nfts = await getTokensCached(address, chain, contract)
    return NextResponse.json(
      { nfts },
      {
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
        },
      }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
