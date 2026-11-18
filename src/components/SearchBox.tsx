'use client';
import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from '@/components/icons';

export default function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState<{ term: string; values: string[] }>({
    term: '',
    values: [],
  });

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          '/api/search/suggestions?q=' + encodeURIComponent(term),
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Suggestion request failed (${response.status})`);
        const result: { suggestions?: unknown } = await response.json();
        if (!Array.isArray(result.suggestions)) {
          throw new Error('Suggestion response did not contain a suggestions list');
        }
        setSuggestions({
          term,
          values: result.suggestions.filter((option): option is string => typeof option === 'string'),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Could not load search suggestions:', error);
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [q]);

  const options = suggestions.term === q.trim() ? suggestions.values : [];

  return (
    <form
      className='group flex h-[3.2rem] w-full items-center gap-3 rounded-full border border-lavender-300 bg-surface px-4 text-plum-700 transition-[border-color,box-shadow] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-plum-700 hover:shadow-[0_0_0_3px_rgb(67_54_79_/_0.12)] focus-within:border-plum-700 focus-within:shadow-[0_0_0_3px_rgb(67_54_79_/_0.12)]'
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? '/laptops?q=' + encodeURIComponent(term) : '/laptops');
      }}
    >
      <button
        type='submit'
        aria-label='Search laptops'
        className='grid size-8 shrink-0 place-items-center rounded-full text-plum-700 transition-[background-color,color,scale] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.06] hover:bg-lavender-100 hover:text-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-900 motion-reduce:scale-100!'
      >
        <Search size={18} />
      </button>
      <input
        list={listId}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className='h-full min-w-0 w-full border-0 bg-transparent text-[0.9rem] text-foreground outline-none placeholder:text-plum-700 focus:outline-none'
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
