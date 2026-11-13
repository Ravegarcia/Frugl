import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CARD_SELECT } from '@/lib/queries';
import { BRANDS, CONDITIONS, DEAL_METHODS, RAM_OPTIONS, STORAGE_OPTIONS } from '@/lib/constants';
import { btn, btnOutline, field } from '@/lib/ui';
import ListingCard from '@/components/ListingCard';
import EmptyState from '@/components/EmptyState';

const PAGE_SIZE = 12;
const SCREENS: Record<string, [number, number]> = { small: [0, 13.99], '14': [14, 14.99], '15': [15, 15.99], big: [16, 99] };
const SCREEN_OPTIONS = [
  { value: 'small', label: 'Under 14 in' },
  { value: '14', label: '14 in' },
  { value: '15', label: '15 in (15.6)' },
  { value: 'big', label: '16 in and up' },
];
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

type SP = Record<string, string | undefined>;
const opts = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

function Sel({ name, label, value, options, any = true }: { name: string; label: string; value?: string; options: { value: string; label: string }[]; any?: boolean }) {
  return (
    <label className='block text-sm'>
      {label}
      <select name={name} defaultValue={value ?? ''} className={field}>
        {any && <option value=''>Any</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  await supabase.rpc('release_expired_reservations');

  const clean = (v?: string) => (v ?? '').replace(/[%,()]/g, '').trim();
  const page = Math.max(1, Number(sp.page) || 1);

  let query = supabase
    .from('listings')
    .select(CARD_SELECT, { count: 'exact' })
    .in('status', ['available', 'reserved'])
    .eq('is_visible', true);

  const q = clean(sp.q);
  if (q) query = query.or('title.ilike.%' + q + '%,brand.ilike.%' + q + '%,model.ilike.%' + q + '%');
  if (sp.brand) query = query.eq('brand', sp.brand);
  if (clean(sp.cpu)) query = query.ilike('cpu', '%' + clean(sp.cpu) + '%');
  if (sp.ram) query = query.eq('ram', sp.ram);
  if (sp.storage) query = query.eq('storage', sp.storage);
  if (sp.screen && SCREENS[sp.screen]) query = query.gte('screen_size', SCREENS[sp.screen][0]).lte('screen_size', SCREENS[sp.screen][1]);
  if (sp.condition) query = query.eq('condition', sp.condition);
  if (sp.deal) query = query.contains('deal_methods', [sp.deal]);
  if (Number(sp.min)) query = query.gte('price', Number(sp.min));
  if (Number(sp.max)) query = query.lte('price', Number(sp.max));
  if (clean(sp.location)) query = query.ilike('location', '%' + clean(sp.location) + '%');

  const sort = sp.sort ?? 'newest';
  if (sort === 'price_asc') query = query.order('price', { ascending: true });
  else if (sort === 'price_desc') query = query.order('price', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => v && params.set(k, v));
    params.set('page', String(p));
    return '/laptops?' + params.toString();
  };

  return (
    <div className='browse-page'>
      <header className='browse-intro'>
        <div>
          <p className='browse-eyebrow'>Browse the marketplace</p>
          <h1>Find your next laptop</h1>
          <p className='browse-intro-description'>
            Compare the details that matter, from processor and memory to condition and handover options.
          </p>
        </div>
      </header>

      <div className='browse-layout'>
        <form method='get' className='browse-filters h-fit space-y-3 p-5'>
          <h2 className='browse-filters-heading'>Refine your search</h2>
          <label className='block text-sm'>
            Search
            <input name='q' defaultValue={sp.q ?? ''} className={field} />
          </label>
          <Sel name='brand' label='Brand' value={sp.brand} options={opts(BRANDS)} />
          <label className='block text-sm'>
            CPU contains
            <input name='cpu' defaultValue={sp.cpu ?? ''} placeholder='i5, Ryzen 7, M1' className={field} />
          </label>
          <Sel name='ram' label='RAM' value={sp.ram} options={opts(RAM_OPTIONS)} />
          <Sel name='storage' label='Storage' value={sp.storage} options={opts(STORAGE_OPTIONS)} />
          <Sel name='screen' label='Screen size' value={sp.screen} options={SCREEN_OPTIONS} />
          <Sel name='condition' label='Condition' value={sp.condition} options={CONDITIONS} />
          <Sel name='deal' label='Deal method' value={sp.deal} options={DEAL_METHODS} />
          <div className='grid grid-cols-2 gap-2'>
            <label className='block text-sm'>Min price<input name='min' type='number' defaultValue={sp.min ?? ''} className={field} /></label>
            <label className='block text-sm'>Max price<input name='max' type='number' defaultValue={sp.max ?? ''} className={field} /></label>
          </div>
          <label className='block text-sm'>
            Location
            <input name='location' defaultValue={sp.location ?? ''} placeholder='City or barangay' className={field} />
          </label>
          <Sel name='sort' label='Sort by' value={sort} options={SORTS} any={false} />
          <div className='flex gap-2'>
            <button className={btn}>Apply filters</button>
            <Link href='/laptops' className={btnOutline}>Clear</Link>
          </div>
        </form>

        <section className='browse-results'>
          <div className='browse-results-heading'>
            <div>
              <h2>Available laptops</h2>
              <p>{count ?? 0} laptop{count === 1 ? '' : 's'} found</p>
            </div>
          </div>
          {data && data.length > 0 ? (
            <div className='grid grid-cols-2 gap-4 lg:grid-cols-3'>
              {data.map((l: any) => <ListingCard key={l.id} listing={l} />)}
            </div>
          ) : (
            <EmptyState title='No laptops match your filters' hint='Try removing a filter.' href='/laptops' action='Clear filters' />
          )}
          {pages > 1 && (
            <div className='mt-6 flex items-center justify-center gap-4 text-sm'>
              {page > 1 && <Link href={pageHref(page - 1)} className='underline'>Previous</Link>}
              <span>Page {page} of {pages}</span>
              {page < pages && <Link href={pageHref(page + 1)} className='underline'>Next</Link>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
