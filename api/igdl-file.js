// Proxy file: browser gak bisa langsung download cross-origin dari CDN si
// scraper (gak ada header CORS/Content-Disposition di sana). Jadi server kita
// yang fetch filenya, lalu diteruskan ke browser dengan header attachment
// supaya otomatis ke-save, bukan cuma kebuka di tab baru.
//
// Domain hasil link download dari yt1s.io bisa beda-beda (bukan CDN Instagram
// langsung), jadi di sini cuma dibatasi ke protokol https — proteksi dari abuse
// publik tetap ada karena endpoint ini ikut ketutup middleware access-key juga.
//
// CATATAN: Vercel Serverless Function (Hobby plan) punya batas ukuran response
// sekitar 4.5MB. Video yang lebih besar dari itu akan gagal lewat proxy ini —
// itu sebabnya frontend selalu sedia tombol "buka link asli" sebagai fallback.

export default async function handler(req, res) {
  const { url, name } = req.query;

  if (!url) {
    return res.status(400).send('URL kosong.');
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).send('URL tidak valid.');
  }
  if (parsed.protocol !== 'https:') {
    return res.status(400).send('Hanya URL https yang diizinkan.');
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' },
    });

    if (!upstream.ok) {
      return res.status(502).send('Gagal mengambil file dari sumbernya.');
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const ext = contentType.includes('video') ? 'mp4' : 'jpg';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${(name || 'instagram-media')}.${ext}"`);
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('igdl-file error:', err);
    return res.status(500).send('Gagal memproses file.');
  }
}
