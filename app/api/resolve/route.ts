import { NextResponse } from 'next/server'

function isHexAddress(s: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(s)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()

  if (!q) {
    return NextResponse.json({ error: 'Missing q' }, { status: 400 })
  }

  // Direct address
  if (isHexAddress(q)) {
    return NextResponse.json({ address: q.toLowerCase() })
  }

  // Try web3.bio Farcaster profile resolver (supports: address, fname, fid)
  // Docs: https://api.web3.bio/profile/farcaster/{identity}
  // We’ll try it for ENS too (many ENS names map to farcaster profiles / linked accounts).
  try {
    const url = `https://api.web3.bio/profile/farcaster/${encodeURIComponent(q)}`
    const res = await fetch(url, {
      // keep it fresh; avoids caching "not found" for too long
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const data: any = await res.json()

    // Try common shapes:
    // - data.address / data.owner
    // - data.links.ethereum.address
    // - data.addresses (array)
    const candidates: string[] = []

    const pushIfAddr = (v: any) => {
      if (typeof v === 'string' && isHexAddress(v)) candidates.push(v.toLowerCase())
    }

    pushIfAddr(data?.address)
    pushIfAddr(data?.owner)

    pushIfAddr(data?.links?.ethereum?.address)
    pushIfAddr(data?.links?.eth?.address)

    if (Array.isArray(data?.addresses)) {
      for (const a of data.addresses) pushIfAddr(a)
    }

    // Some profiles have "accounts" arrays
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
