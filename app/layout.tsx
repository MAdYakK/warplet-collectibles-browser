import './globals.css'
import type { Metadata } from 'next'
import Providers from '../components/Providers'

export const metadata: Metadata = {
  title: 'Warplet Collectibles Browser',
  description: 'Browse your Farcaster wallet NFTs by collection.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
