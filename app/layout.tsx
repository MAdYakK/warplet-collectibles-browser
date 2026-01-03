import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '../components/Providers'
import MiniAppReady from '../components/MiniAppReady'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Warplet Collectibles Browser',
  description: 'Browse your Farcaster wallet NFTs by collection.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <Providers>
          <MiniAppReady />
          {children}
        </Providers>
      </body>
    </html>
  )
}
