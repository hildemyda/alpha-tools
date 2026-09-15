import { resetUsage } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { key } = req.body || {};
  if (!key) {
    return res.status(400).json({ ok: false, message: 'Key gak disebutkan.' });
  }

  const record = await resetUsage(key);
  if (!record) {
    return res.status(404).json({ ok: false, message: 'Key gak ketemu.' });
  }
  return res.status(200).json({ ok: true });
}
