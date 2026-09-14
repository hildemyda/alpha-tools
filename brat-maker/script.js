(function(){
  // ══════════════════════════════════════════════════════════════
  //  Port dari plugin bot WhatsApp (@napi-rs/canvas) ke Canvas API browser.
  //  Algoritma (fitText, wrapWords, drawLine, downscale-upscale buat efek
  //  buram) dipertahankan SAMA PERSIS — cuma sumber teksnya dari <textarea>,
  //  bukan flag command, dan gak perlu render/encode buffer manual karena
  //  browser bisa drawImage(canvas, ...) antar-canvas langsung.
  // ══════════════════════════════════════════════════════════════

  const CANVAS_SIZE = 512;
  const PAD = 28;
  const MAX_FONT = 260;
  const MIN_FONT = 14;
  const FONT_STEP = 2;
  const LINE_H_RATIO = 0.92;
  const LINE_GAP_PX = 8;
  const BLUR_PX = 1.4;
  const RENDER_SCALE = 0.5;

  const FONT_FAMILY = "'Archivo Narrow', 'Arial Narrow', Arial, sans-serif";
  const fontString = (size) => `${size}px ${FONT_FAMILY}`;
  const lineHeightFor = (fontSize) => fontSize * LINE_H_RATIO + LINE_GAP_PX;

  function toWords(text){
    return text.trim().split(/\s+/).filter(Boolean);
  }

  function wrapWords(ctx, words, maxWidth){
    const lines = [];
    let current = [];
    for (const w of words) {
      const test = [...current, w].join(' ');
      if (current.length > 0 && ctx.measureText(test).width > maxWidth) {
        lines.push(current);
        current = [w];
      } else {
        current.push(w);
      }
    }
    if (current.length) lines.push(current);
    return lines;
  }

  function fitText(ctx, words, boxW, boxH){
    let fontSize = MAX_FONT;
    let lines = [words];

    for (; fontSize >= MIN_FONT; fontSize -= FONT_STEP) {
      ctx.font = fontString(fontSize);
      const wrapped = wrapWords(ctx, words, boxW);
      const lineH = lineHeightFor(fontSize);
      const totalH = wrapped.length * lineH;
      const widest = Math.max(...wrapped.map(l => ctx.measureText(l.join(' ')).width));
      if (totalH <= boxH && widest <= boxW) { lines = wrapped; break; }
      lines = wrapped;
    }

    return { fontSize: Math.max(fontSize, MIN_FONT), lines };
  }

  function drawLine(ctx, words, x, y, boxW, isLastLine){
    const shouldJustify = words.length > 1 && !isLastLine;

    if (!shouldJustify) {
      ctx.textAlign = 'left';
      ctx.fillText(words.join(' '), x, y);
      return;
    }

    const widths = words.map(w => ctx.measureText(w).width);
    const wordsWidth = widths.reduce((a, b) => a + b, 0);
    const gap = (boxW - wordsWidth) / (words.length - 1);

    ctx.textAlign = 'left';
    let cx = x;
    words.forEach((w, i) => {
      ctx.fillText(w, cx, y);
      cx += widths[i] + gap;
    });
  }

  // ---- UI wiring ----
  const textInput = document.getElementById('textInput');
  const darkToggle = document.getElementById('darkToggle');
  const hdToggle = document.getElementById('hdToggle');
  const nobgToggle = document.getElementById('nobgToggle');
  const canvas = document.getElementById('canvas');
  const finalCtx = canvas.getContext('2d');
  const emptyHint = document.getElementById('emptyHint');
  const downloadPngBtn = document.getElementById('downloadPngBtn');
  const downloadWebpBtn = document.getElementById('downloadWebpBtn');
  const toast = document.getElementById('toast');

  [darkToggle, hdToggle, nobgToggle].forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      render();
    });
  });

  let renderTimer = null;
  textInput.addEventListener('input', () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 120);
  });

  function render(){
    const text = textInput.value.trim();
    finalCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (!text) {
      emptyHint.classList.remove('hidden');
      downloadPngBtn.disabled = true;
      downloadWebpBtn.disabled = true;
      return;
    }
    emptyHint.classList.add('hidden');
    downloadPngBtn.disabled = false;
    downloadWebpBtn.disabled = false;

    const dark = darkToggle.classList.contains('active');
    const hd = hdToggle.classList.contains('active');
    const nobg = nobgToggle.classList.contains('active');

    const renderScale = hd ? 1 : RENDER_SCALE;
    const blurPx = hd ? 0 : BLUR_PX;

    const words = toWords(text);
    const boxW = CANVAS_SIZE - PAD * 2;
    const boxH = CANVAS_SIZE - PAD * 2;

    const measureCtx = document.createElement('canvas').getContext('2d');
    const { fontSize, lines } = fitText(measureCtx, words, boxW, boxH);
    const lineH = lineHeightFor(fontSize);

    // Canvas kerja: resolusi setengahnya (kecuali -hd), sama seperti versi bot.
    const workSize = Math.round(CANVAS_SIZE * renderScale);
    const workCanvas = document.createElement('canvas');
    workCanvas.width = workSize;
    workCanvas.height = workSize;
    const ctx = workCanvas.getContext('2d');
    ctx.scale(renderScale, renderScale);

    if (!nobg) {
      ctx.fillStyle = dark ? '#000000' : '#ffffff';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    ctx.font = fontString(fontSize);
    ctx.fillStyle = dark ? '#ffffff' : '#000000';
    ctx.textBaseline = 'top';
    if (blurPx > 0) ctx.filter = `blur(${blurPx}px)`;

    lines.forEach((lineWords, i) => {
      const y = PAD + i * lineH;
      const isLastLine = i === lines.length - 1;
      drawLine(ctx, lineWords, PAD, y, boxW, isLastLine);
    });
    ctx.filter = 'none';

    // Upscale balik ke ukuran final -> ini yang bikin tepinya kelihatan
    // buram/kasar khas brat asli (di browser cukup drawImage antar-canvas,
    // gak perlu encode/decode buffer kayak di sisi bot).
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(workCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  function download(mime, ext){
    const link = document.createElement('a');
    link.download = `brat.${ext}`;
    link.href = canvas.toDataURL(mime);
    link.click();
    showToast(ext === 'webp' ? 'WebP siap dipakai jadi stiker' : 'Berhasil diunduh');
  }

  downloadPngBtn.addEventListener('click', () => download('image/png', 'png'));
  downloadWebpBtn.addEventListener('click', () => download('image/webp', 'webp'));

  function showToast(msg){
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // Pastikan web font sudah kepasang sebelum render pertama, biar measureText
  // (buat auto-fit ukuran font) akurat sejak awal, bukan ngukur pakai fallback dulu.
  if (document.fonts && document.fonts.ready) {
    document.fonts.load(`16px 'Archivo Narrow'`).then(render).catch(render);
    document.fonts.ready.then(render);
  }
  render();
})();
