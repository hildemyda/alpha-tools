# Setup & Deploy

## 1. Struktur project
```
project/
├── index.html         ← halaman hub (daftar tools)
├── qolase/
│   ├── index.html      ← app kolase foto
│   ├── styles.css
│   └── script.js
├── round-foto/
│   ├── index.html      ← app bulatkan sudut foto
│   ├── styles.css
│   └── script.js
├── brat-maker/
│   ├── index.html      ← app bikin teks gaya cover Brat
│   ├── styles.css
│   └── script.js
├── ig-downloader/
│   ├── index.html      ← app unduh foto/video dari Instagram
│   ├── styles.css
│   └── script.js
├── remove-bg/
│   ├── index.html      ← app hapus background foto (5 pilihan server)
│   ├── styles.css
│   └── script.js
├── admin/
│   ├── login.html       ← login admin (password SENDIRI, beda dari access key user)
│   ├── index.html        ← dashboard: kelola key, limit, reset pemakaian
│   ├── styles.css
│   └── script.js
├── login.html           ← halaman input access key (user biasa)
├── middleware.js         ← 2 jalur: user (cookie kolase_key, dicek ke Redis) & admin (cookie alphools_admin)
├── lib/
│   ├── cookies.js        ← helper baca cookie
│   ├── features.js       ← daftar fitur yang ikut sistem kredit + biaya (kredit) tiap fitur
│   └── store.js          ← baca/tulis key + kredit gabungan + pemakaian ke Redis (Upstash)
├── api/
│   ├── verify.js          ← login user, cek ke Redis
│   ├── quota-status.js    ← cek sisa kredit (gak ngurangin)
│   ├── quota-consume.js   ← potong kredit sesuai biaya fitur (dipanggil pas fitur "beneran" dipakai)
│   ├── igdl.js            ← scrape Instagram (otomatis potong kredit sesuai biaya `igdl`)
│   ├── igdl-file.js       ← proxy download file (hindari CORS)
│   ├── removebg.js        ← hapus background lewat 5 server pihak ketiga (otomatis potong kredit sesuai biaya `removebg`)
│   └── admin/
│       ├── login.js       ← login admin
│       ├── keys.js        ← list (GET) & bikin key baru (POST)
│       ├── update.js      ← ubah limit kredit gabungan buat 1 key
│       ├── reset.js       ← reset pemakaian kredit 1 key ke 0
│       └── delete.js      ← hapus key
└── package.json
```

## 2. Cara kerja sistem kredit
Beda dari versi sebelumnya (limit per-fitur terpisah), sekarang **1 key cuma punya 1 kolam kredit gabungan**. Tiap fitur yang ikut sistem ini motong kredit dari kolam yang sama, tapi **besar potongannya beda-beda per fitur** — diatur di `lib/features.js`:
```js
export const FEATURES = {
  igdl:     { label: 'IG Downloader', cost: 1 },
  brat:     { label: 'Brat Maker',    cost: 1 },
  removebg: { label: 'Remove BG',     cost: 0 }, // 0 = gratis, gak potong kredit
};
```
- `cost: 0` → fitur itu **selalu gratis**, apapun sisa kreditnya (dipakai buat Remove BG sekarang).
- `cost: 1` (atau angka berapa aja) → tiap kali dipakai, motong segitu dari kolam kredit key-nya.
- Fitur yang gak didaftarin di `FEATURES` otomatis dianggap `cost: 1`.

**Nambah fitur baru ke sistem kredit** (misal nanti ada tool baru):
1. Tambah 1 baris di `lib/features.js` (nama fitur + cost-nya).
2. Sambungin pemotongannya di kode fitur itu — 2 pola:
   - Fitur yang lewat API server (kayak `igdl.js`/`removebg.js`): panggil `consumeCredit(key, 'nama-fitur')` dari `lib/store.js` di awal handler, tolak request kalau `!result.ok`.
   - Fitur yang murni jalan di browser (kayak Brat Maker): panggil `fetch('/api/quota-consume', { method:'POST', body: JSON.stringify({ feature: 'nama-fitur' }) })` pas tombol "beneran dipakai" (misal tombol unduh) dipencet.
3. Tambah entry yang sama di `admin/script.js` (`FEATURE_COSTS`) biar tabel referensi biayanya kelihatan di dashboard — ini CUMA tampilan, gak dipakai buat ngitung beneran (yang ngitung tetap `lib/features.js`), jadi 2 tempat ini harus disinkronkan manual tiap ada perubahan.

## 3. Data disimpan di mana?
Semua key + limit kredit + pemakaian disimpan di **Redis** (lewat integrasi **Upstash** di Vercel Marketplace — produk "Vercel KV" yang lama sudah di-sunset per akhir 2024/2025, digantikan integrasi ini). Ini WAJIB di-setup sebelum deploy jalan normal — tanpa ini, login & semua fitur bakal error.

## 4. Upload ke GitHub
Buat repo baru, upload semua file & folder di atas (pertahankan strukturnya, termasuk folder `lib/` dan `api/admin/`).

## 5. Import ke Vercel
- Buka vercel.com → New Project → import repo tadi.
- Framework preset biarkan **"Other"**.
- Jangan langsung deploy dulu — masih ada 2 langkah setup di bawah.

## 6. Connect Database Redis (via Upstash)
- Di project Vercel: tab **Storage** → **Browse Storage** (atau "Create Database").
- Di list **"Marketplace Database Providers"**, pilih **Upstash** ("Serverless DB (Redis, Vector, Queue, Search)") — bukan cari tile "KV" terpisah, karena produk itu sudah gak ada lagi.
- Ikuti alurnya: pilih produk **Redis**, kasih nama database bebas, ganti **Custom Prefix** jadi `KV` (biar env var-nya `KV_REST_API_URL`/`KV_REST_API_TOKEN`, sesuai yang dibaca kode), lalu **Connect** ke project ini.

## 7. Set Password Admin
Di **Project Settings → Environment Variables** (atau halaman Environments kalau dashboard kamu versi baru), tambah:
- Name: `ADMIN_PASSWORD`
- Value: password buat masuk ke `/admin` (beda dari access key biasa, cuma kamu yang tau)
- Centang semua environment
- Save

## 8. Deploy
Klik Deploy. Setelah selesai:
1. Buka `https://domainmu.vercel.app/admin/` → login pakai `ADMIN_PASSWORD`.
2. Klik **"+ Tambah Key Baru"** → isi label (nama orang), key (atau kosongkan buat auto-generate), dan **1 limit kredit gabungan** (kosongkan = unlimited).
3. Bagikan key itu ke orangnya. Mereka login di `/login.html` seperti biasa.
4. Kalau kredit habis, tombolnya bakal nolak dengan pesan "kredit habis" — bisa di-reset atau ditambah lagi kapan saja dari `/admin`, **tanpa redeploy**.

## Catatan
- **Migrasi dari sistem lama**: kalau sebelumnya masih pakai `ACCESS_KEYS` (Environment Variable) ATAU versi limit-per-fitur (sebelum jadi kredit gabungan), semua itu sudah TIDAK dipakai lagi — semua key sekarang harus didaftarkan ulang lewat `/admin` dengan 1 angka limit kredit.
- Fitur yang ikut sistem kredit sekarang: **IG Downloader** (cost 1) dan **Brat Maker** (cost 1). **Remove BG** sudah tersambung ke sistemnya juga tapi cost-nya di-set **0 (gratis)** — gampang diubah kapan aja lewat `lib/features.js`. Qolase & Round Foto murni jalan di browser, gak tersambung ke sistem kredit sama sekali.
- Kebijakan limit sekarang: **abis ya abis** sampai di-reset manual dari `/admin` (gak ada reset otomatis harian/bulanan).
- `/admin` dan `/api/admin/*` pakai cookie & password TERPISAH dari access key user biasa — orang yang cuma punya access key gak akan bisa masuk ke situ.
- **IG Downloader** bergantung ke layanan pihak ketiga (`yt1s.io`). Kalau layanan itu down/berubah/ngeblokir, fitur ini ikut gagal — limitasi bawaan semua downloader non-resmi, bukan bug di kode.
- **Remove BG** juga bergantung penuh ke layanan pihak ketiga (Photoroom, Dycoderss, BgEraser, Pixa, Background-Remover.com) — kalau salah satu down/berubah, tinggal pilih server lain dari dropdown di halamannya. Server **BgEraser** butuh proses sampai ±60 detik; di **Vercel Hobby plan, function timeout maksimal 10 detik dan gak bisa dinaikin** — jadi server ini kemungkinan besar bakal gagal/timeout di plan Hobby, baru bisa kepakai normal kalau upgrade ke Pro (yang mengizinkan `maxDuration` lebih lama).
- Dependency: `@upstash/redis`, `cheerio`, `axios`, `form-data`, `sharp`, `file-type` — Vercel otomatis `npm install` pas build, gak perlu langkah manual.
