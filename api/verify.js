export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { key } = req.body || {};
  // ACCESS_KEYS bisa berisi lebih dari satu key, dipisah koma di Environment Variables.
  // Contoh value: kunci-andi,kunci-budi,kunci-tim-2026
  const rawKeys = process.env.ACCESS_KEYS || process.env.ACCESS_KEY || '';
  const validKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

  if (validKeys.length === 0) {
    return res.status(500).json({ ok: false, message: 'ACCESS_KEYS belum diset di Environment Variables' });
  }

  if (key && validKeys.includes(key)) {
    // Cookie httpOnly: tidak bisa dibaca lewat JavaScript di browser,
    // hanya dikirim otomatis oleh browser di setiap request.
    res.setHeader(
      'Set-Cookie',
      `kolase_key=${encodeURIComponent(key)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 1}`
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, message: 'Key salah' });
}
