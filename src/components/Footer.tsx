import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth';

export default async function Footer() {
  const { user, profile } = await getSessionProfile();
  const canBrowse = Boolean(user && profile?.role !== 'admin');

  return (
    <footer className='site-footer'>
      <div className='footer-inner'>
        <div className='footer-main'>
          <div className='footer-brand'>
            <Link href='/' className='footer-brand-mark'>Frugl</Link>
            <p className='footer-tagline'>Good laptops deserve another life.</p>
            <p className='footer-description'>A place to find and pass on pre-loved laptops.</p>
          </div>

          <nav className='footer-column' aria-label='Explore'>
            <h2>Explore</h2>
            <Link href='/'>Home</Link>
            {canBrowse ? (
              <>
                <Link href='/laptops'>Browse laptops</Link>
                <Link href='/saved'>Saved laptops</Link>
              </>
            ) : !user ? (
              <Link href='/register?next=%2Flaptops'>Register to see more</Link>
            ) : null}
          </nav>

          <nav className='footer-column' aria-label='Sell with Frugl'>
            <h2>Sell with Frugl</h2>
            <Link href='/sell'>Start selling</Link>
            <Link href='/dashboard'>Manage listings</Link>
            <Link href='/offers'>Offers</Link>
          </nav>

          <nav className='footer-column' aria-label='Help and account'>
            <h2>Help & account</h2>
            <Link href='/safety'>Safety and rules</Link>
            <Link href='/messages'>Messages</Link>
            <Link href='/account'>Account settings</Link>
          </nav>
        </div>

        <div className='footer-bottom'>
          <p>© Frugl · A school project</p>
          <p>Buy thoughtfully. Sell responsibly.</p>
        </div>
      </div>
    </footer>
  );
}
