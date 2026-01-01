import { NextResponse } from 'next/server'
import { fetchCollections } from '../../../../lib/moralis'
import { normalizeChain } from '../../../../lib/chains'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  const chain = normalizeChain(searchParams.get('chain'))

  if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 })

  try {
    const collections = await fetchCollections(address, chain)
    return NextResponse.json({ collections })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
