import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import { ConditionalNavBar } from '@/components/ui/ConditionalNavBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Phomu - The Modular Music Party Platform',
  description:
    'An open-source hybrid party game that bridges physical cards and digital music experiences.',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/favicon.png', sizes: '180x180' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" data-theme="jackbox" suppressHydrationWarning>
      <body>
        <Providers>
          <ConditionalNavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
