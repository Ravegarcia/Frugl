import Link from 'next/link';

export default function Footer() {
  return (
    <footer className='border-t bg-white py-6 text-center text-sm text-gray-500'>
      <Link href='/safety' className='underline'>Safety and rules</Link>
      <p className='mt-1'>Frugl (working name) - a school project</p>
    </footer>
  );
}
