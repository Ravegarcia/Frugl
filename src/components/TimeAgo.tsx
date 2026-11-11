'use client';

import { useSyncExternalStore } from 'react';
import { timeAgo } from '@/lib/format';

const listeners = new Set<() => void>();
let interval: number | undefined;

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (listeners.size === 1) {
    interval = window.setInterval(() => {
      listeners.forEach((listener) => listener());
    }, 60_000);
  }

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && interval !== undefined) {
      window.clearInterval(interval);
      interval = undefined;
    }
  };
}

export default function TimeAgo({ timestamp }: { timestamp?: string | null }) {
  return useSyncExternalStore(
    subscribe,
    () => timeAgo(timestamp),
    () => 'recently'
  );
}
