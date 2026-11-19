import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Audiowide, Geist_Mono, Manrope, Poppins } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import './styles/site-shell.css';
import './styles/seller-dashboard.css';
import './styles/listing-detail.css';
import './styles/home-and-browse.css';
import './styles/admin-and-account.css';
import './styles/marketplace-pages.css';
import './styles/sell-flow.css';
import './styles/auth.css';
import './styles/responsive-overrides.css';
import './styles/final-overrides.css';
import TopBar from '@/components/TopBar';
import Footer from '@/components/Footer';
import BottomBar from '@/components/BottomBar';
import MotionProvider from '@/components/motion/MotionProvider';
import SessionHeartbeat from '@/components/SessionHeartbeat';
import { cn } from "@/lib/utils";

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

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Frugl - secondhand laptops',
  description: 'Buy and sell secondhand laptops with verified specs.',
};

export default function RootLayout({
  children,
  authModal,
}: {
  children: React.ReactNode;
  authModal: React.ReactNode;
}) {
  return (
    <html lang='en' className={cn(audiowide.variable, poppins.variable, manrope.variable, geistMono.variable, 'font-sans')}>
      <body className='app-body'>
        <MotionProvider>
          <SessionHeartbeat />
          <Suspense fallback={<header className='sticky top-0 z-20 h-14 bg-transparent px-4 pt-3 max-md:px-2.5 max-md:pt-2' />}>
            <TopBar />
          </Suspense>
          <main className='app-main'>{children}</main>
          {authModal}
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
          <Suspense fallback={null}>
            <BottomBar />
          </Suspense>
        </MotionProvider>
      </body>
    </html>
  );
}
