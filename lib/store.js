import { redis } from './redis.js';

// ══════════════════════════════════════════════════════════════
//  STRUKTUR DATA DI KV
// ══════════════════════════════════════════════════════════════
// access:{key}        -> { label, createdAt, quotas: { [feature]: { limit } } }
// usage:{key}:{feature} -> angka (counter pemakaian, di-increment atomik)
//
// "quotas" cuma nyimpen LIMIT-nya. Angka pemakaian dipisah ke key sendiri
// (usage:...) supaya bisa di-increment pakai redis.incr() yang atomik — kalau
// disatuin dalam 1 object JSON, tiap increment butuh read-modify-write yang
// rawan race condition kalau ada 2 request nyaris bersamaan.
//
// Kalau sebuah fitur TIDAK ada di quotas milik suatu key, artinya fitur itu
// UNLIMITED buat key tersebut (belum di-set batasnya) — bukan berarti 0.
// ══════════════════════════════════════════════════════════════

const accessId = (key) => `access:${key}`;
const usageId = (key, feature) => `usage:${key}:${feature}`;

export async function getKeyRecord(key) {
  return await redis.get(accessId(key));
}

export async function listKeys() {
  const ids = await redis.keys('access:*');
  const out = [];
  for (const id of ids) {
    const key = id.slice('access:'.length);
    const record = await redis.get(id);
    if (!record) continue;
    const quotas = {};
    for (const feature of Object.keys(record.quotas || {})) {
      const limit = record.quotas[feature].limit;
      const used = Number(await redis.get(usageId(key, feature))) || 0;
      quotas[feature] = { limit, used, remaining: Math.max(limit - used, 0) };
    }
    out.push({ key, label: record.label, createdAt: record.createdAt, quotas });
  }
  // Terbaru duluan
  out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return out;
}

export async function createKey(key, label, quotas) {
  const record = { label: label || key, createdAt: new Date().toISOString(), quotas: quotas || {} };
  await redis.set(accessId(key), record);
  return record;
}

// limit === null artinya HAPUS batasan fitur ini buat key tsb (jadi unlimited)
export async function updateKeyQuota(key, feature, limit) {
  const record = await redis.get(accessId(key));
  if (!record) return null;
  record.quotas = record.quotas || {};
  if (limit === null) {
    delete record.quotas[feature];
  } else {
    record.quotas[feature] = { limit };
  }
  await redis.set(accessId(key), record);
  return record;
}

export async function resetUsage(key, feature) {
  const record = await redis.get(accessId(key));
  if (!record) return null;
  await redis.set(usageId(key, feature), 0);
  return record;
}

export async function deleteKey(key) {
  const record = await redis.get(accessId(key));
  const features = record ? Object.keys(record.quotas || {}) : [];
  await redis.del(accessId(key));
  await Promise.all(features.map((f) => redis.del(usageId(key, f))));
}

// Dipanggil tiap kali sebuah fitur BENERAN dipakai. Nambahin 1 ke counter
// pemakaian, kalau sudah kena limit -> ditolak. Kalau fitur ini gak diset
// batasnya buat key ini (unlimited) -> selalu diizinkan, gak nyatet apa-apa.
export async function consumeQuota(key, feature) {
  if (!key) return { ok: false, message: 'Belum login.' };
  const record = await redis.get(accessId(key));
  if (!record) return { ok: false, message: 'Key tidak ditemukan.' };

  const quota = record.quotas?.[feature];
  if (!quota) return { ok: true, unlimited: true };

  const current = Number(await redis.get(usageId(key, feature))) || 0;
  if (current >= quota.limit) {
    return { ok: false, message: 'Limit fitur ini sudah habis. Hubungi admin buat nambah.', remaining: 0 };
  }

  const used = await redis.incr(usageId(key, feature));
  return { ok: true, remaining: Math.max(quota.limit - used, 0) };
}

export async function getQuotaStatus(key, feature) {
  if (!key) return { exists: false };
  const record = await redis.get(accessId(key));
  if (!record) return { exists: false };

  const quota = record.quotas?.[feature];
  if (!quota) return { exists: true, unlimited: true };

  const used = Number(await redis.get(usageId(key, feature))) || 0;
  return { exists: true, unlimited: false, limit: quota.limit, used, remaining: Math.max(quota.limit - used, 0) };
}
