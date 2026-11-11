import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Audiowide, Poppins, Geist } from 'next/font/google';
import './globals.css';
import TopBar from '@/components/TopBar';
import Footer from '@/components/Footer';
import BottomBar from '@/components/BottomBar';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const audiowide = Audiowide({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-audiowide',
});

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Frugl - secondhand laptops',
  description: 'Buy and sell secondhand laptops with verified specs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className={cn(audiowide.variable, poppins.variable, "font-sans", geist.variable)}>
      <body className='app-body'>
        <Suspense fallback={<header className='site-header h-14' />}>
          <TopBar />
        </Suspense>
        <main className='app-main'>{children}</main>
        <Footer />
        <BottomBar />
      </body>
    </html>
  );
}
