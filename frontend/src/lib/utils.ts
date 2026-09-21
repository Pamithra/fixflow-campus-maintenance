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

/**
 * Returns a realistic equipment fallback image matching the trade category
 * so users never see a dark empty box if an uploaded image 404s.
 */
export function getCategoryFallbackPhoto(category?: string, equipmentName?: string): string {
  const text = `${category || ''} ${equipmentName || ''}`.toUpperCase();
  if (text.includes('NET') || text.includes('WIFI') || text.includes('ROUTER') || text.includes('AP')) {
    return 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80';
  }
  if (text.includes('AC') || text.includes('HVAC') || text.includes('COOL') || text.includes('AIR')) {
    return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80';
  }
  if (text.includes('PROJ') || text.includes('DISPLAY') || text.includes('SCREEN')) {
    return 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&q=80';
  }
  if (text.includes('PC') || text.includes('COMPUT') || text.includes('LAB') || text.includes('WORKSTATION')) {
    return 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&q=80';
  }
  if (text.includes('ELEC') || text.includes('LIGHT') || text.includes('POWER') || text.includes('BULB')) {
    return 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&q=80';
  }
  if (text.includes('PLUMB') || text.includes('WATER') || text.includes('PIPE') || text.includes('WASHROOM')) {
    return 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&q=80';
  }
  if (text.includes('FURN') || text.includes('CHAIR') || text.includes('DESK')) {
    return 'https://images.unsplash.com/photo-1580481077197-2a4c2a472a15?w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80';
}

export function getCategorySvgFallback(category?: string): string {
  const label = (category || 'Campus Equipment').slice(0, 24);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="none">
    <rect width="600" height="400" fill="#0f172a"/>
    <rect x="20" y="20" width="560" height="360" rx="12" stroke="#334155" stroke-dasharray="8 8" stroke-width="2"/>
    <circle cx="300" cy="170" r="44" fill="#1e293b" stroke="#6366f1" stroke-width="3"/>
    <path d="M288 170h24M300 158v24" stroke="#818cf8" stroke-width="3" stroke-linecap="round"/>
    <text x="300" y="250" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" fill="#f8fafc" text-anchor="middle">${label}</text>
    <text x="300" y="280" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#94a3b8" text-anchor="middle">FixFlow Verified Equipment Record</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

