import { updateKeyLimit } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { key, limit } = req.body || {};
  if (!key) {
    return res.status(400).json({ ok: false, message: 'Key gak disebutkan.' });
  }

  const parsedLimit = limit === null || limit === '' || limit === undefined ? null : Number(limit);
  const record = await updateKeyLimit(key, parsedLimit);
  if (!record) {
    return res.status(404).json({ ok: false, message: 'Key gak ketemu.' });
  }
  return res.status(200).json({ ok: true, record });
}
