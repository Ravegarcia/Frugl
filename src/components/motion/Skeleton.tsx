'use client';

export default function Skeleton({
  className = '',
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`motion-skeleton ${className}`}
      aria-hidden={label ? undefined : true}
      role={label ? 'status' : undefined}
      aria-label={label}
    />
  );
}
