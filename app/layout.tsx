import 'dotenv/config'; // Load environment variables
import type { Metadata } from 'next'
import "@/app/globals.css"
import { cn } from "@/lib/utils"
import { fontSans, fontHeading } from "@/lib/fonts"
import { RootClientLayout } from "@/components/layout/root-client-layout"
import Script from 'next/script'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://mealtime.app'),
  title: "MealTime - Gerenciador de Alimentação",
  description: "Gerencie a alimentação dos seus gatos de forma simples e eficiente",
  generator: 'MealTime App',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MealTime',
  },
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://mealtime.app',
    title: 'MealTime - Gerenciador de Alimentação',
    description: 'Gerencie a alimentação dos seus gatos de forma simples e eficiente',
    siteName: 'MealTime',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MealTime - Gerenciador de Alimentação',
      },
    ],
  },
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'MealTime - Gerenciador de Alimentação',
    description: 'Gerencie a alimentação dos seus gatos de forma simples e eficiente',
    images: ['/og-image.png'],
    creator: '@mealtime',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={cn(fontSans.variable, fontHeading.variable)}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="hsl(221.2, 83.2%, 53.3%)" />
      </head>
      <body className={cn("min-h-screen bg-background antialiased", fontSans.className)}>
        <RootClientLayout>
          {children}
        </RootClientLayout>
        <Script src="/register-sw.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}