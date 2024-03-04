/**
 * TODO: Styles should be included as part of the FlexkitStudio component, avoiding this extra import.
 * Because the ordering matters, and the user could inadvertently override the styles of the Studio and break them.
 */
import './global.css';
import '@flexkit/studio/styles.css';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flexkit Studio',
  description: 'Empower Your Business with Effortless Data Management and Workflow Automation',
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
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
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Seems like a bug in the Geist font types
    <html className={GeistSans.className} lang="en">
      <body>{children}</body>
    </html>
  );
}
