export { cn } from "cn";

/**
 * Resolves image URLs so that uploads stored as localhost or relative paths
 * are always accessible from mobile phones and deployed environments.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // Strip localhost prefix if stored in database as http://localhost:8080/uploads/...
  let clean = url.replace(/^https?:\/\/localhost(:\d+)?/i, '');

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const backendOrigin = apiBase.replace(/\/api\/?$/i, '').trim();

  if (clean.startsWith('/uploads') || clean.startsWith('uploads/')) {
    if (!clean.startsWith('/')) clean = '/' + clean;
    if (backendOrigin) {
      return `${backendOrigin}${clean}`;
    }
    return clean;
  }

  if (url.includes('localhost') && backendOrigin) {
    return url.replace(/^https?:\/\/localhost(:\d+)?/i, backendOrigin);
  }

  return url;
}
