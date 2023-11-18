import '@flexkit/studio/src/styles.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AuthProvider } from '@flexkit/studio';

const inter = Inter({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Flexkit Studio',
  description: 'Empower Your Business with Effortless Data Management and Workflow Automation',
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  // const nextCookies = cookies();
  // const token = nextCookies.get('FKSESSID');

  return (
    <html className={inter.className} lang="en" suppressHydrationWarning>
      <body>
        {/* <AuthProvider>{children}</AuthProvider> */}
        {children}
      </body>
    </html>
  );
}
