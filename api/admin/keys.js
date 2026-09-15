import { listKeys, createKey } from '../../lib/store.js';

function randomKey() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const keys = await listKeys();
    return res.status(200).json({ ok: true, keys });
  }

  if (req.method === 'POST') {
    const { key, label, igdlLimit, bratLimit } = req.body || {};
    const finalKey = (key && key.trim()) || randomKey();

    const quotas = {};
    if (igdlLimit !== undefined && igdlLimit !== '' && igdlLimit !== null) {
      quotas.igdl = { limit: Number(igdlLimit) };
    }
    if (bratLimit !== undefined && bratLimit !== '' && bratLimit !== null) {
      quotas.brat = { limit: Number(bratLimit) };
    }

    const record = await createKey(finalKey, label, quotas);
    return res.status(200).json({ ok: true, key: finalKey, record });
  }

  return res.status(405).json({ ok: false, message: 'Method not allowed' });
}
