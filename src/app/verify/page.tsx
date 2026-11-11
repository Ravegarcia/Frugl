import Link from 'next/link';

export default function VerifyPage() {
  return (
    <div className='mx-auto mt-10 max-w-sm space-y-3 rounded-xl border bg-white p-6 text-center'>
      <h1 className='text-xl font-semibold'>Email verified</h1>
      <p className='text-gray-600'>Your account is ready.</p>
      <Link href='/laptops' className='underline'>Browse laptops</Link>
    </div>
  );
}
