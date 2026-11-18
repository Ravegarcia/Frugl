'use client';

import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { MapPin, AlertTriangle, Loader2 } from '@/components/icons';
import type { LocationSuggestion } from '@/app/api/locations/route';

interface LocationAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function LocationAutocomplete({
  id = 'location',
  value,
  onChange,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isConfirmed, setIsConfirmed] = useState(() => Boolean(value && value.trim().length > 0));
  const [touched, setTouched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '');
    if (value && value.trim().length > 0) {
      setIsConfirmed(true);
    }
  }, [value]);

  // Fetch autocomplete suggestions with debounce
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/locations?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.suggestions) ? data.suggestions : [];
          setSuggestions(list);
          setActiveIndex(list.length > 0 ? 0 : -1);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isOpen]);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(item: LocationSuggestion) {
    setQuery(item.primary);
    onChange(item.value);
    setIsConfirmed(true);
    setTouched(true);
    setIsOpen(false);
  }

  function handleInputChange(nextVal: string) {
    setQuery(nextVal);
    onChange(nextVal);
    setIsConfirmed(false);
    setTouched(true);
    if (!isOpen) {
      setIsOpen(true);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (suggestions.length > 0 ? (prev + 1) % suggestions.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        suggestions.length > 0 ? (prev - 1 + suggestions.length) % suggestions.length : -1
      );
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  }

  const showWarning = (touched || isOpen) && (!query.trim() || !isConfirmed);

  return (
    <div ref={containerRef} className='location-autocomplete'>
      {isOpen && suggestions.length > 0 && (
        <div
          id={`${id}-listbox`}
          role='listbox'
          aria-label='Location suggestions'
          className='location-autocomplete-popover'
        >
          {suggestions.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={item.id}
                type='button'
                role='option'
                aria-selected={isActive}
                className={`location-autocomplete-item${isActive ? ' is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  // Prevent input blur before selection completes
                  e.preventDefault();
                  handleSelect(item);
                }}
              >
                <span className='location-autocomplete-primary'>{item.primary}</span>
                <span className='location-autocomplete-secondary'>{item.secondary}</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        className={`location-autocomplete-box${showWarning ? ' is-warning' : ''}${
          isOpen ? ' is-focused' : ''
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        <span className='location-autocomplete-pin' aria-hidden='true'>
          <MapPin size={18} />
        </span>

        <div className='location-autocomplete-content'>
          <label htmlFor={id} className='location-autocomplete-label'>
            Location <span className='text-red-500'>*</span>
          </label>
          <input
            ref={inputRef}
            id={id}
            type='text'
            role='combobox'
            aria-expanded={isOpen && suggestions.length > 0}
            aria-controls={`${id}-listbox`}
            aria-autocomplete='list'
            autoComplete='off'
            value={query}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              setTouched(true);
              // If user typed an exact match to a suggestion, mark confirmed
              const exact = suggestions.find(
                (s) =>
                  s.primary.toLowerCase() === query.trim().toLowerCase() ||
                  s.value.toLowerCase() === query.trim().toLowerCase()
              );
              if (exact) {
                setQuery(exact.primary);
                onChange(exact.value);
                setIsConfirmed(true);
              }
            }}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Enter a city or barangay'
            className='location-autocomplete-input'
          />
        </div>

        <span className='location-autocomplete-status' aria-hidden='true'>
          {loading ? (
            <Loader2 size={16} className='animate-spin location-autocomplete-spinner' />
          ) : showWarning ? (
            <AlertTriangle size={18} className='location-autocomplete-warning-icon' />
          ) : null}
        </span>
      </div>
    </div>
  );
}
