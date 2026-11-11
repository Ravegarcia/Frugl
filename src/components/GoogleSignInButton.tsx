'use client';

import { supabase } from '@/lib/supabase'; // CHANGE THIS to your existing client import

export default function GoogleSignInButton({ next = '/' }: { next?: string }) {
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) alert(error.message);
  }

  return (
    <button type="button" onClick={signInWithGoogle} className="border rounded px-4 py-2 w-full">
      Continue with Google
    </button>
  );
}