import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import TopBar from '@/components/TopBar';
import Footer from '@/components/Footer';
import BottomBar from '@/components/BottomBar';

export const metadata: Metadata = {
  title: 'Frugl - secondhand laptops',
  description: 'Buy and sell secondhand laptops with verified specs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className='min-h-screen bg-gray-50 pb-16 text-gray-900 md:pb-0'>
        <Suspense fallback={<header className='sticky top-0 z-20 h-14 border-b bg-white' />}>
          <TopBar />
        </Suspense>
        <main className='mx-auto max-w-6xl px-4 py-6'>{children}</main>
        <Footer />
        <BottomBar />
      </body>
    </html>
  );
}
