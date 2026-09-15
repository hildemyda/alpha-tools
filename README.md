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
│   └── store.js          ← semua fungsi baca/tulis key+limit+pemakaian ke Redis (Upstash)
├── api/
│   ├── verify.js          ← login user, cek ke Redis
│   ├── quota-status.js    ← cek sisa limit (gak ngurangin)
│   ├── quota-consume.js   ← potong 1 limit (dipanggil pas fitur "beneran" dipakai)
│   ├── igdl.js            ← scrape Instagram (otomatis potong limit fitur `igdl`)
│   ├── igdl-file.js       ← proxy download file (hindari CORS)
│   ├── removebg.js        ← hapus background lewat 5 server pihak ketiga
│   └── admin/
│       ├── login.js       ← login admin
│       ├── keys.js        ← list (GET) & bikin key baru (POST)
│       ├── update.js      ← ubah limit sebuah fitur buat 1 key
│       ├── reset.js       ← reset pemakaian sebuah fitur ke 0
│       └── delete.js      ← hapus key
└── package.json
```

## 2. Data disimpan di mana?
Semua key + limit + pemakaian disimpan di **Redis** (lewat integrasi **Upstash** di Vercel Marketplace — produk "Vercel KV" yang lama sudah di-sunset per akhir 2024/2025, digantikan integrasi ini). Ini WAJIB di-setup sebelum deploy jalan normal — tanpa ini, login & semua fitur bakal error.

## 3. Upload ke GitHub
Buat repo baru, upload semua file & folder di atas (pertahankan strukturnya, termasuk folder `lib/` dan `api/admin/`).

## 4. Import ke Vercel
- Buka vercel.com → New Project → import repo tadi.
- Framework preset biarkan **"Other"**.
- Jangan langsung deploy dulu — masih ada 2 langkah setup di bawah.

## 5. Connect Database Redis (via Upstash)
- Di project Vercel: tab **Storage** → **Browse Storage** (atau "Create Database").
- Di list **"Marketplace Database Providers"**, pilih **Upstash** ("Serverless DB (Redis, Vector, Queue, Search)") — bukan cari tile "KV" terpisah, karena produk itu sudah gak ada lagi.
- Ikuti alurnya: pilih produk **Redis**, kasih nama database bebas, lalu **Connect ke project ini** (`alpha-tools` / project kamu).
- Vercel otomatis nambahin Environment Variables yang dibutuhkan (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, dll — nama env var-nya tetap dipertahankan dari era Vercel KV lama biar kompatibel) — gak perlu diisi manual.

## 6. Set Password Admin
Masih di **Project Settings → Environment Variables**, tambah:
- Name: `ADMIN_PASSWORD`
- Value: password buat masuk ke `/admin` (beda dari access key biasa, cuma kamu yang tau)
- Centang semua environment
- Save

## 7. Deploy
Klik Deploy. Setelah selesai:
1. Buka `https://domainmu.vercel.app/admin/` → login pakai `ADMIN_PASSWORD`.
2. Klik **"+ Tambah Key Baru"** → isi label (nama orang), key (atau kosongkan buat auto-generate), dan limit tiap fitur (kosongkan = unlimited).
3. Bagikan key itu ke orangnya. Mereka login di `/login.html` seperti biasa.
4. Kalau limit sebuah fitur habis, tombolnya bakal nolak dengan pesan "limit habis" — bisa di-reset atau ditambah lagi kapan saja dari `/admin`, **tanpa redeploy**.

## Catatan
- **Migrasi dari sistem lama**: kalau sebelumnya masih pakai `ACCESS_KEYS` (Environment Variable), itu sudah TIDAK dipakai lagi — semua key sekarang harus didaftarkan ulang lewat `/admin`. Env var `ACCESS_KEYS` boleh dihapus.
- Limit cuma berlaku buat **IG Downloader** dan **Brat Maker** (fitur yang butuh proses server). Qolase, Round Foto, dan **Remove BG** murni belum dibatasi — kalau nanti mau dibatasi juga, tinggal daftarin nama fiturnya (`removebg`) di `admin/script.js` (array `FEATURES`) dan potong limitnya di `api/removebg.js`, polanya sama persis kayak `igdl.js`.
- Kebijakan limit sekarang: **abis ya abis** sampai di-reset manual dari `/admin` (gak ada reset otomatis harian/bulanan).
- `/admin` dan `/api/admin/*` pakai cookie & password TERPISAH dari access key user biasa — orang yang cuma punya access key gak akan bisa masuk ke situ.
- **IG Downloader** bergantung ke layanan pihak ketiga (`yt1s.io`). Kalau layanan itu down/berubah/ngeblokir, fitur ini ikut gagal — limitasi bawaan semua downloader non-resmi, bukan bug di kode.
- **Remove BG** juga bergantung penuh ke layanan pihak ketiga (Photoroom, Dycoderss, BgEraser, Pixa, Background-Remover.com) — kalau salah satu down/berubah, tinggal pilih server lain dari dropdown di halamannya. Server **BgEraser** butuh proses sampai ±60 detik; di **Vercel Hobby plan, function timeout maksimal 10 detik dan gak bisa dinaikin** — jadi server ini kemungkinan besar bakal gagal/timeout di plan Hobby, baru bisa kepakai normal kalau upgrade ke Pro (yang mengizinkan `maxDuration` lebih lama).
- Dependency: `@upstash/redis`, `cheerio`, `axios`, `form-data`, `sharp`, `file-type` — Vercel otomatis `npm install` pas build, gak perlu langkah manual. (Sebelumnya pakai `@vercel/kv`, tapi package itu sudah deprecated mengikuti sunset-nya produk Vercel KV, jadi diganti ke `@upstash/redis` yang jadi cara resmi sekarang.)
