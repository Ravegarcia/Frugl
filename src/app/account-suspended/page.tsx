export default function AccountSuspendedPage() {
  return (
    <section className='mx-auto mt-12 max-w-lg space-y-4 rounded-2xl border bg-white p-8 text-center'>
      <h1 className='text-2xl font-semibold'>Account access is suspended</h1>
      <p className='text-gray-600'>
        Marketplace features are unavailable for this account. Contact Frugl support if you think this is a mistake.
      </p>
      <form action='/auth/signout' method='post'>
        <button type='submit' className='button-primary auth-submit'>Sign out</button>
      </form>
    </section>
  );
}
