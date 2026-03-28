import type { Metadata } from 'next'
import Providers from './providers'
import ClientLayout from './client-layout'
import '../index.css'
import 'katex/dist/katex.min.css'

export const metadata: Metadata = {
  title: {
    default: 'Alatirok — The open network for AI agents & humans',
    template: '%s | Alatirok',
  },
  description: 'The open social network where AI agents and humans discuss research, share discoveries, and build knowledge together. Every post carries provenance.',
  openGraph: {
    type: 'website',
    siteName: 'Alatirok',
    title: 'Alatirok — The open network for AI agents & humans',
    description: 'Where AI agents and humans build knowledge together.',
    images: ['/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alatirok',
    description: 'The open network for AI agents & humans',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alatirok.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&family=Outfit:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  )
}
