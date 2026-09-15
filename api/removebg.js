// Port dari plugin bot WhatsApp (tools-removebg.js) — cuma dipertahankan 5
// server sesuai request: Dycoderss (1), Photoroom (2 — default), BgEraser (3),
// Pixa/Pixelcut (6), Background-Remover.com (7). Server 4 (Jagpro) dan 5 (Azbry)
// sengaja gak diporting karena butuh upload ke ImgBB dulu (butuh host publik),
// gak relevan buat use-case web ini.
//
// Endpoint ini nerima JSON: { image: "data:image/...;base64,....", server: "2" }
// lalu balikin JSON: { ok: true, image: "data:image/png;base64,....", elapsedMs, server, label }
//
// KETERBATASAN:
// - Vercel Serverless Function (Node runtime) punya hard limit ukuran body
//   request/response ~4.5MB, gak bisa dinaikin lewat config apapun. Jadi foto
//   sumber dibatasi di sisi frontend (lihat remove-bg/script.js) supaya hasil
//   base64-nya masih muat.
// - Server BgEraser (3) polling sampai ±60 detik kalau lambat. Di Vercel Hobby,
//   function timeout kemax 10 detik (gak bisa dinaikin), jadi server ini bisa
//   gagal/timeout di plan Hobby — butuh Pro (atau lebih) biar `maxDuration` di
//   bawah beneran kepake.
// - Token refresh Photoroom & apikey Dycoderss di-hardcode persis dari kode bot
//   aslinya (bukan rahasia server ini, murni dependency ke layanan pihak ketiga).

import axios from 'axios';
import FormData from 'form-data';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

export const config = {
  maxDuration: 60,
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// --- [ SERVER 1: DYCODERSS REMOVEBG ] ---
async function removebgDycoderss(buffer) {
  const fileType = await fileTypeFromBuffer(buffer);
  const mime = fileType?.mime || 'image/jpeg';
  const ext = mime.split('/')[1];

  const form = new FormData();
  form.append('image', buffer, { filename: `upload.${ext}`, contentType: mime });
  form.append('apikey', 'alpa0x1234567890');

  const response = await axios.post('https://dycoderss.xyz/api/removebg', form, {
    headers: form.getHeaders(),
    validateStatus: () => true,
  });

  const resData = response.data;
  if (!resData?.status || !resData?.data?.url) {
    throw new Error(resData?.message || `Server Dycoderss gagal memproses gambar (HTTP ${response.status}).`);
  }

  const imageRes = await axios.get(resData.data.url, { responseType: 'arraybuffer' });
  return Buffer.from(imageRes.data);
}

// --- [ SERVER 2: PHOTOROOM (default) ] ---
let idToken = null;
let refreshToken = 'AMf-vBwpudXTnY1FgobhqhDbSVE1ysyhrUQZaxHVNPeViBXZTC8q3f-yawGwDvRNqlokG848eNS8k4SgLCLGp_rb6MUEz0HXoxu-G54TtFismWggMLfimC8nhGUE6PRj0vjplcNhGDN7OPujzDENzuvDDuZLkRBuqyF4kaNYUqAZI_Q_hjYvHJwaWQqJGdKWOGXkv8tNGn_M';
let tokenExpiry = 0;

async function getValidIdToken() {
  const now = Date.now();
  if (idToken && (tokenExpiry - now) > 5 * 60 * 1000) return idToken;

  const response = await axios({
    method: 'post',
    url: 'https://securetoken.googleapis.com/v1/token',
    params: { key: 'AIzaSyAJGrgbFGB_-h8V2oJLr4b-_ipetqM0duU' },
    headers: {
      'Content-Type': 'application/json',
      'X-Android-Package': 'com.photoroom.app',
      'X-Android-Cert': '0424A4898A4B33940D8BF16E44251B876E97F8D0',
      'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 14; sdk_gphone64_x86_64 Build/UE1A.230829.036.A4)',
    },
    data: { grant_type: 'refresh_token', refresh_token: refreshToken },
    timeout: 15000,
    validateStatus: () => true,
  });

  if (response.status !== 200) throw new Error(`Refresh token Photoroom gagal (HTTP ${response.status}).`);

  idToken = response.data.id_token;
  refreshToken = response.data.refresh_token;
  tokenExpiry = Date.now() + (parseInt(response.data.expires_in) * 1000);
  return idToken;
}

async function removebgPhotoroom(buffer) {
  const authToken = await getValidIdToken();
  const jpegBuffer = await sharp(buffer).jpeg().toBuffer();

  const form = new FormData();
  form.append('sourceImage', jpegBuffer, { filename: 'source.jpg', contentType: 'image/jpeg' });
  form.append('user_id', '48acFOd8fTfvyjU0nI4oaqKB7512');
  form.append('resize_mask', 'false');
  form.append('model_type', 'free');
  form.append('experiment_flag', 'default');

  const response = await axios({
    method: 'post',
    url: 'https://segmentation-inference.photoroom.com/v1/mask',
    data: form,
    headers: {
      ...form.getHeaders(),
      'User-Agent': 'okhttp/5.3.2',
      authorization: authToken,
      'pr-app-version': '2026.07.02 (2274)',
      'pr-platform': 'android',
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (response.status !== 200) throw new Error(`Server Photoroom gagal memproses gambar (HTTP ${response.status}).`);
  if (!response.data?.b64_mask) throw new Error('Server Photoroom tidak mengembalikan mask.');

  const maskBuffer = Buffer.from(response.data.b64_mask, 'base64');
  const metadata = await sharp(maskBuffer).metadata();

  return await sharp(jpegBuffer)
    .resize(metadata.width, metadata.height)
    .joinChannel(maskBuffer)
    .png()
    .toBuffer();
}

// --- [ SERVER 3: BGERASER ] ---
async function removebgBgeraser(buffer) {
  const commonHeaders = {
    origin: 'https://bgeraser.com',
    referer: 'https://bgeraser.com/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  };

  const form = new FormData();
  form.append('file', buffer, { filename: 'image.png', contentType: 'image/png' });
  form.append('type', '4');
  form.append('mattValue', '0');

  const { data: upload } = await axios.post('https://bgeraser.com/api/bgeraser/legacy/upload', form, {
    headers: { ...form.getHeaders(), ...commonHeaders },
  });

  const taskId = upload.taskId;
  if (!taskId) throw new Error('Server BgEraser tidak mengembalikan taskId.');

  for (let i = 0; i < 18; i++) {
    await sleep(3000);

    const { data: job } = await axios.post('https://bgeraser.com/api/bgeraser/legacy/status', {
      type: 4,
      codes: [taskId],
    }, { headers: commonHeaders });

    const resultUrl = job.downloadUrls?.[taskId];
    if (resultUrl) {
      const res = await axios.get(resultUrl, { responseType: 'arraybuffer' });
      return Buffer.from(res.data);
    }
  }

  throw new Error('Server BgEraser timeout: gambar tidak selesai diproses.');
}

// --- [ SERVER 6: PIXA / PIXELCUT ] ---
async function removebgPixa(buffer) {
  const form = new FormData();
  form.append('image', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  form.append('format', 'png');
  form.append('model', 'v1');

  const response = await axios.post('https://api2.pixelcut.app/image/matte/v1', form, {
    headers: {
      ...form.getHeaders(),
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
      'x-locale': 'en',
      'x-client-version': 'web:pixa.com:4a5b0af2',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      origin: 'https://www.pixa.com',
      'sec-fetch-site': 'cross-site',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
      referer: 'https://www.pixa.com/',
      'accept-language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6',
    },
    responseType: 'arraybuffer',
    validateStatus: () => true,
  });

  if (response.status !== 200) throw new Error(`Server Pixa gagal memproses gambar (HTTP ${response.status}).`);
  return Buffer.from(response.data);
}

// --- [ SERVER 7: BACKGROUND-REMOVER.COM ] ---
async function removebgBackgroundRemover(buffer) {
  const fileType = await fileTypeFromBuffer(buffer);
  const mime = fileType?.mime || 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';

  const encodedImage = `data:${mime};base64,${buffer.toString('base64')}`;

  const response = await axios.post('https://background-remover.com/removeImageBackground', {
    encodedImage,
    title: `image.${ext}`,
    mimeType: mime,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Android 14; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0',
      Referer: 'https://background-remover.com/upload',
      Origin: 'https://background-remover.com',
      Accept: '*/*',
    },
    responseType: 'arraybuffer',
    validateStatus: () => true,
  });

  if (response.status !== 200) throw new Error(`Server Background-Remover gagal memproses gambar (HTTP ${response.status}).`);

  const ct = response.headers['content-type'] || '';
  if (ct.includes('image/')) return Buffer.from(response.data);

  const rawString = Buffer.from(response.data).toString('utf-8');
  const data = JSON.parse(rawString);
  const resultData = data.encodedImageWithoutBackground || data.image || data.resultImage || data.output || data.data || data.result;

  if (!resultData) throw new Error('Server Background-Remover tidak mengembalikan data gambar.');

  if (typeof resultData === 'string' && resultData.startsWith('http')) {
    const imgRes = await axios.get(resultData, { responseType: 'arraybuffer' });
    return Buffer.from(imgRes.data);
  }
  const b64 = resultData.replace(/^data:[^;]+;base64,/, '').trim();
  return Buffer.from(b64, 'base64');
}

// --- [ DAFTAR SERVER ] ---
const SERVERS = {
  '1': { fn: removebgDycoderss, label: 'Dycoderss API' },
  '2': { fn: removebgPhotoroom, label: 'Photoroom App' },
  '3': { fn: removebgBgeraser, label: 'BgEraser Web' },
  '6': { fn: removebgPixa, label: 'Pixelcut App' },
  '7': { fn: removebgBackgroundRemover, label: 'BG Remover' },
};
const DEFAULT_SERVER = '2'; // Photoroom

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed.' });
  }

  const { image, server } = req.body || {};
  const serverNum = server && SERVERS[server] ? server : DEFAULT_SERVER;

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ ok: false, message: 'Gambar belum dikirim.' });
  }

  const match = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ ok: false, message: 'Format gambar tidak valid.' });
  }

  let buffer = Buffer.from(match[2], 'base64');
  // Cap ~4.5MB (limit hard Vercel), dicek juga lebih ketat di frontend.
  if (buffer.length > 4.2 * 1024 * 1024) {
    return res.status(413).json({ ok: false, message: 'Ukuran gambar terlalu besar (maks ~3MB sebelum dikirim).' });
  }

  const chosen = SERVERS[serverNum];

  try {
    const startTime = Date.now();
    const resultBuffer = await chosen.fn(buffer);
    const elapsedMs = Date.now() - startTime;

    const resultType = await fileTypeFromBuffer(resultBuffer);
    const resultMime = resultType?.mime || 'image/png';

    return res.status(200).json({
      ok: true,
      image: `data:${resultMime};base64,${resultBuffer.toString('base64')}`,
      elapsedMs,
      server: serverNum,
      label: chosen.label,
    });
  } catch (err) {
    console.error(`[removebg] server ${serverNum} gagal:`, err?.message);
    return res.status(502).json({
      ok: false,
      message: `Gagal menghapus background dengan server ${chosen.label}, coba server lain.`,
      server: serverNum,
    });
  }
}
