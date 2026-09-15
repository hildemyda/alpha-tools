import { getKeyRecord } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { key } = req.body || {};
  if (!key) {
    return res.status(400).json({ ok: false, message: 'Key kosong.' });
  }

  const record = await getKeyRecord(key);
  if (!record) {
    return res.status(401).json({ ok: false, message: 'Key salah' });
  }

  // Cookie httpOnly: gak bisa dibaca lewat JavaScript di browser,
  // cuma dikirim otomatis oleh browser di tiap request.
  res.setHeader(
    'Set-Cookie',
    `kolase_key=${encodeURIComponent(key)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 1}`
  );
  return res.status(200).json({ ok: true });
}
