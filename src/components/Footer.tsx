import Link from 'next/link';

export default function Footer() {
  return (
    <footer className='site-footer'>
      <div className='site-footer-inner'>
        <div className='site-footer-brand'>
          <Link href='/' className='brand-mark'>Frugl</Link>
          <p>Buy and sell trusted secondhand laptops.</p>
        </div>

        <div className='site-footer-links'>
          <Link href='/laptops'>Browse</Link>
          <Link href='/sell'>Sell a laptop</Link>
          <Link href='/safety'>Safety and rules</Link>
        </div>

        <div className='site-footer-meta'>
          <p>Frugl (working name) — a school project</p>
        </div>
      </div>
    </footer>
  );
}
