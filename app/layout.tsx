import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Georgian } from 'next/font/google';
import './globals.css';

const georgian = Noto_Sans_Georgian({ subsets: ['georgian', 'latin'], variable: '--font-georgian', display: 'swap' });

export const metadata: Metadata = {
  title: 'ქალაქობანა',
  description: 'ქალაქობანა — ქართული სიტყვების თამაში მეგობრებთან ერთად',
};
export const viewport: Viewport = { themeColor: '#0b0e26', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className={georgian.variable}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
