/**
 * 后台图片端点（/api/image）探测与 URL 构建。
 *
 * 应用可部署在两类环境：
 *  - 带后台：Vercel（api/）或 Cloudflare Pages（functions/）提供 /api/image 服务端渲染
 *  - 纯静态：如 GitHub Pages，没有 serverless 函数，/api/image 只会返回 404 或 HTML，
 *    此时依赖它的"复制图片链接"按钮不可用，应隐藏。
 */

/** 与当前页面同目录的图片端点基础 URL（兼容子路径部署，如 /repo/） */
export function imageApiBase(): string {
  const dir = location.pathname.replace(/[^/]*$/, '');
  return location.origin + dir + 'api/image';
}

/** 复制图片链接实际使用的完整 URL（与 /api/image 端点参数一致） */
export function copyImageLinkUrl(query: string, size: number): string {
  return imageApiBase() + '?' + query + '&format=png&size=' + size;
}

/**
 * 探测 /api/image 端点是否可用。
 * - 真后台：返回 Content-Type 以 image/ 开头的图片（此处用最小 SVG 探测，开销很低）
 * - 纯静态：404 / HTML，或 SPA 回退的 text/html → false
 * 超时或网络错误 → false（宁可隐藏按钮，也不让用户复制一条死链接）。
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