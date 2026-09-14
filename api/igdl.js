// Port dari plugin bot WhatsApp: hit endpoint pihak ketiga (yt1s.io) yang
// sudah nanganin ekstraksi Instagram (termasuk carousel/multi-media), lalu
// parse HTML hasilnya dengan cheerio buat ambil link download tiap medianya.
// Teknik & selector-nya dipertahankan sama persis kayak versi bot.
//
// KETERBATASAN (sama seperti semua downloader non-resmi):
// - Bergantung penuh ke layanan pihak ketiga (yt1s.io) — kalau mereka down,
//   ganti struktur, atau blokir, endpoint ini ikut gagal.
// - Cuma post publik yang bisa diambil.

import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ ok: false, message: 'Link Instagram belum diisi.' });
  }
  if (!/instagram\.com\//i.test(url)) {
    return res.status(400).json({ ok: false, message: 'Link Instagram gak valid.' });
  }

  try {
    const body = new URLSearchParams({ q: url, w: '', p: 'home', lang: 'en' });
    const upstream = await fetch('https://yt1s.io/api/ajaxSearch', {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': 'https://yt1s.io',
        'Referer': 'https://yt1s.io/',
        'User-Agent': 'Postify/1.0.0',
      },
      body,
    });

    if (!upstream.ok) {
      return res.status(502).json({ ok: false, message: `Layanan scraper menolak request (status ${upstream.status}).` });
    }

    const data = await upstream.json();
    const $ = cheerio.load(data.data || '');

    const items = $('a.abutton.is-success.is-fullwidth.btn-premium')
      .map((_, el) => {
        const title = $(el).attr('title') || '';
        const downloadUrl = $(el).attr('href');
        if (!downloadUrl || title.toLowerCase().includes('thumbnail')) return null;
        const isVideo = downloadUrl.includes('.mp4') || title.toLowerCase().includes('video');
        return { type: isVideo ? 'video' : 'image', url: downloadUrl, title };
      })
      .get()
      .filter(Boolean);

    if (items.length === 0) {
      return res.status(404).json({ ok: false, message: 'Gagal menemukan media. Pastikan link benar dan akun tidak private.' });
    }

    return res.status(200).json({ ok: true, items });
  } catch (err) {
    console.error('igdl error:', err);
    return res.status(500).json({ ok: false, message: 'Terjadi kesalahan saat mengambil data.' });
  }
}
