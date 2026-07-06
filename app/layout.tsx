import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { CartProvider } from '@/lib/contexts/CartContext'
import { WishlistProvider } from '@/lib/contexts/WishlistContext'
import { ToastProvider } from '@/components/ui/toast'
import { NavigationFeedback } from '@/components/ui/NavigationFeedback'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://emeritusgadgets.com'),
  title: {
    default: 'Emeritus Gadget | Premium Technology in Nigeria',
    template: '%s | Emeritus Gadget',
  },
  description: 'Discover premium gadgets and innovative technology products. Fast shipping, authentic products, and exceptional customer service.',
  keywords: 'gadgets, electronics, tech store, premium products, innovation',
  generator: 'v0.app',
  applicationName: 'Emeritus Gadget',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    siteName: 'Emeritus Gadget',
    title: 'Emeritus Gadget | Premium Technology in Nigeria',
    description: 'Authentic gadgets, fast delivery and professional support from Ile-Ife, Nigeria.',
    images: [{ url: '/hero-device.svg', width: 1200, height: 630, alt: 'Emeritus Gadget' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Emeritus Gadget | Premium Technology in Nigeria',
    description: 'Authentic gadgets, fast delivery and professional support.',
    images: ['/hero-device.svg'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      {
        url: '/logo2.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/logo.svg',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/logo.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1e40af' },
    { media: '(prefers-color-scheme: dark)', color: '#3b82f6' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <NavigationFeedback />
        <ToastProvider>
          <CartProvider>
            <WishlistProvider>
              {children}
            </WishlistProvider>
          </CartProvider>
        </ToastProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
