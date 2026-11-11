export async function resizeImage(file: File, max = 1280, quality = 0.8): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('resize failed'))), 'image/jpeg', quality)
  );
  return new File([blob], file.name.split('.')[0] + '.jpg', { type: 'image/jpeg' });
}
