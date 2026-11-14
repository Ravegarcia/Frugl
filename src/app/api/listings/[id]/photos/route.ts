import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { withinLimit } from '@/lib/usage';
import { isImage, processImage, uploadListingPhoto } from '@/lib/images';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.role === 'admin') return json({ error: 'Admin accounts cannot upload marketplace listing photos.' }, 403);

  const { data: listing } = await supabase.from('listings').select('id').eq('id', id).eq('seller_id', user.id).maybeSingle();
  if (!listing) return json({ error: 'Listing not found.' }, 404);
  if (!(await withinLimit(user.id, 'upload'))) return json({ error: 'Daily upload limit reached.' }, 429);

  const files = (await request.formData()).getAll('photos').filter(isImage) as File[];
  const { count } = await supabase.from('listing_photos').select('id', { count: 'exact', head: true }).eq('listing_id', id);
  if ((count ?? 0) + files.length > 10) return json({ error: 'A listing can have at most 10 photos.' }, 400);

  const admin = createAdminClient();
  try {
    let order = count ?? 0;
    for (const f of files) {
      const buf = await processImage(Buffer.from(await f.arrayBuffer()));
      const up = await uploadListingPhoto(admin, id, buf);
      const { error: photoError } = await supabase.from('listing_photos').insert({ listing_id: id, image_path: up.path, image_url: up.url, view_type: 'photo', sort_order: order++ });
      if (photoError) throw new Error('Could not save an uploaded photo: ' + photoError.message);
    }
  } catch (e: any) {
    return json({ error: 'A photo could not be processed or saved: ' + e.message }, 400);
  }

  const { data: photos, error: photosError } = await supabase
    .from('listing_photos').select('id,image_url,sort_order,view_type').eq('listing_id', id).order('sort_order');
  if (photosError) return json({ error: 'Could not load the saved photos: ' + photosError.message }, 500);
  return json({ photos: photos ?? [] });
}
