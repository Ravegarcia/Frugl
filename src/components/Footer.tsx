import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth';
import Reveal from '@/components/motion/Reveal';

export default async function Footer() {
  const { user, profile } = await getSessionProfile();
  if (profile?.role === 'admin') return null;

  const canBrowse = Boolean(user);

  return (
    <footer className='site-footer relative shrink-0 overflow-hidden bg-[var(--footer)] text-lavender-300'>
      <div className='relative mx-auto w-[min(calc(100%-2rem),80rem)] pb-4 pt-[2.75rem] md:w-[min(calc(100%-3rem),80rem)] md:pb-5 md:pt-[3.75rem]'>
        <div className='grid grid-cols-2 gap-x-6 gap-y-8 pb-8 md:grid-cols-[minmax(15rem,1.5fr)_repeat(3,minmax(8rem,1fr))] md:gap-[clamp(2rem,5vw,5.5rem)] md:pb-12'>
          <Reveal className='col-span-full md:col-span-1'>
            <Link href='/' className='inline-block font-heading text-2xl tracking-[-0.04em] text-accent!'>Frugl</Link>
            <p className='mt-[1.15rem] text-base text-surface'>Good laptops deserve another life.</p>
            <p className='mt-[0.55rem] max-w-72 text-[0.85rem] leading-[1.7] text-lavender-300'>A place to find and pass on pre-loved laptops.</p>
          </Reveal>

          <Reveal as='nav' className='flex flex-col items-start gap-[0.9rem]' ariaLabel='Explore'>
            <h2 className='mb-1 font-sans text-[0.8rem] font-semibold tracking-normal text-lavender-300'>Explore</h2>
            <Link href='/' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Home</Link>
            {canBrowse ? (
              <>
                <Link href='/laptops' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Browse laptops</Link>
                <Link href='/saved' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Saved laptops</Link>
              </>
            ) : !user ? (
              <Link href='/register?next=%2Flaptops' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Register to see more</Link>
            ) : null}
          </Reveal>

          <Reveal as='nav' className='flex flex-col items-start gap-[0.9rem]' ariaLabel='Sell with Frugl'>
            <h2 className='mb-1 font-sans text-[0.8rem] font-semibold tracking-normal text-lavender-300'>Sell with Frugl</h2>
            <Link href='/sell' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Start selling</Link>
            <Link href='/dashboard' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Manage listings</Link>
            <Link href='/offers' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Offers</Link>
          </Reveal>

          <Reveal as='nav' className='flex flex-col items-start gap-[0.9rem]' ariaLabel='Help and account'>
            <h2 className='mb-1 font-sans text-[0.8rem] font-semibold tracking-normal text-lavender-300'>Help & account</h2>
            <Link href='/safety' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Safety and rules</Link>
            <Link href='/privacy' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Privacy policy</Link>
            <Link href='/terms' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Terms of service</Link>
            <Link href='/messages' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Messages</Link>
            <Link href='/account' className='text-[0.92rem] text-lavender-300 transition-colors duration-[150ms] hover:text-accent'>Account settings</Link>
          </Reveal>
        </div>

        <div className='flex flex-col gap-[0.4rem] border-t border-[rgb(255_255_255_/_0.09)] pt-[1.15rem] text-xs text-lavender-300 md:flex-row md:justify-between md:gap-4'>
          <p>© Frugl · BSINFO 3WMAD1</p>
          <p>Buy thoughtfully. Sell responsibly.</p>
        </div>
      </div>
    </footer>
  );
}
