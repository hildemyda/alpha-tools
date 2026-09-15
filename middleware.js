import { next } from '@vercel/functions';
import { redis } from './lib/redis.js';

// Path yang LEWAT TANPA dicek sama sekali (halaman login itu sendiri + endpoint
// buat login). Semua path lain wajib punya cookie yang valid sesuai jalurnya.
export const config = {
  matcher: ['/((?!login\\.html|api/verify|admin/login\\.html|api/admin/login|favicon\\.ico).*)'],
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('cookie') || '';

  // ── Jalur admin: /admin/* dan /api/admin/* pakai cookie & password SENDIRI,
  // gak nyambung sama sistem access key user biasa ──
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) {
    const match = cookieHeader.match(/(?:^|;\s*)alphools_admin=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;
    const valid = token && process.env.ADMIN_PASSWORD && token === process.env.ADMIN_PASSWORD;

    if (valid) return next();

    if (url.pathname.startsWith('/api/admin')) {
      return new Response(JSON.stringify({ ok: false, message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return Response.redirect(new URL('/admin/login.html', request.url), 302);
  }

  // ── Jalur user biasa: cookie kolase_key harus cocok sama key yang beneran
  // ada di KV (bukan lagi dicocokkan ke env var ACCESS_KEYS) ──
  const match = cookieHeader.match(/(?:^|;\s*)kolase_key=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  if (token) {
    const record = await redis.get(`access:${token}`);
    if (record) return next();
  }

  const loginUrl = new URL('/login.html', request.url);
  loginUrl.searchParams.set('redirect', url.pathname);
  return Response.redirect(loginUrl, 302);
}
