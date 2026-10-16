(function () {
  const $ = s => document.querySelector(s);
  function el(t, c, x) { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  let tt;
  function toast(t) {
    $('#toastMsg').textContent = t;
    const box = $('#toast');
    box.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => box.classList.remove('show'), 3200);
  }
  function err(t) {
    const e = $('#err');
    e.textContent = t || '';
    e.hidden = !t;
    $('#prog').hidden = true;
    if (t) { $('#intro').hidden = false; $('#result').hidden = true; }
  }
  function prog(i, n, t) {
    $('#prog').hidden = false;
    $('#bar i').style.width = Math.round(i / n * 100) + '%';
    $('#ptxt').textContent = t;
  }

  // ---- Pembaca font / format berkas ----
  function kind(u) {
    const m = String.fromCharCode(u[0], u[1], u[2], u[3]);
    if (m === 'OTTO') return 'otf'; if (m === 'ttcf') return 'ttc'; if (m === 'wOFF') return 'woff';
    if (m === 'true' || (u[0] === 0 && u[1] === 1 && u[2] === 0 && u[3] === 0)) return 'ttf';
    return null;
  }
  function sniff(u) {
    if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4E && u[3] === 0x47) return 'png';
    if (u[0] === 0xFF && u[1] === 0xD8 && u[2] === 0xFF) return 'jpg';
    if (u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46) return 'gif';
    if (String.fromCharCode(u[0], u[1], u[2], u[3]) === 'RIFF' && String.fromCharCode(u[8], u[9], u[10], u[11]) === 'WEBP') return 'webp';
    return kind(u) || 'bin';
  }
  function nameOf(u, id) {
    try {
      const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
      const n = dv.getUint16(4); let nameOff = 0;
      for (let i = 0, o = 12; i < n; i++, o += 16) {
        if (String.fromCharCode(u[o], u[o + 1], u[o + 2], u[o + 3]) === 'name') { nameOff = dv.getUint32(o + 8); break; }
      }
      if (!nameOff) return '';
      const cnt = dv.getUint16(nameOff + 2), so = nameOff + dv.getUint16(nameOff + 4); let best = '';
      for (let i = 0; i < cnt; i++) {
        const r = nameOff + 6 + i * 12, pl = dv.getUint16(r), nid = dv.getUint16(r + 6);
        if (nid !== id) continue;
        const len = dv.getUint16(r + 8), o = so + dv.getUint16(r + 10); let s = '';
        if (pl === 3 || pl === 0) { for (let k = 0; k + 1 < len; k += 2) s += String.fromCharCode(dv.getUint16(o + k)); return s; }
        if (!best) { for (let k = 0; k < len; k++) s += String.fromCharCode(u[o + k]); best = s; }
      }
      return best;
    } catch (e) { return ''; }
  }
  function cleanName(s) { return s.replace(/[\\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim(); }
  function fontFileName(u, fb) {
    const fam = nameOf(u, 1), sty = nameOf(u, 2);
    const n = fam ? fam + (sty && sty !== 'Regular' ? ' ' + sty : '') : (nameOf(u, 6) || fb);
    return cleanName(n) || cleanName(fb) || 'font';
  }
  function argb(n) {
    n = n >>> 0; const a = n >>> 24, r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return { hex: ('#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')).toUpperCase(), css: 'rgba(' + r + ',' + g + ',' + b + ',' + (a / 255).toFixed(2) + ')' };
  }
  function gradOf(s) { try { return String(s).split(';')[3].split('/').map(Number); } catch (e) { return []; } }

  const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
  const FONTX = ['ttf', 'otf', 'ttc', 'woff'];
  const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  async function hex(u) { const h = await crypto.subtle.digest('SHA-256', u); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
  const sw = n => { const s = el('span', 'sw'); const c = argb(n); s.style.background = c.css; s.title = c.hex; return s; };
  const chip = (p, t, w) => p.appendChild(el('span', 'chip' + (w ? ' w' : ''), t));
  const url = g => g.url || (g.url = URL.createObjectURL(new Blob([g.bytes], { type: MIME[g.ext] || 'application/octet-stream' })));
  let P = null;
  let posterUrl = null;

  function releaseUrls() {
    if (P) P.groups.forEach(g => { if (g.url) URL.revokeObjectURL(g.url); });
    if (posterUrl) { URL.revokeObjectURL(posterUrl); posterUrl = null; }
  }

  // ---- Baca file .plp ----
  async function handle(file) {
    err(''); releaseUrls(); P = null; $('#intro').hidden = false; $('#result').hidden = true;
    if (typeof JSZip === 'undefined') return err('Pustaka ZIP gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.');
    let zip; try { zip = await JSZip.loadAsync(file); } catch (e) { return err('File ini bukan arsip .plp yang valid. Pastikan kamu memilih file proyek Pixellab.'); }
    const names = Object.keys(zip.files).filter(n => !zip.files[n].dir);
    const plab = names.find(n => /(^|\/)data\.plab$/.test(n));
    if (!plab) return err('Ini bukan proyek Pixellab: bagian data.plab tidak ditemukan.');
    const rawText = await zip.file(plab).async('string'); let d;
    try { d = JSON.parse(rawText); } catch (e) { return err('Data proyek tidak bisa dibaca. File mungkin rusak.'); }
    const groups = new Map(), byName = new Map(), resNames = names.filter(n => /(^|\/)res\//.test(n));
    let k = 0;
    for (const n of resNames) {
      prog(k++, resNames.length, 'Membongkar ' + k + ' dari ' + resNames.length + ' file…');
      const bytes = await zip.file(n).async('uint8array'); if (!bytes.length) continue;
      const hs = await hex(bytes); let g = groups.get(hs);
      if (!g) { g = { bytes, ext: sniff(bytes), names: [], use: [], nums: [], samples: [] }; groups.set(hs, g); }
      const base = n.split('/').pop(); g.names.push(base); byName.set(base, g);
    }
    const ref = (p, label, num, txt) => {
      const g = p && byName.get(String(p).split('/').pop());
      if (g) { if (!g.use.includes(label)) g.use.push(label); if (!g.nums.includes(num)) g.nums.push(num); if (txt && !g.samples.includes(txt)) g.samples.push(txt); }
      return g;
    };
    const builtin = [], ob = d.objectsBundle || {}, ids = d.objectsIds || Object.keys(ob), layers = [];
    ids.slice().reverse().forEach((id, i) => {
      const o = ob[id]; if (!o) return;
      const L = { id, n: ids.length - i, o }; layers.push(L); const lab = 'Lapisan ' + L.n;
      if (id.startsWith('text')) {
        L.text = o.textTextString || ''; L.fonts = [];
        for (const iv of Object.values(o.textTextFont || {})) {
          const p = iv && iv.textsIntervalsFont; if (!p) continue;
          const g = ref(p, lab, L.n, L.text);
          if (g && FONTX.includes(g.ext)) L.fonts.push(g);
          else if (!g) { L.fonts.push({ builtin: p.split('/').pop() }); builtin.push({ p, t: L.text }); }
        }
        const t = o.textTextureImageSrc; if (t && t.imgSrcPath) L.img = ref(t.imgSrcPath, lab + ' (tekstur)', L.n);
      } else {
        const s = o.shapeImageSrc || {}; if (s.imgSrcSourceType === 'local_file') L.img = ref(s.imgSrcPath, lab, L.n);
      }
    });
    let bg = null; const bs = d.bgPhotoSrc;
    if (bs && bs.imgSrcSourceType === 'local_file') { bg = ref(bs.imgSrcPath, 'Latar kanvas', 0); if (bg) bg.isBg = true; }
    let ni = 0;
    for (const g of groups.values()) {
      if (MIME[g.ext]) g.fname = 'gambar-' + String(++ni).padStart(2, '0');
      else if (FONTX.includes(g.ext)) g.fname = fontFileName(g.bytes, g.names[0]);
      else g.fname = 'file-' + g.names[0];
    }
    const th = names.find(n => /(^|\/)thumb$/.test(n));
    P = { d, rawText, groups: [...groups.values()], layers, bg, thumb: th ? await zip.file(th).async('uint8array') : null, builtin: Object.values(builtin.reduce((a, x) => { (a[x.p] = a[x.p] || { p: x.p, t: [] }).t.push(x.t); return a; }, {})), total: resNames.length, name: file.name.replace(/\.plp$/i, '') };
    render();
  }

  function infoJson() {
    const { d, layers, groups } = P;
    return JSON.stringify({
      kanvas: { lebar: d.bgWidth, tinggi: d.bgHeight, warnaLatar: argb(d.bgColor).hex, fotoLatar: P.bg ? P.bg.fname : null, rotasiLatar: d.bgRotation },
      lapisan: layers.map(L => ({
        no: L.n, jenis: L.text != null ? 'teks' : (L.img ? 'gambar' : 'bentuk'), teks: L.text,
        lebar: +parseFloat(L.o.shapeWidth || 0).toFixed(1), tinggi: +parseFloat(L.o.shapeHeight || 0).toFixed(1), x: L.o.shapeX, y: L.o.shapeY,
        opasitas: L.o.shapeOpacity ?? L.o.textOpacity, berkas: L.img ? L.img.fname : null, font: (L.fonts || []).map(f => f.builtin || f.fname)
      })),
      berkas: groups.map(g => ({ nama: g.fname + '.' + g.ext, ukuran: g.bytes.length, salinanIdentik: g.names.length, dipakaiOleh: g.use }))
    }, null, 2);
  }

  function useChips(p, g) {
    if (g.isBg) chip(p, 'Dipakai sebagai latar');
    const n = g.nums.filter(x => x > 0);
    if (n.length === 1) chip(p, 'Dipakai di lapisan ' + n[0]); else if (n.length > 1) chip(p, 'Dipakai di ' + n.length + ' lapisan');
    if (!g.use.length) chip(p, 'Tidak terpakai', 1);
  }
  function saveBtn(label, fn, cls) { const b = el('button', 'btn ' + (cls || 'sm'), label); b.onclick = fn; return b; }
  const one = g => () => save([{ path: g.fname + '.' + g.ext, bytes: g.bytes }]);

  function panelImages(arr) {
    const w = el('div');
    w.appendChild(el('p', 'help', 'Gambar yang dipakai di desainmu. Ketuk Simpan untuk mengunduhnya. “Tidak terpakai” artinya sisa proses edit, aman diabaikan.'));
    const gr = el('div', 'grid');
    arr.forEach(g => {
      const t = el('article', 'tile'), th = el('div', 'th'), im = el('img'); im.loading = 'lazy'; im.decoding = 'async'; im.alt = g.fname; im.src = url(g); th.appendChild(im); t.appendChild(th);
      const tb = el('div', 'tb'); tb.appendChild(el('b', null, g.fname + '.' + g.ext));
      const m = el('div', 'meta', kb(g.bytes.length)); tb.appendChild(m);
      im.onload = () => { m.textContent = kb(g.bytes.length) + ', ' + im.naturalWidth + ' × ' + im.naturalHeight + ' px'; };
      useChips(tb, g); tb.appendChild(saveBtn('Simpan', one(g))); t.appendChild(tb); gr.appendChild(t);
    });
    w.appendChild(gr); return w;
  }

  let fi = 0;
  async function loadFont(g) { try { const n = 'pf' + (++fi), ff = new FontFace(n, g.bytes.slice().buffer); await ff.load(); document.fonts.add(ff); return n; } catch (e) { return null; } }
  function panelFonts(arr) {
    const w = el('div');
    w.appendChild(el('p', 'help', arr.length
      ? 'Font yang tertanam di proyek. Pratinjau di bawah memakai font aslinya.'
      : 'Tidak ada font yang tertanam di proyek ini. Di bawah ini font yang dipakai tapi tidak ikut tersimpan di file .plp.'));
    arr.forEach(g => {
      const c = el('article', 'fcard'); c.appendChild(el('b', null, g.fname + '.' + g.ext));
      c.appendChild(el('div', 'meta', kb(g.bytes.length)));
      const pv = el('div', 'fprev'), a = el('div', 'big', g.samples[0] || 'Aa Bb Cc'), b = el('div', 'sm', 'Aa Bb Cc Dd 0123456789'); pv.append(a, b); c.appendChild(pv);
      loadFont(g).then(n => { if (n) { a.style.fontFamily = b.style.fontFamily = '"' + n + '"'; } else { b.textContent = 'Pratinjau tidak tersedia di perangkat ini.'; } });
      g.samples.forEach(s => chip(c, 'Dipakai di teks “' + s + '”'));
      c.appendChild(document.createElement('br'));
      c.appendChild(saveBtn('Simpan font', one(g)));
      w.appendChild(c);
    });
    P.builtin.forEach(x => {
      const c = el('article', 'fcard'),
        std = /fonts\//.test(x.p),
        ts = /textstyles\//.test(x.p);
      c.appendChild(el('b', null, x.p.split('/').pop()));
      c.appendChild(el('div', 'meta', x.p));
      [...new Set(x.t)].forEach(s => chip(c, 'Dipakai di teks “' + s + '”'));
      c.appendChild(el('p', 'meta',
        std ? 'Font bawaan Pixellab. Filenya ada di APK Pixellab, folder assets/fonts.'
          : ts ? 'Font ini berasal dari gaya teks yang tersimpan di Pixellab, bukan dari proyek ini. Filenya ada di HP kamu pada jalur di atas (tanpa ekstensi). Salin file itu, tambahkan .ttf di akhir namanya, lalu pakai atau instal seperti font biasa.'
            : 'Nama asli font ini tidak tersimpan di file .plp, dan filenya juga tidak ikut terbungkus. Biasanya ini font yang kamu impor sendiri; cek folder font di HP atau folder pixelLab.'));
      w.appendChild(c);
    });
    return w;
  }

  function panelLayers() {
    const w = el('div');
    w.appendChild(el('p', 'help', 'Lapisan desainmu, dari yang paling atas sampai paling bawah.'));
    const ls = el('div', 'list');
    P.layers.forEach(L => {
      const o = L.o, r = el('article', 'row'), th = el('div', 'rth');
      if (L.text != null) { th.className = 'rth txt'; th.textContent = 'Aa'; }
      else if (L.img) { const im = el('img'); im.loading = 'lazy'; im.decoding = 'async'; im.src = url(L.img); im.alt = ''; th.appendChild(im); }
      else th.className = 'rth shp';
      const body = el('div');
      body.appendChild(el('b', null, L.text != null ? 'Teks “' + L.text + '”' : (L.img ? 'Gambar' : 'Bentuk polos')));
      const bits = ['Lapisan ' + L.n];
      if (L.text != null) bits.push('ukuran teks ' + Math.round(parseFloat(o.textTextSize)));
      else bits.push(Math.round(parseFloat(o.shapeWidth)) + ' × ' + Math.round(parseFloat(o.shapeHeight)) + ' px');
      const op = L.text != null ? o.textOpacity : o.shapeOpacity; if (op < 100) bits.push('transparan ' + (100 - op) + '%');
      const rot = parseFloat(o.shapeRotation || o.textRotation || 0); if (rot) bits.push('diputar ' + rot + '°');
      body.appendChild(el('div', 'meta', bits.join(', ')));
      if (L.text != null) L.fonts.forEach(f => chip(body, 'Font ' + (f.builtin || f.fname)));
      if (L.img) chip(body, 'Berkas ' + L.img.fname);
      if (o.objectHidden) chip(body, 'Disembunyikan', 1); if (o.objectLocked) chip(body, 'Dikunci');
      r.append(th, body); ls.appendChild(r);
    });
    w.appendChild(ls); return w;
  }

  function panelCanvas() {
    const { d, bg } = P, w = el('div');
    w.appendChild(el('p', 'help', 'Pengaturan dasar kanvas (lembar kerja) proyekmu.'));
    const kv = el('dl', 'kv');
    const row = (k, v) => { const r = el('div'); r.appendChild(el('dt', null, k)); const dd = el('dd'); if (typeof v === 'string') dd.textContent = v; else dd.append(...v); r.appendChild(dd); kv.appendChild(r); };
    row('Ukuran', sizeTxt(d));
    row('Warna latar', [argb(d.bgColor).hex + ' ', sw(d.bgColor)]);
    if (d.bgGradientV2) { const g = gradOf(d.bgGradientV2); if (g.length) row('Gradasi latar tersimpan', g.map(sw)); }
    row('Foto latar', bg ? bg.fname + '.' + bg.ext : 'Tidak ada');
    if (d.bgRotation) row('Rotasi latar', d.bgRotation + '°');
    const fx = [];
    if (d.effectNoiseEnabled) fx.push('noise'); if (d.effectVignetteEnabled) fx.push('vignette'); if (d.effectStripesEnabled) fx.push('garis');
    [['effectBrightnessVal', 'kecerahan'], ['effectContrastVal', 'kontras'], ['effectSaturationVal', 'saturasi'], ['effectHueVal', 'warna (hue)']].forEach(([k, n]) => { if (d[k]) fx.push(n + ' ' + d[k]); });
    row('Efek', fx.length ? fx.join(', ') : 'Tidak ada yang aktif');
    w.appendChild(kv); return w;
  }

  // Kanvas bisa tersimpan sebagai rasio (mis. 1 × 1), bukan ukuran piksel.
  const sizeTxt = d => d.bgWidth > 10 && d.bgHeight > 10
    ? d.bgWidth + ' × ' + d.bgHeight + ' px'
    : 'rasio ' + d.bgWidth + ':' + d.bgHeight + ' (ukuran piksel dipilih saat ekspor)';

  function render() {
    const { d, layers, groups, thumb } = P;
    const imgs = groups.filter(g => MIME[g.ext]), fonts = groups.filter(g => FONTX.includes(g.ext)), other = groups.filter(g => !MIME[g.ext] && !FONTX.includes(g.ext));
    $('#intro').hidden = true; $('#result').hidden = false; $('#prog').hidden = true;
    $('#title').textContent = P.name;
    $('#stats').textContent = sizeTxt(d) + '. ' + layers.length + ' lapisan, ' + imgs.length + ' gambar, ' + fonts.length + ' font.';
    const po = $('#poster');
    if (thumb) { posterUrl = URL.createObjectURL(new Blob([thumb], { type: 'image/jpeg' })); po.src = posterUrl; po.hidden = false; } else po.hidden = true;
    const defs = [['Gambar', imgs.length, () => panelImages(imgs)], ['Font', fonts.length + P.builtin.length, () => panelFonts(fonts)], ['Lapisan', layers.length, panelLayers], ['Kanvas', null, panelCanvas]];
    if (other.length) defs.push(['Lainnya', other.length, () => panelImages(other)]);
    const tabs = $('#tabs'), panels = $('#panels'); tabs.innerHTML = ''; panels.innerHTML = '';
    const bs = [], ps = [];
    defs.forEach(([name, n, fn], i) => {
      const b = el('button', 'tab', name + (n != null ? ' (' + n + ')' : '')); b.setAttribute('role', 'tab');
      const p = el('div'); p.setAttribute('role', 'tabpanel');
      try { p.appendChild(fn()); } catch (e) { p.appendChild(el('p', 'help', 'Bagian ini tidak bisa ditampilkan.')); }
      b.onclick = () => show(i); bs.push(b); ps.push(p); tabs.appendChild(b); panels.appendChild(p);
    });
    function show(i) { bs.forEach((b, j) => { b.setAttribute('aria-selected', j === i); ps[j].hidden = j !== i; }); }
    show(imgs.length ? 0 : (fonts.length ? 1 : 2));
    window.scrollTo(0, 0);
  }

  // ---- Simpan: unduhan biasa lewat browser ----
  function download(blob, filename) {
    const a = document.createElement('a');
    const u = URL.createObjectURL(blob);
    a.href = u; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 15000);
  }
  async function save(files) {
    try {
      if (files.length === 1) {
        const f = files[0], ext = f.path.split('.').pop().toLowerCase();
        download(new Blob([f.bytes], { type: MIME[ext] || 'application/octet-stream' }), f.path);
      } else {
        const z = new JSZip(); files.forEach(x => z.file(x.path, x.bytes));
        const blob = await z.generateAsync({ type: 'blob', compression: 'STORE' });
        download(blob, 'bongkar-' + (cleanName(P.name) || 'proyek') + '.zip');
      }
      toast('Berhasil diunduh');
    } catch (e) { toast('Gagal menyimpan: ' + ((e && e.message) || e)); }
  }
  async function saveAll() {
    if (typeof JSZip === 'undefined') return toast('Pustaka ZIP belum termuat, muat ulang halaman.');
    toast('Menyusun zip…');
    const te = new TextEncoder(), files = [{ path: 'info-proyek.json', bytes: te.encode(infoJson()) }, { path: 'data.plab.json', bytes: te.encode(P.rawText) }];
    if (P.thumb) files.push({ path: 'thumbnail.jpg', bytes: P.thumb });
    P.groups.forEach(g => files.push({ path: (MIME[g.ext] ? 'gambar/' : (FONTX.includes(g.ext) ? 'font/' : 'lainnya/')) + g.fname + '.' + g.ext, bytes: g.bytes }));
    await save(files);
  }

  // ---- Pilih file ----
  const dropzone = $('#dropzone'), fileInput = $('#file');
  dropzone.addEventListener('click', () => fileInput.click());
  $('#again').addEventListener('click', () => fileInput.click());
  $('#all').addEventListener('click', saveAll);
  fileInput.addEventListener('change', e => {
    const f = e.target.files[0]; e.target.value = '';
    if (f) handle(f).catch(x => err('Terjadi kesalahan: ' + x.message));
  });
  ['dragover', 'dragenter'].forEach(evt =>
    dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('dragover'); })
  );
  ['dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('dragover'); })
  );
  dropzone.addEventListener('drop', e => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handle(f).catch(x => err('Terjadi kesalahan: ' + x.message));
  });
})();
