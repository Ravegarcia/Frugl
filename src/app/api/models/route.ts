import { json } from '@/lib/api';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('query') ?? '').replace(/[%,()]/g, '').trim();
  const supabase = await createClient();
  let query = supabase.from('laptop_models').select('*').order('brand').limit(10);
  if (q) query = query.or('series.ilike.%' + q + '%,brand.ilike.%' + q + '%,model_number.ilike.%' + q + '%');
  const { data } = await query;
  return json({ models: data ?? [] });
}
