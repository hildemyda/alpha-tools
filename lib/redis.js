import { Redis } from '@upstash/redis';

// Vercel KV (produk lama) sudah di-sunset — sekarang provisioning Redis-nya
// lewat integrasi Upstash di Vercel Marketplace. Integrasi itu tetap
// nginject env var dengan nama KV_REST_API_URL / KV_REST_API_TOKEN (nama lama
// dipertahankan biar kompatibel), makanya di sini dibaca eksplisit pakai nama
// itu, bukan andalin Redis.fromEnv() yang defaultnya nyari nama env var beda
// (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
