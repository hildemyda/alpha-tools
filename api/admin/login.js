export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ ok: false, message: 'ADMIN_PASSWORD belum diset di Environment Variables.' });
  }

  const { password } = req.body || {};
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, message: 'Password admin salah.' });
  }

  res.setHeader(
    'Set-Cookie',
    `alphools_admin=${encodeURIComponent(password)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  );
  return res.status(200).json({ ok: true });
}
