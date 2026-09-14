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
├── login.html           ← halaman input access key
├── middleware.js         ← cek cookie akses, jalan untuk SEMUA tool di atas
├── api/verify.js
└── package.json
```

Satu access key berlaku untuk semua tools (Qolase, Round Foto, dan tools berikutnya kalau ditambah) — middleware-nya melindungi seluruh path kecuali `/login.html` dan `/api/verify`.

## 2. Nambah tool baru nanti
Cukup buat folder baru berisi `index.html` (boleh + `styles.css`/`script.js` sendiri), lalu tambahkan satu card baru di `index.html` (hub) yang link ke folder itu. Tidak perlu ubah middleware maupun sistem key sama sekali.

## 3. Upload ke GitHub
Buat repo baru, upload semua file & folder di atas (pertahankan strukturnya).

## 4. Import ke Vercel
- Buka vercel.com → New Project → import repo tadi.
- Framework preset biarkan **"Other"** (karena ini bukan Next.js).
- Jangan langsung deploy dulu — set Environment Variable dulu (langkah 5).

## 5. Set Access Key
Di Vercel: **Project Settings → Environment Variables**
- Name: `ACCESS_KEYS`
- Value: satu key → `qolase-2026-xyz`. Lebih dari satu key → pisahkan pakai koma, contoh: `qolase-andi,qolase-budi,qolase-tim2026`
- Centang semua environment (Production, Preview, Development)
- Save

## 6. Deploy
Klik Deploy. Setelah selesai:
- Buka domain project → diarahkan ke `/login.html` karena belum ada cookie.
- Masukkan salah satu key yang ada di `ACCESS_KEYS` → masuk ke halaman hub (`/`) berisi daftar tools.
- Dari hub, pilih Qolase atau Round Foto — keduanya sudah otomatis ke-unlock, gak perlu login dua kali.
- Cookie berlaku 1 hari (bisa diubah di `api/verify.js`, bagian `Max-Age`, rumusnya `60*60*24*jumlah_hari`).

## Catatan
- Key TIDAK ditulis di kode, jadi aman walau repo publik.
- **Ganti/hapus key**: edit value `ACCESS_KEYS` di Vercel lalu **Redeploy**. User yang pakai key lama otomatis diminta login ulang.
- **Tambah key baru**: tambahkan di belakang, dipisah koma, lalu redeploy. Gak perlu ubah kode.
