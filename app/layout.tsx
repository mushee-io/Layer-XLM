import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mushee Cloud',
  description: 'AI workspace with Stellar testnet payments and SHX mainnet settlement positioning.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
