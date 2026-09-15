import { getCookie } from '../lib/cookies.js';
import { getCreditStatus } from '../lib/store.js';

export default async function handler(req, res) {
  const { feature } = req.query;
  if (!feature) {
    return res.status(400).json({ ok: false, message: 'Fitur gak disebutkan.' });
  }

  const key = getCookie(req, 'kolase_key');
  const status = await getCreditStatus(key, feature);
  return res.status(200).json({ ok: true, ...status });
}
