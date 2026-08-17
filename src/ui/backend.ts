/**
 * Backend image endpoint (/api/image) detection and URL building.
 *
 * The app can deploy into two kinds of environments:
 *  - With backend: Vercel (api/) or Cloudflare Pages (functions/) provide server-side rendering at /api/image
 *  - Pure static: e.g. GitHub Pages, no serverless functions, /api/image only returns 404 or HTML,
 *    in which case the "Copy image link" button that depends on it should be hidden.
 */

/** Image endpoint base URL in the same directory as the current page (compatible with subpath deploy, e.g. /repo/) */
export function imageApiBase(): string {
  const dir = location.pathname.replace(/[^/]*$/, '');
  return location.origin + dir + 'api/image';
}

/** The full URL actually used by "Copy image link" (matches /api/image endpoint params) */
export function copyImageLinkUrl(query: string, size: number): string {
  return imageApiBase() + '?' + query + '&format=png&size=' + size;
}

/**
 * Probe whether the /api/image endpoint is available.
 * - Real backend: returns an image with a Content-Type starting with image/ (a minimal SVG probe is used here, low cost)
 * - Pure static: 404 / HTML, or the SPA-fallback text/html → false
 * Timeout or network error → false (better to hide the button than let the user copy a dead link).
 */
export function probeImageApi(timeoutMs = 6000): Promise<boolean> {
  if (typeof fetch === 'undefined') return Promise.resolve(false);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const probeUrl = imageApiBase() + '?ring=40&rolling=8&pen=10,2,000000&format=svg&size=64';
  return fetch(probeUrl, { signal: ctrl.signal, cache: 'no-store' })
    .then((res) => {
      if (!res.ok) return false;
      const ct = res.headers.get('content-type') ?? '';
      return ct.startsWith('image/');
    })
    .catch(() => false)
    .finally(() => clearTimeout(timer));
}