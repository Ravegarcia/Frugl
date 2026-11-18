import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth';
import { CARD_SELECT_WITH_SAVED } from '@/lib/queries';
import ListingCard from '@/components/ListingCard';
import ListingDetails from '@/components/ListingDetails';
import ListingActions from '@/components/ListingActions';
import { CheckCircle, ShieldCheck } from '@/components/icons';

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getSessionProfile();
  if (!user) redirect('/register?next=' + encodeURIComponent('/laptops/' + id));

  const { data: listing } = await supabase
    .from('listings')
    .select('*, listing_photos(image_url, sort_order), condition_reports(*)')
    .eq('id', id)
    .maybeSingle();
  if (!listing) notFound();
  if (listing.status === 'draft') redirect('/sell/' + id);

  const photos = [...(listing.listing_photos ?? [])]
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((p: any) => p.image_url);
  const report: any = Array.isArray(listing.condition_reports) ? listing.condition_reports[0] : listing.condition_reports;

  const [
    { data: seller, error: sellerError },
    { data: sellerContact, error: sellerContactError },
    { data: sellerReviews },
    { data: sellerListings, error: sellerListingsError },
    { data: moreListings, error: moreListingsError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,name,avatar_url,seller_verified,created_at')
      .eq('id', listing.seller_id)
      .single(),
    supabase
      .from('profiles')
      .select('public_contact_email')
      .eq('id', listing.seller_id)
      .maybeSingle(),
    supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', listing.seller_id),
    supabase
      .from('listings')
      .select(CARD_SELECT_WITH_SAVED)
      .eq('seller_id', listing.seller_id)
      .in('status', ['available', 'reserved'])
      .eq('is_visible', true)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('listings')
      .select(CARD_SELECT_WITH_SAVED)
      .in('status', ['available', 'reserved'])
      .eq('is_visible', true)
      .neq('seller_id', listing.seller_id)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  if (sellerError) throw new Error(`Could not load seller profile: ${sellerError.message}`);
  if (sellerContactError) {
    console.error('Could not load seller public contact email:', sellerContactError.message);
  }
  if (sellerListingsError) {
    throw new Error(`Could not load other listings from this seller: ${sellerListingsError.message}`);
  }
  if (moreListingsError) {
    throw new Error(`Could not load more laptop listings: ${moreListingsError.message}`);
  }
  const sellerProfile = {
    ...seller,
    public_contact_email: sellerContact?.public_contact_email ?? null,
  };

  const sellerReviewCount = sellerReviews?.length ?? 0;
  const sellerRating =
    sellerReviewCount > 0
      ? Number(
          (
            (sellerReviews ?? []).reduce((sum, r) => sum + Number(r.rating ?? 0), 0) /
            sellerReviewCount
          ).toFixed(1)
        )
      : null;

  let saved = false;
  if (user && profile?.role !== 'admin') {
    const res = await supabase.from('saved_listings').select('listing_id').eq('user_id', user.id).eq('listing_id', id).maybeSingle();
    saved = !!res.data;
  }

  const sellerJoinedYear = seller.created_at
    ? new Date(seller.created_at).getUTCFullYear()
    : null;

  const checklist: [string, string][] = report
    ? ([
        ['Battery', report.battery_health],
        ['Screen', report.screen_grade],
        ['Keyboard', report.keyboard_grade],
        ['Hinge', report.hinge_grade],
        ['Ports', report.ports],
        ['Charger', report.charger],
      ].filter(([, v]) => Boolean(v)) as [string, string][])
    : [];

  return (
    <div className='product-page'>
      <style>{`
        .app-body:has(.product-page:not([style*="display: none"]):not([style*="display:none"])):not(:has([style*="display: none"] .product-page)):not(:has([style*="display:none"] .product-page)) .site-footer {
          display: none !important;
        }
        .app-main:has(.product-page:not([style*="display: none"]):not([style*="display:none"])):not(:has([style*="display: none"] .product-page)):not(:has([style*="display:none"] .product-page)) {
          padding-block: 0.75rem 1rem !important;
        }
        .product-page {
          position: fixed;
          top: 6rem;
          bottom: 1rem;
          left: 50%;
          z-index: 1;
          width: min(calc(100vw - 2rem), 80rem);
          transform: translateX(-50%);
        }
        .product-page-grid {
          display: grid;
          height: 100%;
          min-height: 0;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          align-items: stretch;
          gap: 2rem;
        }
        .product-main-col {
          min-width: 0;
          min-height: 0;
          height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding-bottom: 1.5rem;
        }
        .product-side-col {
          position: relative;
          min-width: 0;
          min-height: 0;
          height: 100%;
          max-height: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .product-details-flow { display: flex; flex-direction: column; gap: 0.5rem; }
        .product-gallery { display: flex; flex-direction: column; gap: 0.65rem; }
        .product-gallery-stage { position: relative; width: 100%; max-height: calc(100dvh - 18.35rem); aspect-ratio: 16 / 10; overflow: hidden; border: 1px solid var(--lavender-300); border-radius: 1rem; background: var(--ivory); }
        .product-gallery-stage.is-single-photo { height: max(12rem, calc(100dvh - 14.3rem)); max-height: none; }
        .product-gallery-main-img { display: block; width: 100%; height: 100%; object-fit: contain; object-position: center; }
        .product-gallery-nav { position: absolute; top: 50%; z-index: 2; display: grid; width: 2.35rem; height: 2.35rem; place-items: center; transform: translateY(-50%); border: 1px solid rgba(255,255,255,0.7); border-radius: 9999px; background: rgba(24,13,38,0.68); color: #fff; cursor: pointer; }
        .product-gallery-nav-prev { left: 0.85rem; }
        .product-gallery-nav-next { right: 0.85rem; }
        .product-gallery-dots { position: absolute; bottom: 0.85rem; left: 50%; z-index: 2; display: inline-flex; align-items: center; gap: 0.4rem; transform: translateX(-50%); padding: 0.3rem 0.6rem; border-radius: 9999px; background: rgba(24,13,38,0.55); }
        .product-gallery-dot { width: 0.45rem; height: 0.45rem; padding: 0; border: 0; border-radius: 9999px; background: rgba(255,255,255,0.48); cursor: pointer; }
        .product-gallery-dot.is-active { background: var(--accent); transform: scale(1.22); }
        .product-gallery-counter { position: absolute; right: 0.85rem; bottom: 0.85rem; z-index: 2; border-radius: 9999px; background: rgba(24,13,38,0.72); padding: 0.22rem 0.6rem; color: #fff; font-size: 0.72rem; font-weight: 600; }
        .product-gallery-thumbs { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.15rem; }
        .product-gallery-thumb { flex: 0 0 4.25rem; width: 4.25rem; height: 3.25rem; padding: 0; overflow: hidden; border: 2px solid transparent; border-radius: 0.6rem; background: var(--ivory); cursor: pointer; opacity: 0.72; }
        .product-gallery-thumb.is-active { opacity: 1; border-color: var(--plum-900); }
        .product-gallery-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .product-header-block { display: flex; flex-direction: column; gap: 0.45rem; border-bottom: 1px solid var(--outline-variant); padding-bottom: 0.25rem; }
        .product-title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.65rem; }
        .product-title { margin: 0; color: var(--plum-900); font-family: var(--font-poppins), sans-serif; font-size: clamp(1.25rem, 2.2vw, 1.55rem); font-weight: 600; letter-spacing: -0.02em; line-height: 1.3; }
        .product-price { margin: 0; color: var(--plum-900); font-size: clamp(1.5rem, 2.6vw, 1.95rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.2; }
        .product-listed-meta { margin: 0.1rem 0 0; color: var(--plum-700); font-size: 0.86rem; font-weight: 400; }
        .product-content-section { display: flex; flex-direction: column; gap: 0.75rem; border-bottom: 1px solid var(--outline-variant); padding-bottom: 1.35rem; }
        .product-content-section:last-child { border-bottom: 0; padding-bottom: 0; }
        .product-content-section h2 { margin: 0; color: var(--plum-900); font-family: var(--font-poppins), sans-serif; font-size: 1.02rem; font-weight: 700; letter-spacing: -0.015em; }
        .product-section-title-row { display: flex; align-items: center; gap: 0.6rem; }
        .product-kv-list { display: flex; flex-direction: column; gap: 0.5rem; margin: 0; }
        .product-kv-row { display: grid; grid-template-columns: 12.5rem minmax(0, 1fr); align-items: baseline; gap: 1rem; }
        .product-kv-row dt { color: var(--plum-700); font-size: 0.85rem; font-weight: 400; line-height: 1.5; }
        .product-kv-row dd { margin: 0; color: var(--plum-900); font-size: 0.88rem; font-weight: 600; line-height: 1.5; word-break: break-word; }
        .product-description-text { margin: 0; color: var(--plum-900); font-size: 0.88rem; line-height: 1.65; white-space: pre-wrap; }
        .product-action-card { flex: 0 0 auto; width: 100%; display: flex; flex-direction: column; gap: 0.75rem; border: 1px solid var(--lavender-300); border-radius: 0.9rem; background: var(--surface); padding: 1.2rem 1.25rem; box-shadow: 0 6px 18px rgba(24,13,38,0.04); }
        .product-seller-header { display: flex; align-items: flex-start; gap: 0.75rem; }
        .product-seller-avatar { display: grid; width: 3rem; height: 3rem; flex: 0 0 3rem; place-items: center; overflow: hidden; border-radius: 9999px; border: 1px solid var(--lavender-300); background: var(--lavender-100); color: var(--plum-900); font-size: 0.82rem; font-weight: 700; text-decoration: none; }
        .product-seller-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .product-seller-meta { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
        .product-seller-name-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; }
        .product-seller-name { color: var(--plum-900); font-size: 1rem; font-weight: 700; text-decoration: none; }
        .product-seller-email { overflow-wrap: anywhere; color: var(--plum-700); font-size: 0.9rem; line-height: 1.4; text-decoration: none; }
        .product-seller-email:hover { text-decoration: underline; }
        .product-seller-email.is-private { color: var(--muted-foreground); }
        .product-seller-verified { display: inline-flex; align-items: center; color: var(--success); }
        .product-seller-stats { display: flex; align-items: center; flex-wrap: wrap; gap: 0.55rem; color: var(--plum-900); font-size: 0.8rem; }
        .product-seller-stats > span:not(.product-seller-stats-divider) { display: inline-flex; align-items: baseline; gap: 0.35rem; }
        .product-seller-stat-label, .product-seller-stats-divider { color: var(--muted-foreground); }
        .product-seller-stats strong { color: var(--plum-900); font-weight: 700; }
        .product-seller-divider { width: 100%; margin: 0.1rem 0; border: 0; border-top: 1px solid var(--outline-variant); }
        .product-action-stack { display: flex; flex-direction: column; gap: 0.65rem; }
        .product-action-hint { margin: 0; color: var(--plum-700); font-size: 0.88rem; line-height: 1.4; }
        .product-chat-btn { display: inline-flex; width: 100%; min-height: 2.75rem; align-items: center; justify-content: center; gap: 0.45rem; padding: 0.4rem 0.85rem; font-size: 0.95rem; font-weight: 700; text-decoration: none; cursor: pointer; }
        .product-offer-group { display: grid; grid-template-columns: minmax(0, 1fr) auto; overflow: hidden; border: 1px solid var(--plum-700); border-radius: 0.55rem; background: #fff; }
        .product-offer-input-wrap { display: flex; align-items: center; gap: 0.4rem; min-width: 0; padding-inline: 0.8rem; }
        .product-offer-currency { color: var(--plum-700); font-size: 0.82rem; font-weight: 700; }
        .product-offer-input-wrap input { width: 100%; min-width: 0; height: 2.6rem; border: 0; outline: 0; background: transparent; color: var(--plum-900); font-size: 0.92rem; font-weight: 600; }
        .product-offer-submit { border: 0; border-left: 1px solid var(--plum-700); background: var(--ivory); padding-inline: 1rem; color: var(--plum-900); font-size: 0.86rem; font-weight: 700; white-space: nowrap; cursor: pointer; }
        .product-utility-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem; }
        .product-secondary-btn { display: inline-flex; min-height: 2.45rem; align-items: center; justify-content: center; gap: 0.35rem; border: 1px solid var(--outline-variant); border-radius: 0.5rem; background: #fff; padding: 0.35rem 0.75rem; color: var(--plum-700); font-size: 0.84rem; font-weight: 600; text-decoration: none; cursor: pointer; }
        .product-report-box { display: flex; flex-direction: column; gap: 0.55rem; padding-top: 0.2rem; }
        .product-report-box textarea { width: 100%; border: 1px solid var(--outline-variant); border-radius: 0.5rem; background: #fff; padding: 0.6rem 0.75rem; color: var(--plum-900); font-size: 0.84rem; outline: none; }
        .product-report-submit { min-height: 2.35rem; border: 1px solid var(--plum-900); border-radius: 0.5rem; background: var(--plum-900); color: #fff; font-size: 0.82rem; font-weight: 600; cursor: pointer; }
        .product-action-note { margin: 0; border-radius: 0.5rem; padding: 0.35rem 0.55rem; font-size: 0.72rem; line-height: 1.35; }
        .product-action-note.is-success { border: 1px solid var(--success-border); background: var(--success-container); color: var(--success); }
        .product-action-note.is-error { border: 1px solid var(--error-border); background: var(--error-container); color: var(--destructive); }
        .product-side-card { flex: 1 0 auto; width: 100%; display: flex; flex-direction: column; justify-content: flex-start; gap: 1rem; border: 1px solid var(--lavender-300); border-radius: 0.9rem; background: var(--surface); padding: 1.2rem 1.25rem; box-shadow: 0 6px 18px rgba(24,13,38,0.04); }
        .product-side-card-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .product-side-card-title { display: inline-flex; align-items: center; gap: 0.4rem; margin: 0; color: var(--plum-900); font-family: var(--font-poppins), sans-serif; font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; }
        .product-guide-list { display: flex; flex: 1; flex-direction: column; gap: 0.75rem; justify-content: space-between; margin: 0; padding: 0; list-style: none; }
        .product-guide-item { display: flex; align-items: flex-start; gap: 0.55rem; font-size: 0.9rem; line-height: 1.45; color: var(--plum-700); }
        .product-guide-icon { flex: 0 0 auto; margin-top: 0.15rem; color: var(--success); }
        .product-guide-item strong { color: var(--plum-900); font-weight: 600; }
        @media (max-width: 900px) {
          .product-page { position: static; inset: auto; width: auto; transform: none; }
          .product-page-grid { height: auto; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; }
          .product-main-col { height: auto; max-height: none; overflow: visible; }
          .product-gallery-stage { max-height: none; }
          .product-gallery-stage.is-single-photo { height: auto; }
          .product-details-flow { gap: 1.5rem; }
          .product-side-col { position: static; width: auto; height: auto; max-height: none; gap: 0.9rem; overflow: visible; }
          .product-side-card { flex: 0 0 auto; }
          .product-guide-list { flex: none; justify-content: flex-start; gap: 0.85rem; }
          .product-kv-row { grid-template-columns: 9.5rem minmax(0, 1fr); gap: 0.75rem; }
        }
      `}</style>

      <div className='product-page-grid'>
        <div className='product-main-col'>
          <ListingDetails
            listing={listing}
            photos={photos}
            trackView={profile?.role !== 'admin' && user.id !== listing.seller_id}
            checklist={checklist}
          />

          {sellerListings && sellerListings.length > 0 && (
            <section className='product-similar-section' aria-labelledby='more-from-seller-heading'>
              <div className='product-similar-heading'>
                <h2 id='more-from-seller-heading'>
                  More from {seller.name?.trim() || 'this seller'}
                </h2>
              </div>
              <div className='grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4'>
                {sellerListings.map((item: any) => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>
            </section>
          )}

          <section className='product-similar-section' aria-labelledby='more-listings-heading'>
            <div className='product-similar-heading'>
              <h2 id='more-listings-heading'>More listings</h2>
              <Link href='/laptops' className='product-similar-link'>
                See all laptops
              </Link>
            </div>
            {moreListings && moreListings.length > 0 ? (
              <div className='grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4'>
                {moreListings.map((item: any) => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>
            ) : (
              <p className='product-similar-empty'>No other laptops are available right now.</p>
            )}
          </section>
        </div>

        <aside className='product-side-col'>
          {profile?.role === 'admin' ? (
            <div className='product-action-card'>
              <p className='text-sm text-plum-700'>Marketplace actions are disabled for admin accounts.</p>
              <Link href='/admin/listings' className='text-sm font-semibold text-plum-900 underline'>
                Manage listings
              </Link>
            </div>
          ) : (
            <ListingActions
              listingId={id}
              sellerId={listing.seller_id}
              listingPrice={listing.price}
              status={listing.status}
              userId={user?.id ?? null}
              initialSaved={saved}
              seller={sellerProfile}
              sellerRating={sellerRating}
              sellerReviewCount={sellerReviewCount}
              sellerJoinedYear={sellerJoinedYear}
            />
          )}

          {/* Buyer inspection guide */}
          <section className='product-side-card' aria-label='Buyer inspection guide'>
            <div className='product-side-card-header'>
              <h2 className='product-side-card-title'>
                <ShieldCheck size={18} />
                Buyer inspection guide
              </h2>
            </div>

            <ul className='product-guide-list'>
              <li className='product-guide-item'>
                <span className='product-guide-icon'>
                  <CheckCircle size={16} variant='solid' />
                </span>
                <span>
                  <strong>Verify specs:</strong> Confirm the processor, memory, storage, and graphics in system settings.
                </span>
              </li>
              <li className='product-guide-item'>
                <span className='product-guide-icon'>
                  <CheckCircle size={16} variant='solid' />
                </span>
                <span>
                  <strong>Check screen &amp; hinges:</strong> Look for dead pixels, uneven lighting, or loose hinges.
                </span>
              </li>
              <li className='product-guide-item'>
                <span className='product-guide-icon'>
                  <CheckCircle size={16} variant='solid' />
                </span>
                <span>
                  <strong>Test battery &amp; charger:</strong> Check battery health and confirm it charges.
                </span>
              </li>
              <li className='product-guide-item'>
                <span className='product-guide-icon'>
                  <CheckCircle size={16} variant='solid' />
                </span>
                <span>
                  <strong>Test the basics:</strong> Try the keyboard, trackpad, ports, Wi-Fi, camera, and speakers.
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
