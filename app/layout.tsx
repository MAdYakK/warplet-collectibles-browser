import './globals.css'
import type { Metadata } from 'next'
import MiniAppReady from '../components/MiniAppReady'

function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export const metadata: Metadata = {
  title: 'Warplet Collectibles Browser',
  description: 'Browse your Farcaster wallet NFTs by collection.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <MiniAppReady />
          {children}
        </Providers>
      </body>
    </html>
  )
}
