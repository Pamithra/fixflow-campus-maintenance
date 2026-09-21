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

/**
 * Compresses an image client-side to a web-optimized JPEG data URL (50-100KB)
 * so photos persist reliably across restarts and deploy environments.
 */
export async function compressImageToDataUrl(file: File, maxWidth = 900, maxHeight = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return resolve('');
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve((e.target?.result as string) || '');
        }
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

