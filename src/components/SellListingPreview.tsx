import { conditionLabel, formatPrice } from '@/lib/constants';
import { Laptop } from '@/components/icons';

type PreviewSpec = {
  label: string;
  value?: string | number | null;
};

type Props = {
  title?: string;
  price?: string | number | null;
  condition?: string;
  location?: string;
  description?: string;
  photos: string[];
  specs?: PreviewSpec[];
  sellerName?: string;
};

export default function SellListingPreview({
  title,
  price,
  condition,
  location,
  description,
  photos,
  specs = [],
  sellerName = 'Your profile',
}: Props) {
  const visibleSpecs = specs
    .filter((spec) => spec.value !== undefined && spec.value !== null && String(spec.value).trim())
    .slice(0, 4);
  const formattedPrice = formatPrice(price);

  return (
    <div className='listing-preview-card'>
      <div className='listing-preview-media'>
        {photos[0] ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={photos[0]} alt={title || 'Laptop preview'} />
        ) : (
          <div className='listing-preview-placeholder'>
            <Laptop size={36} />
            <span>Add photos to preview your laptop</span>
          </div>
        )}
        {photos.length > 1 && (
          <span className='listing-preview-photo-count'>1 / {photos.length}</span>
        )}
      </div>

      <div
        className='listing-preview-info'
        role='region'
        aria-label='Listing preview details'
        tabIndex={0}
      >
        <div>
          <h2 className='listing-preview-title'>{title?.trim() || 'Your laptop title'}</h2>
          <p className='listing-preview-price'>{formattedPrice || 'Price'}</p>
          <p className='listing-preview-location'>
            {location ? `Draft listing in ${location}` : 'Draft listing'}
          </p>
        </div>

        {(condition || visibleSpecs.length > 0) && (
          <section className='listing-preview-section'>
            <h3>Details</h3>
            {condition && <p>{conditionLabel(condition)}</p>}
            {visibleSpecs.length > 0 && (
              <dl>
                {visibleSpecs.map((spec) => (
                  <div key={spec.label}>
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}

        <section className='listing-preview-section listing-preview-description'>
          <h3>Description</h3>
          <p>{description?.trim() || 'Description will appear here.'}</p>
        </section>

        <div className='listing-preview-seller'>
          <h3>Seller information</h3>
          <div>
            <span aria-hidden='true'>{sellerName.trim().charAt(0).toUpperCase() || 'Y'}</span>
            <strong>{sellerName}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
