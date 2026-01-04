import { NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

function cleanQ(q: string) {
  // basic “normalize” without any dependency
  return q.trim().replace(/\s+/g, '')
}

function isLikelyEns(name: string) {
  return name.toLowerCase().endsWith('.eth')
}

function parseFid(q: string): number | null {
  const s = q.trim().toLowerCase()

  // fid:123 or fid/123
  const m = s.match(/^fid[:/](\d+)$/)
  if (m?.[1]) return Number(m[1])

  // pure number
  if (/^\d+$/.test(s)) return Number(s)

  return null
}

async function resolveWithWeb3BioFarcaster(id: string): Promise<string | null> {
  // web3.bio supports /profile/farcaster/<fname_or_fid>
  const url = `https://api.web3.bio/profile/farcaster/${encodeURIComponent(id)}`
  const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!res.ok) return null

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

  return candidates[0] ?? null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const qRaw = searchParams.get('q') ?? ''
  const qClean = cleanQ(qRaw)

  if (!qClean) {
    return NextResponse.json({ error: 'Missing q' }, { status: 400 })
  }

  // allow @fname
  const qNoAt = qClean.startsWith('@') ? qClean.slice(1) : qClean
  const qLower = qNoAt.toLowerCase()

  // 1) Direct address
  if (isAddress(qLower)) {
    return NextResponse.json({ address: qLower.toLowerCase() })
  }

  // 2) ENS
  if (isLikelyEns(qLower)) {
    try {
      const addr = await publicClient.getEnsAddress({ name: qLower })
      if (addr) return NextResponse.json({ address: addr.toLowerCase() })
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  // 3) FID support (12345 or fid:12345)
  const fid = parseFid(qLower)
  if (fid !== null && Number.isFinite(fid) && fid > 0) {
    const addr = await resolveWithWeb3BioFarcaster(String(fid))
    if (addr) return NextResponse.json({ address: addr })
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 4) Farcaster username via web3.bio
  try {
    const addr = await resolveWithWeb3BioFarcaster(qLower)
    if (addr) return NextResponse.json({ address: addr })
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
