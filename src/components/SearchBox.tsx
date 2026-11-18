'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from '@/components/icons';
import Popover from '@/components/motion/Popover';

export default function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(true);
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
        setActiveIndex(-1);
        setIsOpen(true);
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

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!options.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      event.preventDefault();
      setQ(options[activeIndex]);
      setIsOpen(false);
    }
  }

  return (
    <form
      ref={formRef}
      className='group relative flex h-[3.2rem] w-full items-center gap-3 rounded-full border border-lavender-300 bg-surface px-4 text-plum-700 transition-[border-color,box-shadow] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-plum-700 hover:shadow-[0_0_0_3px_rgb(67_54_79_/_0.12)] focus-within:border-plum-700 focus-within:shadow-[0_0_0_3px_rgb(67_54_79_/_0.12)]'
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
        role='combobox'
        aria-expanded={isOpen && options.length > 0}
        aria-controls={listId}
        aria-autocomplete='list'
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder='Search by keyword, category, price, etc.'
      />
      <Popover
        open={isOpen && options.length > 0}
        onClose={() => setIsOpen(false)}
        align='left'
        anchorRef={formRef}
        id={listId}
        role='listbox'
        ariaLabel='Search suggestions'
        className='absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-xl border border-lavender-300 bg-surface py-1 text-foreground shadow-[0_12px_30px_rgb(24_13_38_/_0.16)]'
      >
        {options.map((option, index) => (
          <button
            id={`${listId}-option-${index}`}
            key={option}
            type='button'
            role='option'
            aria-selected={activeIndex === index}
            className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-lavender-100 ${
              activeIndex === index ? 'bg-lavender-100' : ''
            }`}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => {
              setQ(option);
              setIsOpen(false);
            }}
          >
            {option}
          </button>
        ))}
      </Popover>
    </form>
  );
}
