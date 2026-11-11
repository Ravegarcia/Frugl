import Link from 'next/link';

export default function Footer() {
  return (
    <footer className='site-footer py-6 text-center text-sm'>
      <Link href='/safety' className='underline'>Safety and rules</Link>
      <p className='mt-1'>Frugl (working name) - a school project</p>
    </footer>
  );
}
