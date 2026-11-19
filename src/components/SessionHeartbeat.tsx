'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const HEARTBEAT_INTERVAL = 30_000;
const PROTECTED_PATHS = ['/sell', '/dashboard', '/messages', '/offers', '/saved', '/notifications', '/reviews', '/account', '/admin'];

export default function SessionHeartbeat() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let hasSession = false;
    let sessionPending = false;
    let requestInFlight = false;
    let lastActivityAt = Date.now();
    let lastRenewedActivityAt = 0;
    let lastRequestAt = 0;

    async function renew(force = false) {
      const now = Date.now();
      if (
        !active ||
        !hasSession ||
        document.visibilityState === 'hidden' ||
        requestInFlight ||
        (!force && lastActivityAt <= lastRenewedActivityAt) ||
        (!force && now - lastRequestAt < HEARTBEAT_INTERVAL)
      ) {
        return;
      }

      requestInFlight = true;
      lastRequestAt = now;
      try {
        const response = await fetch('/api/auth/session/heartbeat', {
          method: 'POST',
          cache: 'no-store',
        });

        if (!active) return;
        if (response.status === 401 || response.status === 403) {
          hasSession = false;
          const { error } = await supabase.auth.signOut({ scope: 'local' });
          if (error) console.error('Could not clear the expired local session:', error.message);

          if (response.status === 403) {
            router.replace('/account-suspended');
            return;
          }

          const path = window.location.pathname;
          const isProtected = PROTECTED_PATHS.some((protectedPath) =>
            path === protectedPath || path.startsWith(`${protectedPath}/`),
          );
          if (isProtected) {
            const next = encodeURIComponent(path + window.location.search);
            router.replace(`/login?next=${next}`);
          } else {
            window.location.reload();
          }
          return;
        }

        if (!response.ok) {
          console.error('Could not renew the application session:', response.status);
          return;
        }

        lastRenewedActivityAt = lastActivityAt;
      } catch (error) {
        console.error('Could not reach the application session endpoint:', error);
      } finally {
        requestInFlight = false;
      }
    }

    function recordActivity() {
      lastActivityAt = Date.now();
      void renew();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        lastActivityAt = Date.now();
        void renew(true);
      }
    }

    function handleAppSessionReady() {
      sessionPending = false;
      hasSession = true;
      lastActivityAt = Date.now();
      void renew(true);
    }

    const timer = window.setInterval(() => void renew(), HEARTBEAT_INTERVAL);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        sessionPending = true;
        hasSession = false;
      } else if (event === 'SIGNED_OUT') {
        sessionPending = false;
        hasSession = false;
      }
    });
    window.addEventListener('pointerdown', recordActivity, { passive: true });
    window.addEventListener('keydown', recordActivity);
    window.addEventListener('touchstart', recordActivity, { passive: true });
    window.addEventListener('wheel', recordActivity, { passive: true });
    window.addEventListener('frugl:app-session-ready', handleAppSessionReady);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error('Could not read the local authentication session:', error.message);
        return;
      }
      if (sessionPending) return;
      hasSession = Boolean(data.session);
      if (hasSession) void renew(true);
    });

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('pointerdown', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('touchstart', recordActivity);
      window.removeEventListener('wheel', recordActivity);
      window.removeEventListener('frugl:app-session-ready', handleAppSessionReady);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
