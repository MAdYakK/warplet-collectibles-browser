import { NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(), // viem default public RPC; you can swap to Alchemy/Infura later
})

function isLikelyEns(name: string) {
  return name.toLowerCase().endsWith('.eth')
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const qRaw = (searchParams.get('q') || '').trim()
  const q = qRaw.toLowerCase()

  if (!q) {
    return NextResponse.json({ error: 'Missing q' }, { status: 400 })
  }

  // 1) Direct address
  if (isAddress(q)) {
    return NextResponse.json({ address: q.toLowerCase() })
  }

  // 2) ENS (.eth)
  // This is the main missing piece for things like madyak.eth
  if (isLikelyEns(q)) {
    try {
      const addr = await publicClient.getEnsAddress({ name: q })
      if (addr) return NextResponse.json({ address: addr.toLowerCase() })
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  // 3) Farcaster username / other identifiers via web3.bio
  // (supports fname, fid, etc.)
  try {
    const url = `https://api.web3.bio/profile/farcaster/${encodeURIComponent(qRaw)}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const data: any = await res.json()

    const candidates: string[] = []
    const pushIfAddr = (v: any) => {
      if (typeof v === 'string' && isAddress(v)) candidates.push(v.toLowerCase())
    }

    pushIfAddr(data?.address)
    pushIfAddr(data?.owner)
    pushIfAddr(data?.links?.ethereum?.address)
    pushIfAddr(data?.links?.eth?.address)

    if (Array.isArray(data?.addresses)) {
      for (const a of data.addresses) pushIfAddr(a)
    }

    if (Array.isArray(data?.accounts)) {
      for (const acct of data.accounts) {
        pushIfAddr(acct?.address)
        pushIfAddr(acct?.value)
      }
    }

    const address = candidates[0]
    if (!address) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ address })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
