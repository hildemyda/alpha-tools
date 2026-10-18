(function(){
  'use strict';

  // ══════════════════════════════════════════════════════════════
  //  UKURAN & WARNA — diport dari plugin bot "maker-igpost.js" (v8.2)
  //  Semua ukuran dalam "unit logis"; hasil akhir dikali skala render.
  // ══════════════════════════════════════════════════════════════
  const SCALE_EXPORT  = 3;     // skala untuk file yang diunduh (tajam / HD)
  const SCALE_PREVIEW = 1.5;   // skala untuk preview di layar (lebih ringan)
  const W = 480, PAD = 16, HDR_H = 70, ACT_H = 47;
  const AVR = 18, AVR_BIG = 22, ICO_S = 26, VFY_S = 18;
  const FONT_SIZE = 18, FONT_SUB = 15, LINE_H = 23;
  const STORY_W = 720, STORY_H = Math.round(STORY_W * 16 / 9);
  const CARD_MARGIN_X = 60, CARD_MARGIN_Y = 100, CARD_RADIUS = 32;
  const BG_BLUR = 50, BG_DARKEN = 0.2;

  const THEME = {
    light: { BG:'#ffffff', TEXT:'#000000', SUB:'#737373', BORDER:'#dbdbdb', BTN_BG:'#efefef', LINK:'#00376b' },
    dark:  { BG:'#1c1c1c', TEXT:'#f5f5f5', SUB:'#a8a8a8', BORDER:'#333333', BTN_BG:'#2a2a2a', LINK:'#e0f1ff' },
  };
  const LIKE_COLOR = '#ff3b5c';
  const VERIFIED_COLOR = '#0095f6';

  const FONT = 'Roboto, Arial, sans-serif';
  const font = (weight, size) => weight + ' ' + size + 'px ' + FONT;

  // ══════════════════════════════════════════════════════════════
  //  IKON (vektor, digambar langsung ke canvas — tanpa file PNG)
  // ══════════════════════════════════════════════════════════════
  const ICONS = {
    heart:   new Path2D('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'),
    comment: new Path2D('M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l1.9-5.5A8.5 8.5 0 1 1 21 11.5Z'),
    repost:  new Path2D('M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3'),
    share:   new Path2D('M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'),
    save:    new Path2D('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'),
  };
  const CHECK = new Path2D('M7.6 12.4l3 3 5.9-6.2');

  function drawIcon(ctx, name, x, y, size, color, filled){
    ctx.save();
    ctx.translate(x, y); ctx.scale(size / 24, size / 24);
    ctx.lineWidth = 1.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = color; ctx.fillStyle = color;
    if (filled) ctx.fill(ICONS[name]);
    ctx.stroke(ICONS[name]);
    ctx.restore();
  }

  function drawVerified(ctx, x, y, size){
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    const R = size / 2, r = R * 0.86, n = 8;
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++){
      const a = (Math.PI * i) / n - Math.PI / 2, rad = i % 2 === 0 ? R : r;
      const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = VERIFIED_COLOR; ctx.strokeStyle = VERIFIED_COLOR;
    ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.12;
    ctx.fill(); ctx.stroke();
    ctx.scale(size / 24, size / 24); ctx.translate(-12, -12);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke(CHECK);
    ctx.restore();
  }

  // ══════════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════════
  const rnd = (a, b) => Math.floor(Math.random() * (b - a)) + a;

  function fmtNum(n){
    if (n >= 1000000) return (n / 1e6).toFixed(1).replace('.0', '') + 'jt';
    if (n >= 1000)    return (n / 1e3).toFixed(1).replace('.0', '') + 'rb';
    return String(n);
  }

  function getJakartaDate(){
    const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const jkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return jkt.getDate() + ' ' + MONTHS[jkt.getMonth()] + ' ' + jkt.getFullYear();
  }

  function newCanvas(w, h){
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  }

  // Pecah teks jadi baris-baris sesuai lebar. Kata yang lebih panjang dari
  // satu baris dipotong per huruf supaya tidak keluar dari kartu.
  function wrapText(ctx, text, maxW){
    const lines = []; let line = '';
    for (let w of text.split(' ')){
      while (ctx.measureText(w).width > maxW && w.length > 1){
        if (line){ lines.push(line); line = ''; }
        let cut = w.length - 1;
        while (cut > 1 && ctx.measureText(w.slice(0, cut)).width > maxW) cut--;
        lines.push(w.slice(0, cut)); w = w.slice(cut);
      }
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line){ lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  // Caption boleh multi-baris (Enter), tiap paragraf dibungkus sendiri.
  function wrapCaption(ctx, text, maxW){
    const out = [];
    text.split(/\r?\n/).forEach(p => { if (!p.trim()) out.push(''); else out.push(...wrapText(ctx, p, maxW)); });
    while (out.length && !out[out.length - 1]) out.pop();
    return out;
  }

  // Satu baris teks; kata berawalan # atau @ diberi warna link.
  function drawRichText(ctx, line, startX, y, color, linkColor){
    if (!line) return;
    let x = startX;
    for (const word of line.split(' ')){
      ctx.fillStyle = (word.startsWith('#') || word.startsWith('@')) ? linkColor : color;
      ctx.fillText(word, x, y);
      x += ctx.measureText(word + ' ').width;
    }
  }

  // Crop tengah supaya gambar menutup kotak (dx,dy,dw,dh) penuh.
  function drawCover(ctx, img, dx, dy, dw, dh){
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.max(dw / iw, dh / ih), sw = dw / s, sh = dh / s;
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, dx, dy, dw, dh);
  }

  function drawAvatar(ctx, img, initial, cx, cy, r, bgColor, ring){
    if (ring){
      const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      g.addColorStop(0, '#f09433'); g.addColorStop(0.25, '#e6683c'); g.addColorStop(0.5, '#dc2743');
      g.addColorStop(0.75, '#cc2366'); g.addColorStop(1, '#bc1888');
      ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, r + 1.3, 0, Math.PI * 2); ctx.fillStyle = bgColor; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(cx, cy, r + 1.5, 0, Math.PI * 2); ctx.fillStyle = bgColor; ctx.fill();
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    if (img){
      drawCover(ctx, img, cx - r, cy - r, r * 2, r * 2);
    } else {
      const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      g.addColorStop(0, '#f09433'); g.addColorStop(0.5, '#dc2743'); g.addColorStop(1, '#bc1888');
      ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = '#fff'; ctx.font = font('bold', r);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((initial || 'U').toUpperCase(), cx, cy + 1);
    }
    ctx.restore();
  }

  // Blur background story. Pakai ctx.filter kalau didukung; kalau tidak
  // (mis. Safari), perkiraan blur lewat perkecil lalu perbesar gambarnya.
  function drawBlurBg(ctx, img, scale){
    const dw = STORY_W * scale, dh = STORY_H * scale;
    const k = scale / SCALE_EXPORT;                // tampilan sama di preview & hasil akhir
    const blur = BG_BLUR * k;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const cs = Math.max(dw / iw, dh / ih), cw = iw * cs, ch = ih * cs;
    const bx = (dw - cw) / 2, by = (dh - ch) / 2;
    ctx.save();
    if ('filter' in ctx){
      ctx.filter = 'blur(' + blur + 'px)';
      ctx.drawImage(img, bx - blur, by - blur, cw + blur * 2, ch + blur * 2);
    } else {
      let cur = newCanvas(dw, dh); drawCover(cur.getContext('2d'), img, 0, 0, cur.width, cur.height);
      for (let i = 0; i < 3; i++){
        const sm = newCanvas(cur.width / 3, cur.height / 3), sx = sm.getContext('2d');
        sx.imageSmoothingQuality = 'high'; sx.drawImage(cur, 0, 0, sm.width, sm.height);
        const up = newCanvas(dw, dh), ux = up.getContext('2d');
        ux.imageSmoothingQuality = 'high'; ux.drawImage(sm, 0, 0, up.width, up.height);
        cur = up;
      }
      ctx.drawImage(cur, 0, 0, dw, dh);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,' + BG_DARKEN + ')';
    ctx.fillRect(0, 0, dw, dh);
  }

  // ══════════════════════════════════════════════════════════════
  //  STATE & ELEMEN
  // ══════════════════════════════════════════════════════════════
  const $ = id => document.getElementById(id);
  const state = {
    photo: null, avatar: null,
    opts: { dark:false, verified:false, story:false, like:false, follow:false, frame:true, nobg:false },
    rand: null,
  };
  function reroll(){ state.rand = { likes: rnd(100, 50000), comments: rnd(5, 500), reposts: rnd(10, 300), sends: rnd(10, 200) }; }
  reroll();

  const canvas = $('canvas'), pctx = canvas.getContext('2d');
  const userInput = $('userInput'), captionInput = $('captionInput');
  const numInputs = { likes: $('likesInput'), comments: $('commentsInput'), reposts: $('repostsInput'), sends: $('sendsInput') };
  const pngBtn = $('downloadPngBtn'), jpgBtn = $('downloadJpgBtn');
  const quotaNote = $('quotaNote'), toastEl = $('toast');

  function numOf(key){
    const raw = numInputs[key].value.replace(/\D/g, '');
    return raw ? Math.min(parseInt(raw, 10), 999999999) : state.rand[key];
  }
  function cleanUser(){ return (userInput.value.replace(/^@+/, '').replace(/\s+/g, '') || 'username.id'); }

  let placeholderImg = null;
  function getPlaceholder(){
    if (placeholderImg) return placeholderImg;
    const c = newCanvas(1080, 1080), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 1080, 1080);
    g.addColorStop(0, '#2b4a3f'); g.addColorStop(1, '#10241c');
    x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
    return (placeholderImg = c);
  }

  // ══════════════════════════════════════════════════════════════
  //  RENDER KARTU + FRAME STORY
  // ══════════════════════════════════════════════════════════════
  function renderCard(scale, o){
    const C = o.dark ? THEME.dark : THEME.light;
    const img = state.photo || getPlaceholder();
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const avatarR = o.story ? AVR : AVR_BIG;
    const username = cleanUser();

    // Tinggi foto, dibatasi rasio maksimum 3:4 (crop tengah)
    const MAX_POST_H = Math.round(W * 4 / 3);
    let POST_H = Math.round(W * ih / iw);
    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (POST_H > MAX_POST_H){
      POST_H = MAX_POST_H; sh = Math.round(sw * 4 / 3); sy = Math.round((ih - sh) / 2);
    }

    // Ukur caption di canvas 1x (hasil sama di preview & ekspor)
    const mx = newCanvas(10, 10).getContext('2d');
    mx.font = font(400, FONT_SIZE);
    const allLines = wrapCaption(mx, captionInput.value, W - PAD * 2);
    const showLines = allLines.slice(0, 3), hasMore = allLines.length > 3;
    // Kalau baris pertama caption gak muat di sebelah username, ia turun satu baris (perlu tinggi ekstra)
    mx.font = font(600, FONT_SIZE);
    const unCapW0 = mx.measureText(cleanUser() + ' ').width;
    mx.font = font(400, FONT_SIZE);
    const cap0Wraps = !!showLines[0] && mx.measureText(showLines[0]).width > W - PAD * 2 - unCapW0;
    const CAP_H = LINE_H + (cap0Wraps ? LINE_H : 0) + Math.max(0, showLines.length - 1) * LINE_H + (hasMore ? LINE_H : 0) + LINE_H + 16;
    const TOTAL_H = HDR_H + POST_H + ACT_H + CAP_H + 8;

    const cv = newCanvas(W * scale, TOTAL_H * scale), ctx = cv.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = C.BG; ctx.fillRect(0, 0, W, TOTAL_H);

    // ── Header ──
    const AVX = PAD + avatarR + 3, AVY = HDR_H / 2;
    drawAvatar(ctx, state.avatar, username[0], AVX, AVY, avatarR, C.BG, o.story);
    const UN_X = AVX + avatarR + 12;
    ctx.fillStyle = C.TEXT; ctx.font = font(600, FONT_SIZE);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(username, UN_X, AVY);
    if (o.verified){
      const unW = ctx.measureText(username).width;
      drawVerified(ctx, UN_X + unW + 5, AVY - VFY_S / 2, VFY_S);
    }
    if (!o.follow){
      const BW = 72, BH = 30, BX = W - BW - 40, BY = AVY - BH / 2;
      ctx.fillStyle = C.BTN_BG; ctx.beginPath(); ctx.roundRect(BX, BY, BW, BH, 8); ctx.fill();
      ctx.fillStyle = C.TEXT; ctx.font = font(500, FONT_SIZE - 1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Ikuti', BX + BW / 2, BY + BH / 2);
    }
    ctx.fillStyle = C.TEXT;
    for (let i = -1; i <= 1; i++){ ctx.beginPath(); ctx.arc(W - 20, AVY + i * 6, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = C.BORDER; ctx.fillRect(0, HDR_H - 1, W, 1);

    // ── Foto ──
    ctx.drawImage(img, sx, sy, sw, sh, 0, HDR_H, W, POST_H);

    // ── Baris ikon aksi ──
    const AY = HDR_H + POST_H, IY = AY + (ACT_H - ICO_S) / 2, ITY = IY + ICO_S / 2;
    ctx.fillStyle = C.BORDER; ctx.fillRect(0, AY, W, 1);
    const drawIconNum = (name, x, num, color, filled) => {
      drawIcon(ctx, name, x, IY, ICO_S, color, filled);
      ctx.fillStyle = C.TEXT; ctx.font = font(700, FONT_SIZE);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const label = fmtNum(num);
      ctx.fillText(label, x + ICO_S + 6, ITY);
      return x + ICO_S + 6 + ctx.measureText(label).width + 18;
    };
    let IX = PAD;
    IX = drawIconNum('heart', IX, numOf('likes'), o.like ? LIKE_COLOR : C.TEXT, o.like);
    IX = drawIconNum('comment', IX, numOf('comments'), C.TEXT);
    IX = drawIconNum('repost', IX, numOf('reposts'), C.TEXT);
    IX = drawIconNum('share', IX, numOf('sends'), C.TEXT);
    drawIcon(ctx, 'save', W - PAD - ICO_S, IY, ICO_S, C.TEXT);

    // ── Caption ──
    let CY = AY + ACT_H + 4;
    ctx.font = font(600, FONT_SIZE); ctx.fillStyle = C.TEXT;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const unCapW = ctx.measureText(username + ' ').width;
    ctx.fillText(username, PAD, CY);
    ctx.font = font(400, FONT_SIZE);
    const cap0 = showLines[0] || '';
    if (ctx.measureText(cap0).width <= W - PAD * 2 - unCapW){
      drawRichText(ctx, cap0, PAD + unCapW, CY, C.TEXT, C.LINK); CY += LINE_H;
    } else {
      CY += LINE_H; drawRichText(ctx, cap0, PAD, CY, C.TEXT, C.LINK); CY += LINE_H;
    }
    for (let i = 1; i < showLines.length; i++){ drawRichText(ctx, showLines[i], PAD, CY, C.TEXT, C.LINK); CY += LINE_H; }
    if (hasMore){ ctx.fillStyle = C.SUB; ctx.fillText('selengkapnya', PAD, CY); CY += LINE_H; }
    CY += 4;
    ctx.fillStyle = C.SUB; ctx.font = font(500, FONT_SUB);
    ctx.fillText(getJakartaDate(), PAD, CY);

    return { cv, TOTAL_H, C };
  }

  function render(scale){
    const o = state.opts;
    const { cv, TOTAL_H, C } = renderCard(scale, o);
    if (!o.frame) return cv;

    const sc = newCanvas(STORY_W * scale, STORY_H * scale), sctx = sc.getContext('2d');
    const k = scale / SCALE_EXPORT;
    if (!o.nobg) drawBlurBg(sctx, state.photo || getPlaceholder(), scale);
    sctx.scale(scale, scale);

    let cardW = STORY_W - CARD_MARGIN_X * 2, cardH = cardW * TOTAL_H / W;
    const maxCardH = STORY_H - CARD_MARGIN_Y * 2;
    if (cardH > maxCardH){ cardH = maxCardH; cardW = cardH * W / TOTAL_H; }
    const cardX = (STORY_W - cardW) / 2, cardY = (STORY_H - cardH) / 2;

    sctx.save();
    if (!o.nobg){
      sctx.shadowColor = 'rgba(0,0,0,0.60)'; sctx.shadowBlur = 50 * k; sctx.shadowOffsetY = 25 * k;
    }
    sctx.fillStyle = C.BG; sctx.beginPath(); sctx.roundRect(cardX, cardY, cardW, cardH, CARD_RADIUS); sctx.fill();
    sctx.restore();

    sctx.save();
    sctx.beginPath(); sctx.roundRect(cardX, cardY, cardW, cardH, CARD_RADIUS); sctx.clip();
    sctx.drawImage(cv, cardX, cardY, cardW, cardH);
    sctx.restore();
    return sc;
  }

  // ══════════════════════════════════════════════════════════════
  //  PREVIEW
  // ══════════════════════════════════════════════════════════════
  let raf = 0;
  function schedule(){ cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
  function draw(){
    try {
      const out = render(SCALE_PREVIEW);
      canvas.width = out.width; canvas.height = out.height;
      pctx.clearRect(0, 0, out.width, out.height);
      pctx.drawImage(out, 0, 0);
    } catch (e) { console.error(e); }
    const has = !!state.photo;
    $('emptyHint').classList.toggle('hidden', has);
    pngBtn.disabled = !has;
    jpgBtn.disabled = !has || (state.opts.frame && state.opts.nobg);
  }

  // ══════════════════════════════════════════════════════════════
  //  INPUT
  // ══════════════════════════════════════════════════════════════
  [userInput, captionInput, ...Object.values(numInputs)].forEach(el => el.addEventListener('input', schedule));
  $('rerollBtn').addEventListener('click', () => {
    reroll(); Object.values(numInputs).forEach(i => { i.value = ''; }); schedule();
  });

  document.querySelectorAll('.toggle-chip[data-opt]').forEach(chip => {
    chip.addEventListener('click', () => {
      const k = chip.dataset.opt;
      state.opts[k] = !state.opts[k]; chip.classList.toggle('active', state.opts[k]);
      $('nobgChip').disabled = !state.opts.frame;     // transparan cuma berarti kalau ada frame 9:16
      schedule();
    });
  });

  function loadFile(file){
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => resolve({ im, url });
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad')); };
      im.src = url;
    });
  }

  $('photoBtn').addEventListener('click', () => $('photoInput').click());
  $('photoInput').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const { im, url } = await loadFile(f);
      state.photo = im;
      const th = $('photoThumb'); th.src = url; th.hidden = false;
      $('photoText').textContent = f.name + ' (ketuk untuk ganti)';
      $('photoBtn').classList.add('has');
      schedule();
    } catch (err) { showToast('Foto gak bisa dibuka. Coba format JPG atau PNG.'); }
  });

  $('avatarBtn').addEventListener('click', () => $('avatarInput').click());
  $('avatarInput').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const { im } = await loadFile(f);
      state.avatar = im; $('avatarClear').hidden = false; $('avatarNote').textContent = 'Foto profil dipakai';
      schedule();
    } catch (err) { showToast('Foto profil gak bisa dibuka.'); }
  });
  $('avatarClear').addEventListener('click', () => {
    state.avatar = null; $('avatarClear').hidden = true; $('avatarNote').textContent = 'Kosong = avatar inisial'; schedule();
  });

  // ══════════════════════════════════════════════════════════════
  //  UNDUH + KREDIT
  //  Gambar dibuat dulu; kredit baru dipotong kalau gambarnya berhasil
  //  jadi, supaya kegagalan render gak makan kredit.
  // ══════════════════════════════════════════════════════════════
  function showToast(msg){
    $('toastMsg').textContent = msg; toastEl.classList.add('show');
    clearTimeout(showToast._t); showToast._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  function renderQuotaNote(s){
    if (!s || s.unlimited || s.free || s.remaining === undefined){ quotaNote.textContent = ''; return; }
    quotaNote.textContent = 'Sisa ' + s.remaining + ' kredit';
    quotaNote.classList.toggle('low', s.remaining <= 2);
  }

  async function handleDownload(kind){
    if (!state.photo) { showToast('Pilih foto dulu.'); return; }
    pngBtn.disabled = jpgBtn.disabled = true;
    try {
      const mime = kind === 'png' ? 'image/png' : 'image/jpeg';
      const out = render(SCALE_EXPORT);
      const blob = await new Promise(res => out.toBlob(res, mime, 0.95));
      if (!blob){ showToast('Gagal bikin gambar (memori HP kurang). Coba matikan Frame 9:16.'); return; }

      const r = await fetch('/api/quota-consume', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'igpost' }),
      });
      const data = await r.json();
      if (!data.ok){ showToast(data.message || 'Limit sudah habis.'); renderQuotaNote(data); return; }

      const a = document.createElement('a');
      a.download = 'igpost.' + (kind === 'png' ? 'png' : 'jpg');
      a.href = URL.createObjectURL(blob); a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      showToast('Berhasil diunduh'); renderQuotaNote(data);
    } catch (err) {
      showToast('Terjadi kesalahan, coba lagi.');
    } finally { draw(); }
  }
  pngBtn.addEventListener('click', () => handleDownload('png'));
  jpgBtn.addEventListener('click', () => handleDownload('jpg'));

  async function loadQuotaStatus(){
    try {
      const r = await fetch('/api/quota-status?feature=igpost'); const d = await r.json();
      if (d.ok && !d.unlimited) renderQuotaNote(d);
    } catch (e) { /* gak krusial */ }
  }

  // Pastikan font Roboto sudah siap sebelum render, supaya ukuran teks akurat.
  if (document.fonts && document.fonts.load){
    Promise.all(['400','500','600','700'].map(w => document.fonts.load(w + ' 18px Roboto').catch(() => {})))
      .then(schedule, schedule);
    document.fonts.ready.then(schedule);
  }
  draw();
  loadQuotaStatus();
})();
