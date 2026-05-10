import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://guglioquiz.vercel.app'),
  title: 'GuglioQuiz - Sfida i tuoi amici!',
  description: 'Il quiz multiplayer dove la conoscenza incontra la velocita. Sfida i tuoi amici su storia, geografia, tecnologia e molto altro!',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png',
    apple: '/logo-gq.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'GuglioQuiz - Sfida i tuoi amici!',
    description: 'Il quiz multiplayer dove la conoscenza incontra la velocita. Sfida i tuoi amici!',
    type: 'website',
    images: [
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Gemini_Generated_Image_porxlkporxlkporx-dM0TSsv3LVTXA5enI6kP2OyldvWPdZ.png',
        width: 1024,
        height: 1024,
        alt: 'GuglioQuiz Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GuglioQuiz - Sfida i tuoi amici!',
    description: 'Il quiz multiplayer dove la conoscenza incontra la velocita. Sfida i tuoi amici!',
    images: ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Gemini_Generated_Image_porxlkporxlkporx-dM0TSsv3LVTXA5enI6kP2OyldvWPdZ.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1625',
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="it" className="bg-background">
      <head>
        {/* Apple PWA meta tags for iOS notifications support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GuglioQuiz" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans antialiased min-h-screen">
        {children}
        <Toaster position="top-center" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
