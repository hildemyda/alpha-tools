import { getCookie } from '../lib/cookies.js';
import { consumeQuota } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { feature } = req.body || {};
  if (!feature) {
    return res.status(400).json({ ok: false, message: 'Fitur gak disebutkan.' });
  }

  const key = getCookie(req, 'kolase_key');
  const result = await consumeQuota(key, feature);
  return res.status(result.ok ? 200 : 403).json(result);
}
