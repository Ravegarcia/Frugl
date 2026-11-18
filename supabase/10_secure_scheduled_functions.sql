-- These mutations are invoked through server-only API routes.
revoke execute on function public.increment_views(uuid) from public, anon, authenticated;
grant execute on function public.increment_views(uuid) to service_role;

revoke execute on function public.release_expired_reservations() from public, anon, authenticated;
grant execute on function public.release_expired_reservations() to service_role;
