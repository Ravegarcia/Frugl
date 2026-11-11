import { json } from '@/lib/api';
import { createClient } from '@/lib/supabase/server';
import { priceFor } from '@/lib/price';

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const supabase = await createClient();
  return json({ suggestion: await priceFor(supabase, sp.get('modelId'), sp.get('condition')) });
}
