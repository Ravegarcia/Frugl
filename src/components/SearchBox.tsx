'use client';
import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from '@/components/icons';

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
      className='header-search-form'
      onSubmit={(e) => {
        e.preventDefault();
        router.push('/laptops?q=' + encodeURIComponent(q));
      }}
    >
      <Search size={18} className='header-search-icon' />
      <input
        list={listId}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label='Search laptops'
        placeholder='Search by keyword, category, price, etc.'
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </form>
  );
}
