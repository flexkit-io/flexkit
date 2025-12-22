import './global.css';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flexkit Studio',
  description:
    'The open-source React platform for building internal tools, PIMs, CRMs, ERPs, and custom business data apps - fast.',
  icons: {
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
      },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html className={GeistSans.className} lang="en">
      <body>{children}</body>
    </html>
  );
}
