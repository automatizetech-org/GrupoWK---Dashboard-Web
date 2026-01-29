import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WK Analytics - Grupo WK',
  description: 'Sistema de análise e gestão de dados do Grupo WK - Garantia de Qualidade em Dados',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
  appleWebApp: {
    capable: true,
    title: 'WK Analytics',
    statusBarStyle: 'default',
    startupImage: '/images/logo.png',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="transition-colors duration-500">
      <body className="transition-colors duration-500">{children}</body>
    </html>
  )
}
