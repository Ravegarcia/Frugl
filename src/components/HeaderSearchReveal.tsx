'use client';

import { useEffect, useState } from 'react';
import SearchBox from '@/components/SearchBox';

export default function HeaderSearchReveal() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      setIsVisible(window.scrollY > 80);
    }

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  return (
    <div
      className={`header-search-reveal${isVisible ? ' is-visible' : ''}`}
      aria-hidden={!isVisible}
      inert={!isVisible}
    >
      <SearchBox />
    </div>
  );
}
