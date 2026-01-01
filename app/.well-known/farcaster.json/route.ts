import { NextResponse } from 'next/server'

export async function GET() {
  // IMPORTANT:
  // For publishing, you must generate + sign accountAssociation for your domain.
  // Mini apps are expected to serve a farcaster.json manifest at /.well-known/farcaster.json. :contentReference[oaicite:6]{index=6}
  // Replace the placeholders below with your real values.

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'

  return NextResponse.json({
    accountAssociation: {
      // Fill this with the JSON Farcaster Signature (JFS) from Warpcast domain settings.
      header: 'REPLACE_ME',
      payload: 'REPLACE_ME',
      signature: 'REPLACE_ME',
    },
    miniapp: {
      version: '1',
      name: 'Warplet Collectibles Browser',
      homeUrl: appUrl,
      iconUrl: `${appUrl}/icon.png`,
      imageUrl: `${appUrl}/og.png`,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: '#ffffff',
    },
  })
}
