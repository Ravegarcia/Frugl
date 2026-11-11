import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').replace(/[%,()]/g, '').trim();
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const supabase = await createClient();
  const [models, listings] = await Promise.all([
    supabase.from('laptop_models').select('brand,series').or('series.ilike.%' + q + '%,brand.ilike.%' + q + '%').limit(5),
    supabase.from('listings').select('title').in('status', ['available', 'reserved']).ilike('title', '%' + q + '%').limit(5),
  ]);
  const names = [
    ...(models.data ?? []).map((m: any) => m.brand + ' ' + m.series),
    ...(listings.data ?? []).map((l: any) => l.title),
  ];
  return NextResponse.json({ suggestions: Array.from(new Set(names)).slice(0, 8) });
}
