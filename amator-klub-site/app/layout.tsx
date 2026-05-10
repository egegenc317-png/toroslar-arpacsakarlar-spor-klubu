import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Toroslar Arpaçsakarlar Spor Kulübü',
  description: 'Toroslar Arpaçsakarlar Spor Kulübü - Mersin\'den Amatör Futbol Kulübü. 1990 yılından bu yana gençlere spor yolu açıyoruz.',
  keywords: 'futbol, spor, Mersin, Toroslar, amatör lig, gençlik',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  )
}
