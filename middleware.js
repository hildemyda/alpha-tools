import { next } from '@vercel/functions';

// Middleware ini jalan di semua path KECUALI:
// - /login.html      (halaman input key)
// - /api/verify      (endpoint pengecekan key)
// - favicon.ico
export const config = {
  matcher: ['/((?!login\\.html|api/verify|favicon\\.ico).*)'],
};

export default function middleware(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)kolase_key=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  // ACCESS_KEYS bisa berisi lebih dari satu key valid, dipisah koma.
  const rawKeys = process.env.ACCESS_KEYS || process.env.ACCESS_KEY || '';
  const validKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

  // Kalau cookie cocok salah satu key valid -> lanjutkan
  if (token && validKeys.includes(token)) {
    return next();
  }

  // Kalau tidak -> lempar ke halaman login, simpan tujuan asal di query
  const url = new URL('/login.html', request.url);
  url.searchParams.set('redirect', new URL(request.url).pathname);
  return Response.redirect(url, 302);
}
