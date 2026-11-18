const REDIRECT_BASE = 'https://frugl.invalid';

export function safeRedirectPath(value?: string | null) {
  const path = value?.trim();
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return '/';

  try {
    const url = new URL(path, REDIRECT_BASE);
    if (url.origin !== REDIRECT_BASE) return '/';
    const safePath = `${url.pathname}${url.search}${url.hash}`;
    if (!safePath.startsWith('/') || safePath.startsWith('//') || safePath.includes('\\')) return '/';
    return safePath;
  } catch {
    return '/';
  }
}
