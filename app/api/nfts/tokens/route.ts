import { NextResponse } from 'next/server'
import { fetchTokens } from '../../../../lib/moralis'
import { normalizeChain } from '../../../../lib/chains'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  const chain = normalizeChain(searchParams.get('chain'))
  const contract = (searchParams.get('contract') || '').toLowerCase()

  if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 })
  if (!contract) return NextResponse.json({ error: 'Missing contract' }, { status: 400 })

  try {
    const nfts = await fetchTokens(address, chain, contract)
    return NextResponse.json({ nfts })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
