'use client';
import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    const term = q.trim();
    const t = setTimeout(async () => {
      if (term.length < 2) {
        setOptions([]);
        return;
      }
      const res = await fetch('/api/search/suggestions?q=' + encodeURIComponent(term));
      if (res.ok) setOptions((await res.json()).suggestions);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push('/laptops?q=' + encodeURIComponent(q));
      }}
    >
      <input
        list={listId}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder='Search laptops, brands or models'
        className='w-full rounded-full border bg-gray-50 px-4 py-2 text-sm'
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </form>
  );
}
