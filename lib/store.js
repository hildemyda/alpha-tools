import { redis } from './redis.js';
import { getFeatureCost } from './features.js';

// ══════════════════════════════════════════════════════════════
//  STRUKTUR DATA DI REDIS
// ══════════════════════════════════════════════════════════════
// access:{key} -> { label, createdAt, creditLimit }
//   creditLimit: number = batas kredit key ini (1 KOLAM buat semua fitur)
//   creditLimit: null   = unlimited, gak pernah kena potong
// usage:{key}  -> angka (total kredit yang udah kepakai, di semua fitur)
//
// Biaya tiap fitur (berapa kredit yang dipotong per pemakaian) diatur di
// lib/features.js, BUKAN per-key — jadi semua key berbagi tabel biaya yang
// sama, cuma beda batas total kreditnya.
// ══════════════════════════════════════════════════════════════

const accessId = (key) => `access:${key}`;
const usageId = (key) => `usage:${key}`;

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
    const used = Number(await redis.get(usageId(key))) || 0;
    const unlimited = record.creditLimit === null || record.creditLimit === undefined;
    out.push({
      key,
      label: record.label,
      createdAt: record.createdAt,
      unlimited,
      limit: unlimited ? null : record.creditLimit,
      used,
      remaining: unlimited ? null : Math.max(record.creditLimit - used, 0),
    });
  }
  out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return out;
}

// creditLimit null/undefined = unlimited
export async function createKey(key, label, creditLimit) {
  const record = {
    label: label || key,
    createdAt: new Date().toISOString(),
    creditLimit: creditLimit === null || creditLimit === undefined ? null : creditLimit,
  };
  await redis.set(accessId(key), record);
  return record;
}

export async function updateKeyLimit(key, limit) {
  const record = await redis.get(accessId(key));
  if (!record) return null;
  record.creditLimit = limit === null || limit === undefined ? null : limit;
  await redis.set(accessId(key), record);
  return record;
}

export async function resetUsage(key) {
  const record = await redis.get(accessId(key));
  if (!record) return null;
  await redis.set(usageId(key), 0);
  return record;
}

export async function deleteKey(key) {
  await redis.del(accessId(key));
  await redis.del(usageId(key));
}

// Potong kredit sebanyak "cost" fitur yang bersangkutan (dari lib/features.js).
// cost 0 -> selalu diizinkan, gak nyentuh kredit key sama sekali.
export async function consumeCredit(key, feature) {
  const cost = getFeatureCost(feature);
  if (cost === 0) return { ok: true, free: true, cost };

  if (!key) return { ok: false, message: 'Belum login.' };
  const record = await redis.get(accessId(key));
  if (!record) return { ok: false, message: 'Key tidak ditemukan.' };

  if (record.creditLimit === null || record.creditLimit === undefined) {
    return { ok: true, unlimited: true, cost };
  }

  const current = Number(await redis.get(usageId(key))) || 0;
  if (current + cost > record.creditLimit) {
    return {
      ok: false,
      message: 'Kredit sudah habis. Hubungi admin buat nambah.',
      remaining: Math.max(record.creditLimit - current, 0),
      cost,
    };
  }

  const used = await redis.incrby(usageId(key), cost);
  return { ok: true, remaining: Math.max(record.creditLimit - used, 0), cost };
}

export async function getCreditStatus(key, feature) {
  const cost = feature ? getFeatureCost(feature) : undefined;
  if (!key) return { exists: false, cost };

  const record = await redis.get(accessId(key));
  if (!record) return { exists: false, cost };

  if (record.creditLimit === null || record.creditLimit === undefined) {
    return { exists: true, unlimited: true, cost };
  }

  const used = Number(await redis.get(usageId(key))) || 0;
  return {
    exists: true,
    unlimited: false,
    limit: record.creditLimit,
    used,
    remaining: Math.max(record.creditLimit - used, 0),
    cost,
  };
}
