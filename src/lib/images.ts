import 'server-only';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

export function isImage(f: unknown): f is File {
  return typeof f === 'object' && f !== null && 'arrayBuffer' in f && (f as File).size > 0 && String((f as File).type).startsWith('image/');
}

export async function processImage(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  if (!meta.width || !meta.height || meta.width < 200 || meta.height < 200) throw new Error('image is too small');
  return sharp(input)
    .rotate() // apply the camera orientation first
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 }) // new file has no EXIF or GPS data
    .toBuffer();
}

export async function uploadListingPhoto(admin: any, listingId: string, buf: Buffer) {
  const path = listingId + '/' + randomUUID() + '.jpg';
  const { error } = await admin.storage.from('listing-photos').upload(path, buf, { contentType: 'image/jpeg' });
  if (error) throw new Error(error.message);
  const { data } = admin.storage.from('listing-photos').getPublicUrl(path);
  return { path, url: data.publicUrl as string };
}

export async function uploadHintFile(admin: any, userId: string, listingId: string, buf: Buffer, name: string) {
  const path = userId + '/' + listingId + '/' + name + '.jpg';
  const { error } = await admin.storage.from('hint-files').upload(path, buf, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);
  return path;
}
