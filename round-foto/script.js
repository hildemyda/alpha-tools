(function(){
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const editor = document.getElementById('editor');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const radiusSlider = document.getElementById('radiusSlider');
  const radiusVal = document.getElementById('radiusVal');
  const bgSwatches = document.getElementById('bgSwatches');
  const customColor = document.getElementById('customColor');
  const changePhotoBtn = document.getElementById('changePhotoBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const toast = document.getElementById('toast');

  const MAX_DIM = 1800; // cap working resolution so huge phone photos stay snappy
  let img = null;
  let bgColor = 'transparent';

  // ---- Draws the current image into the canvas, clipped to a rounded
  // rect whose corner radius is a % of half the shorter side (so 100%
  // always yields a full circle/pill, whatever the photo's aspect ratio).
  function render(){
    if (!img) return;
    const w = canvas.width, h = canvas.height;
    const maxRadius = Math.min(w, h) / 2;
    const radius = (parseFloat(radiusSlider.value) / 100) * maxRadius;

    ctx.clearRect(0, 0, w, h);

    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(0, 0, w, h, radius);
    } else {
      roundRectPath(ctx, 0, 0, w, h, radius);
    }
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  }

  // Fallback path builder for browsers without CanvasRenderingContext2D.roundRect
  function roundRectPath(c, x, y, w, h, r){
    r = Math.min(r, w / 2, h / 2);
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
  }

  function loadImage(file){
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const image = new Image();
      image.onload = () => {
        let w = image.naturalWidth, h = image.naturalHeight;
        if (Math.max(w, h) > MAX_DIM) {
          const scale = MAX_DIM / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        img = image;
        canvas.width = w;
        canvas.height = h;
        dropzone.hidden = true;
        editor.hidden = false;
        render();
      };
      image.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---- Upload interactions ----
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadImage(fileInput.files[0]);
  });
  ['dragover', 'dragenter'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadImage(file);
  });

  changePhotoBtn.addEventListener('click', () => {
    img = null;
    fileInput.value = '';
    editor.hidden = true;
    dropzone.hidden = false;
  });

  // ---- Radius slider + its stepper buttons ----
  radiusSlider.addEventListener('input', () => {
    radiusVal.textContent = radiusSlider.value;
    render();
  });
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.for);
      const step = parseInt(btn.dataset.step, 10);
      const min = parseFloat(target.min), max = parseFloat(target.max);
      let val = parseFloat(target.value) + step;
      val = Math.max(min, Math.min(max, val));
      target.value = val;
      target.dispatchEvent(new Event('input'));
    });
  });

  // ---- Background swatches ----
  bgSwatches.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      if (sw.classList.contains('custom')) return; // handled by the color input's own change event
      bgSwatches.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      bgColor = sw.dataset.color;
      render();
    });
  });
  customColor.addEventListener('input', () => {
    bgSwatches.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    customColor.closest('.swatch').classList.add('active');
    bgColor = customColor.value;
    render();
  });

  // ---- Download ----
  downloadBtn.addEventListener('click', () => {
    if (!img) return;
    const link = document.createElement('a');
    link.download = 'round-foto.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Foto berhasil diunduh');
  });

  function showToast(msg){
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
  }
})();
