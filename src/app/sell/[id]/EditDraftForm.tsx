'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Eye, CheckCircle2, AlertCircle, Loader2, UploadCloud, RefreshCw } from 'lucide-react';
import { CONDITIONS, DEAL_METHODS, BRANDS, formatPrice } from '@/lib/constants';
import { CHECKLIST_ITEMS, suggestCondition } from '@/lib/condition';
import { buildDescription, type DescStyle } from '@/lib/description';
import { resizeImage } from '@/lib/client-image';
import ListingDetails from '@/components/ListingDetails';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  initialListing: any;
  catalogModels: any[];
  userLocation: string;
}

export default function EditDraftForm({ initialListing, catalogModels, userLocation }: Props) {
  const router = useRouter();

  // Core listing state
  const [title, setTitle] = useState(initialListing.title || '');
  const [price, setPrice] = useState(initialListing.price ? String(initialListing.price) : '');
  const [condition, setCondition] = useState(initialListing.condition || '');
  const [brand, setBrand] = useState(initialListing.brand || '');
  const [model, setModel] = useState(initialListing.model || '');
  const [description, setDescription] = useState(initialListing.description || '');
  const [dealMethods, setDealMethods] = useState<string[]>(initialListing.deal_methods || ['public_meetup']);
  const [location, setLocation] = useState(initialListing.location || userLocation || '');
  const [addressDetail, setAddressDetail] = useState(initialListing.address_detail || '');

  // Specs
  const [cpu, setCpu] = useState(initialListing.cpu || '');
  const [gpu, setGpu] = useState(initialListing.gpu || '');
  const [ram, setRam] = useState(initialListing.ram || '');
  const [storage, setStorage] = useState(initialListing.storage || '');
  const [screenSize, setScreenSize] = useState(initialListing.screen_size ? String(initialListing.screen_size) : '');

  // Photos
  const [photos, setPhotos] = useState<any[]>(
    [...(initialListing.listing_photos || [])].sort((a, b) => a.sort_order - b.sort_order)
  );

  // Price suggestion from server
  const [priceSuggestion, setPriceSuggestion] = useState<any>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Condition checklist modal/panel
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistValues, setChecklistValues] = useState<Record<string, string>>({
    battery_health: initialListing.condition_reports?.[0]?.battery_health || '',
    screen_grade: initialListing.condition_reports?.[0]?.screen_grade || '',
    keyboard_grade: initialListing.condition_reports?.[0]?.keyboard_grade || '',
    hinge_grade: initialListing.condition_reports?.[0]?.hinge_grade || '',
    ports: initialListing.condition_reports?.[0]?.ports || '',
    charger: initialListing.condition_reports?.[0]?.charger || '',
  });

  // UI state
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Identification results tier
  const ident = initialListing.identification_results?.[0];
  const aiTier = ident?.tier;

  // Auto-fetch price suggestion when modelId or condition changes
  useEffect(() => {
    async function fetchPrice() {
      if (!initialListing.model_id) return;
      setLoadingPrice(true);
      try {
        const res = await fetch(`/api/price-suggestion?modelId=${initialListing.model_id}&condition=${condition || 'like_new'}`);
        if (res.ok) {
          const d = await res.json();
          setPriceSuggestion(d.suggestion);
        }
      } catch {
        // Ignore price fetch errors
      } finally {
        setLoadingPrice(false);
      }
    }
    fetchPrice();
  }, [initialListing.model_id, condition]);

  // Handle deal method toggle
  function toggleDealMethod(m: string) {
    setDealMethods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  // Handle condition checklist update
  function updateChecklist(key: string, val: string) {
    const updated = { ...checklistValues, [key]: val };
    setChecklistValues(updated);
    const suggested = suggestCondition(updated);
    if (suggested) {
      setCondition(suggested);
    }
  }

  // Apply description template
  function applyDescTemplate(style: DescStyle) {
    const text = buildDescription(style, {
      brand,
      model,
      cpu,
      gpu,
      ram,
      storage,
      screen_size: screenSize,
    });
    if (text) setDescription(text);
  }

  // Add photos directly to this listing
  async function handleAddPhoto(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 10) {
      setError('A listing can have at most 10 photos.');
      return;
    }
    setUploadingPhoto(true);
    setError('');
    try {
      const formData = new FormData();
      for (const f of files) {
        const resized = await resizeImage(f, 1280, 0.85);
        formData.append('photos', resized);
      }
      const res = await fetch(`/api/listings/${initialListing.id}/photos`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload photo.');
      setPhotos(data.photos || []);
    } catch (err: any) {
      setError(err.message || 'Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

  // Save current progress as draft
  async function saveDraft() {
    setSavingDraft(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = {
        title,
        price: price ? Number(price) : null,
        condition: condition || null,
        brand,
        model,
        description,
        deal_methods: dealMethods,
        location,
        address_detail: addressDetail,
        cpu,
        gpu,
        ram,
        storage,
        screen_size: screenSize ? Number(screenSize) : null,
      };

      const res = await fetch(`/api/listings/${initialListing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save draft.');
      }
      setSuccessMsg('Draft saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Save failed.');
    } finally {
      setSavingDraft(false);
    }
  }

  // Publish listing
  async function publishListing() {
    setPublishing(true);
    setError('');
    setSuccessMsg('');

    // First save all latest field edits
    try {
      const payload = {
        title,
        price: price ? Number(price) : null,
        condition: condition || null,
        brand,
        model,
        description,
        deal_methods: dealMethods,
        location,
        address_detail: addressDetail,
        cpu,
        gpu,
        ram,
        storage,
        screen_size: screenSize ? Number(screenSize) : null,
      };

      await fetch(`/api/listings/${initialListing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Call publish endpoint (validates required fields)
      const pubRes = await fetch(`/api/listings/${initialListing.id}/publish`, {
        method: 'POST',
      });
      const pubData = await pubRes.json();
      if (!pubRes.ok) {
        throw new Error(pubData.error || 'Please fill in all required fields.');
      }

      router.push(`/laptops/${initialListing.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Could not publish listing.');
      setPublishing(false);
    }
  }

  // Listing state prepared for the Live Preview
  const previewListing = {
    ...initialListing,
    title,
    price: price ? Number(price) : null,
    condition,
    brand,
    model,
    description,
    deal_methods: dealMethods,
    location,
    cpu,
    gpu,
    ram,
    storage,
    screen_size: screenSize,
  };
  const photoUrls = photos.map((p) => p.image_url);

  return (
    <div className='space-y-4'>
      {/* Top Banner & Mobile Preview Toggle */}
      <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
        <div>
          <h1 className='text-xl font-bold text-gray-900'>Edit listing draft</h1>
          <p className='text-xs text-gray-500'>
            Review and adjust the details. What you see on the preview is what buyers see.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setMobileTab(mobileTab === 'form' ? 'preview' : 'form')}
            className='inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium md:hidden'
          >
            <Eye size={14} />
            {mobileTab === 'form' ? 'View Preview' : 'Back to Form'}
          </button>
          <Button
            variant='outline'
            size='sm'
            onClick={saveDraft}
            disabled={savingDraft || publishing}
          >
            {savingDraft ? 'Saving...' : 'Save draft'}
          </Button>
          <Button
            size='sm'
            onClick={publishListing}
            disabled={savingDraft || publishing}
            className='bg-emerald-700 hover:bg-emerald-800 text-white'
          >
            {publishing ? (
              <>
                <Loader2 size={14} className='animate-spin mr-1.5' />
                Publishing...
              </>
            ) : (
              'Publish listing'
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
          <AlertCircle size={16} className='shrink-0' />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className='flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'>
          <CheckCircle2 size={16} className='shrink-0' />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Dual-Column Grid */}
      <div className='grid gap-8 md:grid-cols-2'>
        {/* LEFT COLUMN: EDIT FORM */}
        <div className={`space-y-6 ${mobileTab === 'preview' ? 'hidden md:block' : 'block'}`}>
          {/* AI Banner if auto-filled */}
          {aiTier && (
            <div className='flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900'>
              <Sparkles size={16} className='text-emerald-700 shrink-0' />
              <span>
                {aiTier === 'auto'
                  ? 'AI high confidence: Specs and title were auto-filled from the catalog. Please verify.'
                  : 'AI suggested matches: Review the specs below and adjust if needed.'}
              </span>
            </div>
          )}

          {/* Photos manager */}
          <div className='rounded-xl border bg-white p-4 space-y-3'>
            <div className='flex items-center justify-between'>
              <Label className='font-semibold'>Photos ({photos.length}/10)</Label>
              <label className='cursor-pointer text-xs font-medium text-emerald-700 hover:underline flex items-center gap-1'>
                <UploadCloud size={14} />
                <span>Add more photos</span>
                <input
                  type='file'
                  accept='image/*'
                  multiple
                  onChange={handleAddPhoto}
                  className='hidden'
                  disabled={uploadingPhoto || photos.length >= 10}
                />
              </label>
            </div>
            <div className='grid grid-cols-4 gap-2'>
              {photos.map((p, idx) => (
                <div key={p.id || idx} className='relative aspect-[4/3] rounded border bg-gray-50 overflow-hidden'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt='' className='h-full w-full object-cover' />
                  {idx === 0 && (
                    <span className='absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] text-white'>
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Title & Price */}
          <div className='rounded-xl border bg-white p-4 space-y-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='title'>Listing Title <span className='text-red-500'>*</span></Label>
              <Input
                id='title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. Lenovo ThinkPad T14 Gen 2 i5 16GB/512GB'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='price'>Price in PHP (₱) <span className='text-red-500'>*</span></Label>
              <Input
                id='price'
                type='number'
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder='e.g. 25000'
              />
              {/* Suggested Price Card */}
              {loadingPrice && (
                <p className='text-xs text-gray-400'>Calculating fair price suggestion...</p>
              )}
              {priceSuggestion && (
                <div className='rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5 text-xs text-emerald-900'>
                  <span className='font-semibold'>Suggested Fair Price Range: </span>
                  {formatPrice(priceSuggestion.low)} – {formatPrice(priceSuggestion.high)}
                  <span className='text-gray-500 ml-1'>
                    (Median: {formatPrice(priceSuggestion.median)})
                  </span>
                  <button
                    type='button'
                    onClick={() => setPrice(String(priceSuggestion.median))}
                    className='ml-2 text-emerald-700 underline font-medium'
                  >
                    Use median
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Condition Selector & Checklist */}
          <div className='rounded-xl border bg-white p-4 space-y-3'>
            <div className='flex items-center justify-between'>
              <Label>Condition <span className='text-red-500'>*</span></Label>
              <button
                type='button'
                onClick={() => setShowChecklist(!showChecklist)}
                className='text-xs text-emerald-700 underline'
              >
                {showChecklist ? 'Hide condition checklist' : 'Use guided checklist'}
              </button>
            </div>

            {/* Radio / pill selector */}
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  type='button'
                  onClick={() => setCondition(c.value)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition ${
                    condition === c.value
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Optional Condition Checklist Accordion */}
            {showChecklist && (
              <div className='rounded-lg border bg-gray-50 p-3 text-xs space-y-2 mt-2'>
                <p className='font-medium text-gray-800'>Guided Condition Assessment:</p>
                <div className='grid grid-cols-2 gap-2'>
                  {CHECKLIST_ITEMS.map((item) => (
                    <div key={item.key} className='space-y-1'>
                      <span className='text-gray-600 font-medium'>{item.label}</span>
                      <select
                        value={checklistValues[item.key] || ''}
                        onChange={(e) => updateChecklist(item.key, e.target.value)}
                        className='w-full rounded border bg-white px-2 py-1 text-xs'
                      >
                        <option value=''>Unchecked</option>
                        <option value='good'>Good / Like New</option>
                        <option value='fair'>Fair / Normal Wear</option>
                        <option value='poor'>Poor / Issues</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Model & Specs (Autofilled / Editable) */}
          <div className='rounded-xl border bg-white p-4 space-y-4'>
            <h3 className='text-sm font-semibold text-gray-900'>Specs & Hardware Details</h3>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <Label htmlFor='brand'>Brand <span className='text-red-500'>*</span></Label>
                <select
                  id='brand'
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className='w-full rounded-md border bg-white px-3 py-2 text-xs'
                >
                  <option value=''>Select brand</option>
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className='space-y-1'>
                <Label htmlFor='model'>Model / Series <span className='text-red-500'>*</span></Label>
                <Input
                  id='model'
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder='e.g. Latitude 5420'
                  className='text-xs'
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <Label htmlFor='cpu'>CPU</Label>
                <Input
                  id='cpu'
                  value={cpu}
                  onChange={(e) => setCpu(e.target.value)}
                  placeholder='e.g. Core i5-1135G7'
                  className='text-xs'
                />
              </div>
              <div className='space-y-1'>
                <Label htmlFor='gpu'>GPU</Label>
                <Input
                  id='gpu'
                  value={gpu}
                  onChange={(e) => setGpu(e.target.value)}
                  placeholder='e.g. Intel Iris Xe / RTX 3050'
                  className='text-xs'
                />
              </div>
            </div>

            <div className='grid grid-cols-3 gap-2'>
              <div className='space-y-1'>
                <Label htmlFor='ram'>RAM</Label>
                <Input
                  id='ram'
                  value={ram}
                  onChange={(e) => setRam(e.target.value)}
                  placeholder='8GB, 16GB'
                  className='text-xs'
                />
              </div>
              <div className='space-y-1'>
                <Label htmlFor='storage'>Storage</Label>
                <Input
                  id='storage'
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  placeholder='256GB, 512GB'
                  className='text-xs'
                />
              </div>
              <div className='space-y-1'>
                <Label htmlFor='screenSize'>Screen (in)</Label>
                <Input
                  id='screenSize'
                  value={screenSize}
                  onChange={(e) => setScreenSize(e.target.value)}
                  placeholder='14.0'
                  className='text-xs'
                />
              </div>
            </div>
          </div>

          {/* Description & Deal Methods */}
          <div className='rounded-xl border bg-white p-4 space-y-4'>
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='description'>Description <span className='text-red-500'>*</span></Label>
                <div className='flex gap-1.5 text-xs text-emerald-700'>
                  <span>Template:</span>
                  <button type='button' onClick={() => applyDescTemplate('simple')} className='underline'>Simple</button>
                  <span>·</span>
                  <button type='button' onClick={() => applyDescTemplate('bullets')} className='underline'>Bullets</button>
                </div>
              </div>
              <Textarea
                id='description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder='Detailed condition, battery performance, included accessories...'
              />
            </div>

            <div className='space-y-2'>
              <Label>Deal Methods <span className='text-red-500'>*</span></Label>
              <div className='flex flex-wrap gap-2'>
                {DEAL_METHODS.map((d) => (
                  <button
                    key={d.value}
                    type='button'
                    onClick={() => toggleDealMethod(d.value)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                      dealMethods.includes(d.value)
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <Label htmlFor='location'>City / Barangay <span className='text-red-500'>*</span></Label>
                <Input
                  id='location'
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder='e.g. Quezon City, Manila'
                />
              </div>
              <div className='space-y-1'>
                <Label htmlFor='addressDetail'>Exact Landmark / Address (Private)</Label>
                <Input
                  id='addressDetail'
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  placeholder='Shown only upon reservation'
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW */}
        <div className={`space-y-3 ${mobileTab === 'form' ? 'hidden md:block' : 'block'}`}>
          <div className='flex items-center justify-between pb-1'>
            <h2 className='text-sm font-semibold uppercase tracking-wider text-gray-500'>
              Live Buyer Preview
            </h2>
            <span className='text-xs text-gray-400'>Updates in real time</span>
          </div>

          <div className='sticky top-20 rounded-2xl border bg-white p-5 shadow-sm'>
            <ListingDetails
              listing={previewListing}
              photos={photoUrls}
              seller={{
                id: initialListing.seller_id,
                name: 'You (Preview)',
                seller_verified: true,
              }}
            >
              {priceSuggestion && (
                <div className='rounded-xl border bg-white p-3 text-sm'>
                  <p className='font-medium text-emerald-800'>Estimated Market Price</p>
                  <p className='text-xs text-gray-500'>
                    Typical range: {formatPrice(priceSuggestion.low)} – {formatPrice(priceSuggestion.high)}
                  </p>
                </div>
              )}
            </ListingDetails>
          </div>
        </div>
      </div>
    </div>
  );
}
