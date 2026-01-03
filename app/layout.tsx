import './globals.css'
import type { Metadata } from 'next'
import Providers from '../components/Providers'
import MiniAppReady from '../components/MiniAppReady'
import { Roboto } from 'next/font/google'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Warplet Collectibles Browser',
  description: 'Browse your Farcaster wallet NFTs by collection.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={roboto.className}>
      <body>
        <Providers>
          <MiniAppReady />
          {children}
        </Providers>
      </body>
    </html>
  )
}
