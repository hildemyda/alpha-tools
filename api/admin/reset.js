import { resetUsage } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { key, feature } = req.body || {};
  if (!key || !feature) {
    return res.status(400).json({ ok: false, message: 'Data gak lengkap.' });
  }

  const record = await resetUsage(key, feature);
  if (!record) {
    return res.status(404).json({ ok: false, message: 'Key gak ketemu.' });
  }
  return res.status(200).json({ ok: true });
}
