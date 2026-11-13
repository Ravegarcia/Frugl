'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, UploadCloud, X, AlertCircle, Loader2 } from '@/components/icons';
import { resizeImage } from '@/lib/client-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BRANDS } from '@/lib/constants';

interface PhotoItem {
  file: File;
  previewUrl: string;
}

export default function SellForm() {
  const router = useRouter();

  // Photo states
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [sticker, setSticker] = useState<PhotoItem | null>(null);

  // Optional seller hints
  const [brand, setBrand] = useState('');
  const [series, setSeries] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseYear, setPurchaseYear] = useState('');
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [notes, setNotes] = useState('');

  // Optional image hints
  const [systemInfoImage, setSystemInfoImage] = useState<File | null>(null);
  const [receiptOrBoxImage, setReceiptOrBoxImage] = useState<File | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  // Handle general photos upload (up to 10)
  async function handlePhotosAdd(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    const availableSlots = 10 - photos.length;
    if (availableSlots <= 0) {
      setError('You can upload a maximum of 10 photos.');
      return;
    }

    setError('');
    const toProcess = incoming.slice(0, availableSlots);
    const newItems: PhotoItem[] = [];

    for (const f of toProcess) {
      try {
        const resized = await resizeImage(f, 1280, 0.85);
        newItems.push({
          file: resized,
          previewUrl: URL.createObjectURL(resized),
        });
      } catch {
        newItems.push({
          file: f,
          previewUrl: URL.createObjectURL(f),
        });
      }
    }

    setPhotos((prev) => [...prev, ...newItems]);
    e.target.value = '';
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  }

  // Handle sticker photo
  async function handleStickerChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return;
    const f = e.target.files[0];
    try {
      const resized = await resizeImage(f, 1280, 0.9);
      if (sticker) URL.revokeObjectURL(sticker.previewUrl);
      setSticker({ file: resized, previewUrl: URL.createObjectURL(resized) });
    } catch {
      setSticker({ file: f, previewUrl: URL.createObjectURL(f) });
    }
  }

  // Form submit -> /api/identify -> /sell/[id]
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (photos.length === 0 && !sticker) {
      setError('Please add at least one photo of the laptop to identify it.');
      return;
    }

    setLoading(true);
    setError('');
    setStatusMessage('Uploading and analyzing photos with AI assistant...');

    try {
      const formData = new FormData();
      photos.forEach((p) => formData.append('photos', p.file));
      if (sticker) formData.append('sticker', sticker.file);

      // Add hints if provided
      if (brand) formData.append('brand', brand);
      if (series) formData.append('series', series);
      if (modelNumber) formData.append('modelNumber', modelNumber);
      if (serialNumber) formData.append('serialNumber', serialNumber);
      if (purchaseYear) formData.append('purchaseYear', purchaseYear);
      if (cpu) formData.append('cpu', cpu);
      if (ram) formData.append('ram', ram);
      if (storage) formData.append('storage', storage);
      if (notes) formData.append('notes', notes);

      if (systemInfoImage) formData.append('systemInfoImage', systemInfoImage);
      if (receiptOrBoxImage) formData.append('receiptOrBoxImage', receiptOrBoxImage);

      const res = await fetch('/api/identify', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to identify laptop and create draft.');
      }

      setStatusMessage('Identification complete! Redirecting to draft review...');
      router.push(`/sell/${data.draftListingId}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong during identification.');
      setLoading(false);
      setStatusMessage('');
    }
  }

  // Skip AI manual entry option
  async function handleSkipAI() {
    setLoading(true);
    try {
      const res = await fetch('/api/listings', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create blank draft.');
      router.push(`/sell/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Could not create listing.');
      setLoading(false);
    }
  }

  return (
    <div className='mx-auto max-w-3xl space-y-8 py-4'>
      <div>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold tracking-tight text-gray-900'>Sell a laptop</h1>
          <button
            type='button'
            onClick={handleSkipAI}
            disabled={loading}
            className='text-sm text-gray-500 underline hover:text-primary'
          >
            Skip AI, enter manually
          </button>
        </div>
        <p className='mt-1 text-sm text-gray-600'>
          Step 1: Upload photos of your laptop. Our AI will automatically detect the brand, series, model, and key specs to prepare a draft for you.
        </p>
      </div>

      {error && (
        <div className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          <AlertCircle size={18} className='shrink-0' />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className='flex items-center gap-3 rounded-xl border border-lavender-300 bg-lavender-100 p-4 text-sm text-primary'>
          <Loader2 size={18} className='animate-spin shrink-0' />
          <span>{statusMessage || 'Processing...'}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* PHOTO UPLOAD SECTION */}
        <div className='rounded-xl border bg-white p-6 shadow-sm space-y-4'>
          <h2 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
            <Camera size={20} className='text-plum-700' />
            1. Laptop Photos (Up to 10)
          </h2>
          <p className='text-xs text-gray-500'>
            Tip: Include angles of the closed lid, open keyboard/screen, and ports. The first photo will be your listing cover.
          </p>

          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5'>
            {photos.map((item, idx) => (
              <div key={idx} className='group relative aspect-[4/3] rounded-lg overflow-hidden border bg-gray-100'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt='Upload preview' className='h-full w-full object-cover' />
                {idx === 0 && (
                  <span className='absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white'>
                    Cover
                  </span>
                )}
                <button
                  type='button'
                  onClick={() => removePhoto(idx)}
                  aria-label={`Remove photo ${idx + 1}`}
                  className='absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90'
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {photos.length < 10 && (
              <label className='flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition'>
                <UploadCloud size={24} className='text-gray-400' />
                <span className='mt-1 text-xs text-gray-600'>Add Photo</span>
                <input
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  multiple
                  onChange={handlePhotosAdd}
                  className='hidden'
                  disabled={loading}
                />
              </label>
            )}
          </div>

          {/* Model Sticker Close-up */}
          <div className='mt-4 rounded-xl border border-dashed border-lavender-300 bg-lavender-100/60 p-4'>
            <Label className='flex items-center gap-2 font-medium text-primary'>
              Underside / Model Sticker Photo (Recommended)
            </Label>
            <p className='text-xs text-gray-600 mt-0.5'>
              A clear photo of the model sticker or barcode label on the bottom helps the AI extract the exact model number.
            </p>
            <div className='mt-2 flex items-center gap-4'>
              {sticker ? (
                <div className='relative h-16 w-24 rounded border overflow-hidden bg-white'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sticker.previewUrl} alt='Sticker' className='h-full w-full object-cover' />
                  <button
                    type='button'
                    aria-label='Remove sticker photo'
                    onClick={() => {
                      URL.revokeObjectURL(sticker.previewUrl);
                      setSticker(null);
                    }}
                    className='absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white'
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className='inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-input bg-surface px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-secondary'>
                  <Camera size={16} />
                  <span>Upload Sticker Close-up</span>
                  <input
                    type='file'
                    accept='image/jpeg,image/png,image/webp'
                    onChange={handleStickerChange}
                    className='hidden'
                    disabled={loading}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* OPTIONAL DETAILS ACCORDION/SECTION */}
        <div className='rounded-xl border bg-white p-6 shadow-sm space-y-4'>
          <div>
            <h2 className='text-lg font-semibold text-gray-900'>2. Optional Descriptive Details</h2>
            <p className='text-xs text-gray-500'>
              All fields below are completely optional. Supplying hints helps the AI verify specs and narrow down exact variants.
            </p>
          </div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='brand'>Brand</Label>
              <select
                id='brand'
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className='w-full rounded-md border bg-white px-3 py-2 text-sm'
              >
                <option value=''>Auto-detect or Select Brand</option>
                {BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='series'>Series (e.g. ThinkPad T14, XPS 13)</Label>
              <Input
                id='series'
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                placeholder='e.g. IdeaPad 3, Pavilion 15'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='modelNumber'>Model / Part Number</Label>
              <Input
                id='modelNumber'
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder='e.g. 15ITL6, A2337'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='serialNumber'>Serial Number / Service Tag</Label>
              <Input
                id='serialNumber'
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder='Underside barcode serial'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='cpu'>Processor / CPU</Label>
              <Input
                id='cpu'
                value={cpu}
                onChange={(e) => setCpu(e.target.value)}
                placeholder='e.g. Intel Core i5-1135G7, M1'
              />
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='ram'>RAM</Label>
                <Input
                  id='ram'
                  value={ram}
                  onChange={(e) => setRam(e.target.value)}
                  placeholder='8GB, 16GB'
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='storage'>Storage</Label>
                <Input
                  id='storage'
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  placeholder='256GB, 512GB'
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='purchaseYear'>Year of Purchase</Label>
              <Input
                id='purchaseYear'
                type='number'
                value={purchaseYear}
                onChange={(e) => setPurchaseYear(e.target.value)}
                placeholder='e.g. 2022'
              />
            </div>
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='notes'>Notes / Accessories / Condition Comments</Label>
            <Textarea
              id='notes'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='e.g. Comes with original 65W charger, upgraded to 16GB RAM, slight scuff on lid'
              rows={3}
            />
          </div>

          <div className='grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 text-xs'>
            <div className='space-y-1'>
              <Label className='text-xs text-gray-700'>System Info Screenshot (Optional)</Label>
              <input
                type='file'
                accept='image/*'
                onChange={(e) => setSystemInfoImage(e.target.files?.[0] || null)}
                className='w-full text-xs text-gray-500 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs'
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-xs text-gray-700'>Receipt / Box Photo (Optional)</Label>
              <input
                type='file'
                accept='image/*'
                onChange={(e) => setReceiptOrBoxImage(e.target.files?.[0] || null)}
                className='w-full text-xs text-gray-500 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs'
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className='flex items-center justify-between'>
          <p className='text-xs text-gray-500'>
            Next step: Review auto-filled specs with live preview before publishing.
          </p>
          <Button
            type='submit'
            size='lg'
            disabled={loading}
            className='min-w-[160px]'
          >
            {loading ? (
              <>
                <Loader2 size={16} className='animate-spin mr-2' />
                Analyzing...
              </>
            ) : (
              'Continue to Draft'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
