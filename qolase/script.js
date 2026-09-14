(function(){
  const stage = document.getElementById('stage');
  const emptyHint = document.getElementById('emptyHint');
  const emptyText = document.getElementById('emptyText');
  const fileInput = document.getElementById('fileInput');
  const slotFileInput = document.getElementById('slotFileInput');
  const btnAdd = document.getElementById('btnAdd');
  const btnFront = document.getElementById('btnFront');
  const btnBack = document.getElementById('btnBack');
  const btnDelete = document.getElementById('btnDelete');
  const btnDownload = document.getElementById('btnDownload');
  const downloadFloatInner = document.getElementById('downloadFloatInner');
  const ratioSelect = document.getElementById('ratioSelect');
  const resSheetOverlay = document.getElementById('resSheetOverlay');
  const btnResCancel = document.getElementById('btnResCancel');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const freeControls = document.getElementById('freeControls');
  const freeGroup = document.getElementById('freeGroup');
  const tplGroup = document.getElementById('tplGroup');
  const tplStrip = document.getElementById('tplStrip');
  const tplLabel = document.getElementById('tplLabel');
  const modeFreeBtn = document.getElementById('modeFreeBtn');
  const modeGridBtn = document.getElementById('modeGridBtn');
  const modeAutoBtn = document.getElementById('modeAutoBtn');
  const freeLayerEl = document.getElementById('freeLayer');
  const gridLayerEl = document.getElementById('gridLayer');
  const autoLayerEl = document.getElementById('autoLayer');
  const autoGroup = document.getElementById('autoGroup');
  const btnClearAuto = document.getElementById('btnClearAuto');
  const autoColsSlider = document.getElementById('autoColsSlider');
  const autoRowsSlider = document.getElementById('autoRowsSlider');
  const ratioToolbar = document.getElementById('ratioToolbar');
  const autoRatioNote = document.getElementById('autoRatioNote');
  const hintFooter = document.getElementById('hintText');
  const btnClearGrid = document.getElementById('btnClearGrid');
  const propPanel = document.getElementById('propPanel');
  const propsGroup = document.getElementById('propsGroup');
  const globalPropsWrap = document.getElementById('globalPropsWrap');
  const selectedPropsWrap = document.getElementById('selectedPropsWrap');
  const radiusSlider = document.getElementById('radiusSlider');
  const sizeSlider = document.getElementById('sizeSlider');
  const sizeLabel = document.getElementById('sizeLabel');
  const gridPropActions = document.getElementById('gridPropActions');
  const btnReplacePhoto = document.getElementById('btnReplacePhoto');
  const btnRemovePhoto = document.getElementById('btnRemovePhoto');
  const gridGlobalPanel = document.getElementById('gridGlobalPanel');
  const globalGapSlider = document.getElementById('globalGapSlider');
  const globalRadiusSlider = document.getElementById('globalRadiusSlider');

  let mode = 'free';
  let transparentBg = false;
  let currentBgColor = '#EFE9DD';

  // Returns whichever slot array is relevant to the current mode, so shared
  // grid-style logic (selection, sliders, export, clearing) can work the
  // same way for both the fixed-template grid and the auto square grid.
  function activeSlots(){ return mode === 'auto' ? autoSlots : gridSlots; }
  function activeLayer(){ return mode === 'auto' ? autoLayerEl : gridLayerEl; }

  function parseRatio(v){ const [w,h] = v.split(':').map(Number); return {w,h}; }
  function currentRatio(){
    if (mode === 'auto') return autoAspect();
    return parseRatio(ratioSelect.value);
  }
  function setStageRatio(){ const r = currentRatio(); stage.style.aspectRatio = r.w + '/' + r.h; }
  ratioSelect.addEventListener('change', setStageRatio);
  setStageRatio();

  document.querySelectorAll('.swatch[data-color]').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      transparentBg = false; currentBgColor = sw.dataset.color;
      stage.classList.remove('checker'); stage.style.background = currentBgColor;
    });
  });
  document.getElementById('customColor').addEventListener('input', (e) => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    e.target.closest('.swatch').classList.add('active');
    transparentBg = false; currentBgColor = e.target.value;
    stage.classList.remove('checker'); stage.style.background = currentBgColor;
  });
  document.getElementById('swTransparent').addEventListener('click', (e) => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    e.target.classList.add('active');
    transparentBg = true; stage.classList.add('checker'); stage.style.background = '';
  });

  function updateEmptyHint(){
    if (mode === 'free'){
      emptyHint.style.display = layers.length ? 'none' : 'flex';
      emptyText.innerHTML = 'Belum ada foto.<br>Ketuk "Tambah Foto" untuk mulai.';
    } else if (mode === 'grid'){
      const hasTpl = currentTemplate !== null;
      const hasAny = gridSlots.some(s => s.src);
      emptyText.innerHTML = 'Pilih template grid di atas,<br>lalu ketuk kotak untuk isi foto.';
      emptyHint.style.display = (hasTpl || hasAny) ? 'none' : 'flex';
      btnClearGrid.style.display = hasAny ? 'flex' : 'none';
    } else {
      // Auto mode always has at least one square ready, so the individual
      // "+" icons inside each slot are enough of a hint on their own.
      emptyHint.style.display = 'none';
      const hasAny = autoSlots.some(s => s.src);
      btnClearAuto.style.display = hasAny ? 'flex' : 'none';
    }
    updateDownloadState();
  }

  // Slides the main download button in/out from the bottom depending on
  // whether there's any photo ready to export in the current mode.
  function updateDownloadState(){
    const hasContent = mode === 'free' ? layers.length > 0 : activeSlots().some(s => s.src);
    downloadFloatInner.classList.toggle('hidden', !hasContent);
  }

  // ===================== SLIDER STEPPERS (count + / -) =====================
  const stepperSync = {};
  function formatStepValue(v){
    const n = Math.round(v * 10) / 10;
    return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
  }
  function initStepper(sliderId, valId){
    const slider = document.getElementById(sliderId);
    const val = document.getElementById(valId);
    if (!slider || !val) return;
    const sync = () => { val.textContent = formatStepValue(parseFloat(slider.value)); };
    slider.addEventListener('input', sync);
    stepperSync[sliderId] = sync;
    sync();
  }
  [['globalGapSlider','globalGapVal'],['globalRadiusSlider','globalRadiusVal'],
   ['radiusSlider','radiusVal'],['sizeSlider','sizeVal'],
   ['autoColsSlider','autoColsVal'],['autoRowsSlider','autoRowsVal']].forEach(([s,v]) => initStepper(s, v));

  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const slider = document.getElementById(btn.dataset.for);
      if (!slider) return;
      const step = parseFloat(slider.step) || 1;
      const dir = parseFloat(btn.dataset.step);
      const min = parseFloat(slider.min), max = parseFloat(slider.max);
      let v = Math.round((parseFloat(slider.value) + dir * step) * 100) / 100;
      v = Math.min(max, Math.max(min, v));
      slider.value = v;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  // Shows/hides the merged "Semua Foto" / "Foto Terpilih" box as a whole,
  // depending on whether either of its two sub-sections has anything to show.
  function updatePropsGroupVisibility(){
    const globalVisible = globalPropsWrap.style.display !== 'none';
    const selectedVisible = selectedPropsWrap.style.display !== 'none';
    propsGroup.style.display = (globalVisible || selectedVisible) ? 'block' : 'none';
  }

  function hidePropPanel(){
    selectedPropsWrap.style.display = 'none';
    updatePropsGroupVisibility();
  }

  function setMode(m){
    mode = m;
    modeFreeBtn.classList.toggle('active', m === 'free');
    modeGridBtn.classList.toggle('active', m === 'grid');
    modeAutoBtn.classList.toggle('active', m === 'auto');
    freeGroup.style.display = m === 'free' ? 'block' : 'none';
    tplGroup.style.display = m === 'grid' ? 'block' : 'none';
    autoGroup.style.display = m === 'auto' ? 'block' : 'none';
    ratioToolbar.style.display = m === 'auto' ? 'none' : 'flex';
    autoRatioNote.style.display = m === 'auto' ? 'block' : 'none';
    globalPropsWrap.style.display = (m === 'grid' || m === 'auto') ? 'block' : 'none';
    freeLayerEl.classList.toggle('hidden', m !== 'free');
    gridLayerEl.classList.toggle('hidden', m !== 'grid');
    autoLayerEl.classList.toggle('hidden', m !== 'auto');
    hintFooter.textContent = m === 'free'
      ? 'Geser untuk pindah · titik biru: ukuran · titik kuning: putar · pilih foto untuk atur sudut'
      : m === 'grid'
      ? 'Ketuk kotak kosong untuk isi foto · ketuk foto untuk pilih, atur ukuran & sudutnya'
      : 'Atur kolom & baris di bawah · ketuk kotak untuk isi foto · ketuk foto untuk pilih';
    if (m === 'free') selectSlot(null); else selectLayer(null);
    hidePropPanel();
    setStageRatio();
    updateStageRounding();
    updateEmptyHint();
  }
  modeFreeBtn.addEventListener('click', () => setMode('free'));
  modeGridBtn.addEventListener('click', () => setMode('grid'));
  modeAutoBtn.addEventListener('click', () => setMode('auto'));

  function getStageRect(){ return stage.getBoundingClientRect(); }

  // ===================== FREE MODE =====================
  let layers = [];
  let idCounter = 1;
  let zCounter = 1;
  let selectedId = null;

  btnAdd.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (mode === 'free') files.forEach((file, i) => addFreeImageFile(file, i));
    else fillGridSequentially(files);
    fileInput.value = '';
  });

  function addFreeImageFile(file, offsetIndex){
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const r = currentRatio();
        const STAGE_W = 1000, STAGE_H = 1000 * (r.h / r.w);
        let wPct = 45;
        let hPct = wPct * (STAGE_W / STAGE_H) * (img.naturalHeight / img.naturalWidth);
        if (hPct > 80) { hPct = 80; wPct = hPct * (STAGE_H / STAGE_W) * (img.naturalWidth / img.naturalHeight); }
        const jitter = (offsetIndex % 6) * 3;
        const layer = {
          id: idCounter++, src: ev.target.result, natW: img.naturalWidth, natH: img.naturalHeight,
          xPct: 27 + jitter, yPct: 27 + jitter, wPct: wPct, hPct: hPct,
          rot: (Math.random() * 10 - 5), z: zCounter++, radius: 0
        };
        layers.push(layer);
        renderFreeLayer(layer);
        selectLayer(layer.id);
        updateEmptyHint();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderFreeLayer(layer){
    const el = document.createElement('div');
    el.className = 'layer';
    el.dataset.id = layer.id;
    el.innerHTML = `
      <img src="${layer.src}" draggable="false">
      <div class="handle del"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></div>
      <div class="handle rotate"><svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"><path d="M3 12a9 9 0 1 1 3 6.7"/><path d="M3 21v-6h6"/></svg></div>
      <div class="handle resize"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round"><path d="M6 18L18 6M18 6h-6M18 6v6"/></svg></div>
      <div class="marching-ants"></div>
    `;
    freeLayerEl.appendChild(el);
    layer.el = el;
    applyLayerStyle(layer);

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.handle')) return;
      selectLayer(layer.id);
      startDragMove(e, layer);
    });
    el.querySelector('.handle.resize').addEventListener('pointerdown', (e) => {
      e.stopPropagation(); selectLayer(layer.id); startDragResize(e, layer);
    });
    el.querySelector('.handle.rotate').addEventListener('pointerdown', (e) => {
      e.stopPropagation(); selectLayer(layer.id); startDragRotate(e, layer);
    });
    el.querySelector('.handle.del').addEventListener('pointerdown', (e) => {
      e.stopPropagation(); deleteLayer(layer.id);
    });
  }

  // Converts a 0-50 radius value into a pixel radius capped at half the
  // element's smaller side, so radius 50 always yields a perfect pill/circle
  // instead of a CSS "%" oval on non-square elements.
  function pxRadius(w, h, radiusVal){
    return (radiusVal || 0) / 100 * Math.min(w, h);
  }

  function applyLayerStyle(layer){
    layer.el.style.left = layer.xPct + '%';
    layer.el.style.top = layer.yPct + '%';
    layer.el.style.width = layer.wPct + '%';
    layer.el.style.height = layer.hPct + '%';
    layer.el.style.transform = `rotate(${layer.rot}deg)`;
    layer.el.style.zIndex = layer.z;
    const rad = pxRadius(layer.el.offsetWidth, layer.el.offsetHeight, layer.radius);
    layer.el.querySelector('img').style.borderRadius = rad + 'px';
  }

  function selectLayer(id){
    selectedId = id;
    layers.forEach(l => l.el.classList.toggle('selected', l.id === id));
    const has = selectedId !== null;
    btnFront.disabled = !has; btnBack.disabled = !has; btnDelete.disabled = !has;
    if (has){
      const l = layers.find(l => l.id === id);
      gridPropActions.style.display = 'none';
      sizeLabel.textContent = 'Ukuran';
      sizeSlider.min = 6; sizeSlider.max = 150; sizeSlider.value = l.wPct;
      radiusSlider.value = l.radius || 0;
      stepperSync.sizeSlider && stepperSync.sizeSlider();
      stepperSync.radiusSlider && stepperSync.radiusSlider();
      selectedPropsWrap.style.display = 'block';
      updatePropsGroupVisibility();
    } else if (mode === 'free'){
      hidePropPanel();
    }
  }

  stage.addEventListener('pointerdown', (e) => {
    if (mode === 'free' && (e.target === stage || e.target === freeLayerEl)) selectLayer(null);
    if ((mode === 'grid' || mode === 'auto') && (e.target === stage || e.target === activeLayer())) selectSlot(null);
  });

  function deleteLayer(id){
    const idx = layers.findIndex(l => l.id === id);
    if (idx === -1) return;
    layers[idx].el.remove();
    layers.splice(idx, 1);
    if (selectedId === id) selectLayer(null);
    updateEmptyHint();
  }

  btnDelete.addEventListener('click', () => { if (selectedId !== null) deleteLayer(selectedId); });
  btnFront.addEventListener('click', () => { const l = layers.find(l => l.id === selectedId); if (l) { l.z = zCounter++; applyLayerStyle(l); } });
  btnBack.addEventListener('click', () => {
    const l = layers.find(l => l.id === selectedId);
    if (!l) return;
    const minZ = Math.min(...layers.map(x => x.z));
    l.z = minZ - 1; applyLayerStyle(l);
  });

  function startDragMove(e, layer){
    layer.el.setPointerCapture(e.pointerId);
    layer.el.style.cursor = 'grabbing';
    const startX = e.clientX, startY = e.clientY;
    const startXPct = layer.xPct, startYPct = layer.yPct;
    const rect = getStageRect();
    function onMove(ev){
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      layer.xPct = startXPct + (dx / rect.width) * 100;
      layer.yPct = startYPct + (dy / rect.height) * 100;
      applyLayerStyle(layer);
    }
    function onUp(){
      layer.el.releasePointerCapture(e.pointerId);
      layer.el.style.cursor = 'grab';
      layer.el.removeEventListener('pointermove', onMove);
      layer.el.removeEventListener('pointerup', onUp);
    }
    layer.el.addEventListener('pointermove', onMove);
    layer.el.addEventListener('pointerup', onUp);
  }

  function startDragResize(e, layer){
    const handle = e.target.closest('.handle');
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startW = layer.wPct;
    const rect = getStageRect();
    const r = currentRatio();
    const STAGE_W = 1000, STAGE_H = 1000 * (r.h / r.w);
    function onMove(ev){
      const dx = ev.clientX - startX;
      let newWPct = startW + (dx / rect.width) * 100;
      newWPct = Math.max(6, Math.min(150, newWPct));
      layer.wPct = newWPct;
      layer.hPct = newWPct * (STAGE_W / STAGE_H) * (layer.natH / layer.natW);
      applyLayerStyle(layer);
      if (selectedId === layer.id) sizeSlider.value = newWPct;
    }
    function onUp(){
      handle.releasePointerCapture(e.pointerId);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
    }
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  }

  function startDragRotate(e, layer){
    const handle = e.target.closest('.handle');
    handle.setPointerCapture(e.pointerId);
    const rect = getStageRect();
    function centerOf(){
      const cx = rect.left + (layer.xPct/100)*rect.width + (layer.wPct/100*rect.width)/2;
      const cy = rect.top + (layer.yPct/100)*rect.height + (layer.hPct/100*rect.height)/2;
      return {cx, cy};
    }
    function angleTo(clientX, clientY){ const {cx, cy} = centerOf(); return Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI; }
    const startAngle = angleTo(e.clientX, e.clientY);
    const startRot = layer.rot;
    function onMove(ev){
      const a = angleTo(ev.clientX, ev.clientY);
      layer.rot = startRot + (a - startAngle) + 90;
      applyLayerStyle(layer);
    }
    function onUp(){
      handle.releasePointerCapture(e.pointerId);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
    }
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  }

  // ===================== GRID MODE =====================
  function equalGrid(rows, cols, gap){
    const cells = [];
    const cellW = (100 - gap*(cols-1)) / cols;
    const cellH = (100 - gap*(rows-1)) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      cells.push({ x: c*(cellW+gap), y: r*(cellH+gap), w: cellW, h: cellH });
    return cells;
  }
  // Splits `total` into slices sized by `ratios` (which sum to 1), leaving `gap`
  // of space between each slice. Used so every template can be regenerated at
  // any gap value (including 0, where photos sit flush against each other).
  function splitRatio(total, gap, ratios){
    const content = total - gap * (ratios.length - 1);
    let pos = 0;
    return ratios.map(r => {
      const size = r * content;
      const item = { pos, size };
      pos += size + gap;
      return item;
    });
  }
  const GAP = 3;
  const TEMPLATES = [
    { id:'2col', name:'2 Kolom', build: g => equalGrid(1,2,g) },
    { id:'3col', name:'3 Kolom', build: g => equalGrid(1,3,g) },
    { id:'4col', name:'4 Kolom', build: g => equalGrid(1,4,g) },
    { id:'2x2', name:'2x2', build: g => equalGrid(2,2,g) },
    { id:'2x3', name:'2x3', build: g => equalGrid(2,3,g) },
    { id:'3x2', name:'3x2', build: g => equalGrid(3,2,g) },
    { id:'3x3', name:'3x3', build: g => equalGrid(3,3,g) },
    { id:'4x4', name:'4x4 (16 foto)', build: g => equalGrid(4,4,g) },
    { id:'big-left', name:'1 Besar + 2 Kecil', build: g => {
        const cols = splitRatio(100, g, [0.66, 0.34]);
        const rows = splitRatio(100, g, [0.5, 0.5]);
        return [
          { x:0, y:0, w:cols[0].size, h:100 },
          { x:cols[1].pos, y:rows[0].pos, w:cols[1].size, h:rows[0].size },
          { x:cols[1].pos, y:rows[1].pos, w:cols[1].size, h:rows[1].size },
        ];
    }},
    { id:'big-right', name:'2 Kecil + 1 Besar', build: g => {
        const cols = splitRatio(100, g, [0.34, 0.66]);
        const rows = splitRatio(100, g, [0.5, 0.5]);
        return [
          { x:cols[0].pos, y:rows[0].pos, w:cols[0].size, h:rows[0].size },
          { x:cols[0].pos, y:rows[1].pos, w:cols[0].size, h:rows[1].size },
          { x:cols[1].pos, y:0, w:cols[1].size, h:100 },
        ];
    }},
    { id:'two-top', name:'2 Atas + 1 Bawah', build: g => {
        const rows = splitRatio(100, g, [0.66, 0.34]);
        const cols = splitRatio(100, g, [0.5, 0.5]);
        return [
          { x:cols[0].pos, y:0, w:cols[0].size, h:rows[0].size },
          { x:cols[1].pos, y:0, w:cols[1].size, h:rows[0].size },
          { x:0, y:rows[1].pos, w:100, h:rows[1].size },
        ];
    }},
    { id:'big-top', name:'1 Besar Atas + 2 Bawah', build: g => {
        const rows = splitRatio(100, g, [0.66, 0.34]);
        const cols = splitRatio(100, g, [0.5, 0.5]);
        return [
          { x:0, y:0, w:100, h:rows[0].size },
          { x:cols[0].pos, y:rows[1].pos, w:cols[0].size, h:rows[1].size },
          { x:cols[1].pos, y:rows[1].pos, w:cols[1].size, h:rows[1].size },
        ];
    }},
    { id:'big-4small', name:'1 Besar + 4 Kecil', build: g => {
        const cols = splitRatio(100, g, [0.62, 0.38]);
        const rightX = cols[1].pos, rightW = cols[1].size;
        const rows = splitRatio(100, g, [0.5, 0.5]);
        const rightCols = splitRatio(rightW, g, [0.5, 0.5]);
        return [
          { x:0, y:0, w:cols[0].size, h:100 },
          { x:rightX+rightCols[0].pos, y:rows[0].pos, w:rightCols[0].size, h:rows[0].size },
          { x:rightX+rightCols[1].pos, y:rows[0].pos, w:rightCols[1].size, h:rows[0].size },
          { x:rightX+rightCols[0].pos, y:rows[1].pos, w:rightCols[0].size, h:rows[1].size },
          { x:rightX+rightCols[1].pos, y:rows[1].pos, w:rightCols[1].size, h:rows[1].size },
        ];
    }},
    { id:'5col', name:'5 Kolom', build: g => equalGrid(1,5,g) },
    { id:'3row', name:'3 Baris', build: g => equalGrid(3,1,g) },
    { id:'2x4', name:'2x4 (8 foto)', build: g => equalGrid(2,4,g) },
    { id:'4x2', name:'4x2 (8 foto)', build: g => equalGrid(4,2,g) },
    { id:'big-left3', name:'1 Besar Kiri + 3 Kanan', build: g => {
        const cols = splitRatio(100, g, [0.6, 0.4]);
        const rightRows = splitRatio(100, g, [1/3, 1/3, 1/3]);
        return [
          { x:0, y:0, w:cols[0].size, h:100 },
          { x:cols[1].pos, y:rightRows[0].pos, w:cols[1].size, h:rightRows[0].size },
          { x:cols[1].pos, y:rightRows[1].pos, w:cols[1].size, h:rightRows[1].size },
          { x:cols[1].pos, y:rightRows[2].pos, w:cols[1].size, h:rightRows[2].size },
        ];
    }},
    { id:'4top-1bottom', name:'4 Kecil Atas + 1 Besar Bawah', build: g => {
        const rows = splitRatio(100, g, [0.38, 0.62]);
        const topCols = splitRatio(100, g, [0.25,0.25,0.25,0.25]);
        return [
          { x:topCols[0].pos, y:0, w:topCols[0].size, h:rows[0].size },
          { x:topCols[1].pos, y:0, w:topCols[1].size, h:rows[0].size },
          { x:topCols[2].pos, y:0, w:topCols[2].size, h:rows[0].size },
          { x:topCols[3].pos, y:0, w:topCols[3].size, h:rows[0].size },
          { x:0, y:rows[1].pos, w:100, h:rows[1].size },
        ];
    }},
  ];
  TEMPLATES.forEach(tpl => { tpl.cells = tpl.build(GAP); });
  let currentTemplate = null;
  let gridSlots = [];
  let selectedSlotIdx = null;
  let currentGap = GAP;
  let currentGlobalRadius = 4;

  // ===================== AUTO GRID (1:1 squares, unlimited count) =====================
  let autoSlots = [];
  let autoCols = 3;
  let autoRows = 2;

  // Computes the (row-major) list of square cells for the current column
  // and row count, reusing the same equalGrid math the fixed templates use.
  function autoCellList(gap){
    return equalGrid(autoRows, autoCols, gap);
  }

  // The canvas aspect ratio for auto mode is derived from columns/rows
  // instead of the ratio dropdown, so every cell comes out square.
  // Cell width/height as a percentage of the stage only comes out equal
  // (square) when the stage's own aspect ratio also accounts for the gap
  // eaten out of each axis — otherwise cols != rows + a nonzero gap warps
  // the cells away from 1:1. Derived by setting cellW_px == cellH_px.
  function autoAspect(){
    const g = currentGap;
    const rowsPart = Math.max(100 - g*(autoRows-1), 1);
    const colsPart = Math.max(100 - g*(autoCols-1), 1);
    return { w: autoCols * rowsPart, h: autoRows * colsPart };
  }

  // Repositions/resizes existing auto slots (e.g. when the gap changes)
  // without touching photos already placed inside them.
  function applyAutoCells(gap){
    currentGap = gap;
    const cells = autoCellList(gap);
    cells.forEach((c, i) => {
      const slot = autoSlots[i];
      if (!slot) return;
      slot.x = c.x; slot.y = c.y; slot.w = c.w; slot.h = c.h;
      slot.el.style.left = c.x + '%';
      slot.el.style.top = c.y + '%';
      slot.el.style.width = c.w + '%';
      slot.el.style.height = c.h + '%';
    });
    autoSlots.forEach(applySlotTransform);
    updateStageRounding();
  }

  // Fully rebuilds the auto grid's slots (used when the column or slot
  // count changes). Photos already placed are preserved by matching the
  // old slot at the same index into the new layout.
  function rebuildAutoGrid(){
    const cells = autoCellList(currentGap);
    const old = autoSlots;
    autoLayerEl.innerHTML = '';
    autoSlots = cells.map((c, idx) => {
      const prev = old[idx];
      return {
        idx, x:c.x, y:c.y, w:c.w, h:c.h,
        src: prev ? prev.src : null,
        natW: prev ? prev.natW : 0,
        natH: prev ? prev.natH : 0,
        radius: currentGlobalRadius,
        zoom: prev ? prev.zoom : 1,
        panX: prev ? prev.panX : 0,
        panY: prev ? prev.panY : 0,
      };
    });
    selectedSlotIdx = null;
    hidePropPanel();
    autoSlots.forEach(slot => {
      renderGridSlot(slot, autoLayerEl);
      if (slot.src){
        slot.el.classList.add('filled');
        setSlotHTML(slot.el, `<div class="slot-img-wrap"><img src="${slot.src}" draggable="false"></div>`);
      }
      applySlotTransform(slot);
    });
    if (mode === 'auto') setStageRatio();
    updateStageRounding();
    updateEmptyHint();
  }

  autoColsSlider.addEventListener('input', () => {
    autoCols = parseInt(autoColsSlider.value, 10);
    rebuildAutoGrid();
  });
  autoRowsSlider.addEventListener('input', () => {
    autoRows = parseInt(autoRowsSlider.value, 10);
    rebuildAutoGrid();
  });

  function tplPreviewSvg(cells){
    const pad = 3, size = 40;
    let rects = '';
    cells.forEach(c => {
      const x = pad + (c.x/100)*(size-2*pad), y = pad + (c.y/100)*(size-2*pad);
      const w = (c.w/100)*(size-2*pad), h = (c.h/100)*(size-2*pad);
      rects += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(w-1,1).toFixed(1)}" height="${Math.max(h-1,1).toFixed(1)}" rx="1.5"/>`;
    });
    return `<svg viewBox="0 0 40 40">${rects}</svg>`;
  }
  TEMPLATES.forEach(tpl => {
    const btn = document.createElement('button');
    btn.className = 'tpl-btn'; btn.title = tpl.name;
    btn.innerHTML = tplPreviewSvg(tpl.cells);
    btn.addEventListener('click', () => selectTemplate(tpl));
    tpl.btnEl = btn;
    tplStrip.appendChild(btn);
  });

  function selectTemplate(tpl){
    currentTemplate = tpl;
    TEMPLATES.forEach(t => t.btnEl.classList.toggle('active', t.id === tpl.id));
    gridLayerEl.innerHTML = '';
    selectedSlotIdx = null;
    hidePropPanel();
    const cells = tpl.build(currentGap);
    gridSlots = cells.map((c, idx) => ({ idx, x:c.x, y:c.y, w:c.w, h:c.h, src:null, natW:0, natH:0, radius:currentGlobalRadius, zoom:1, panX:0, panY:0 }));
    gridSlots.forEach(s => renderGridSlot(s, gridLayerEl));
    updateStageRounding();
    updateEmptyHint();
  }

  function updateStageRounding(){
    stage.style.borderRadius = '';
  }

  // Recomputes slot positions/sizes for the current template at a given gap,
  // without touching photos already placed inside the slots.
  function applyTemplateCells(gap){
    if (!currentTemplate) return;
    currentGap = gap;
    const cells = currentTemplate.build(gap);
    cells.forEach((c, i) => {
      const slot = gridSlots[i];
      if (!slot) return;
      slot.x = c.x; slot.y = c.y; slot.w = c.w; slot.h = c.h;
      slot.el.style.left = c.x + '%';
      slot.el.style.top = c.y + '%';
      slot.el.style.width = c.w + '%';
      slot.el.style.height = c.h + '%';
    });
    gridSlots.forEach(applySlotTransform);
    updateStageRounding();
  }

  function emptySlotHTML(){
    return `<div class="plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>`;
  }

  // Sets a grid-slot's content while preserving the marching-ants overlay,
  // which would otherwise be wiped out by a plain innerHTML replacement.
  function setSlotHTML(el, html){
    el.innerHTML = html + '<div class="marching-ants"></div>';
  }

  function renderGridSlot(slot, layerEl){
    const el = document.createElement('div');
    el.className = 'grid-slot';
    el.style.left = slot.x + '%'; el.style.top = slot.y + '%';
    el.style.width = slot.w + '%'; el.style.height = slot.h + '%';
    setSlotHTML(el, emptySlotHTML());
    layerEl.appendChild(el);
    el.style.borderRadius = pxRadius(el.offsetWidth, el.offsetHeight, slot.radius) + 'px';
    slot.el = el;

    el.addEventListener('pointerdown', (e) => {
      if (!slot.src){ selectedSlotIdxForPick = slot.idx; slotFileInput.click(); return; }
      if (selectedSlotIdx !== slot.idx){ selectSlot(slot.idx); return; }
      startSlotPan(e, slot);
    });
  }

  let selectedSlotIdxForPick = null;

  function fillSlot(slot, dataUrl, natW, natH){
    slot.src = dataUrl; slot.natW = natW; slot.natH = natH;
    slot.zoom = 1; slot.panX = 0; slot.panY = 0;
    slot.el.classList.add('filled');
    setSlotHTML(slot.el, `<div class="slot-img-wrap"><img src="${dataUrl}" draggable="false" style="transform:scale(1) translate(0%,0%)"></div>`);
    applySlotTransform(slot);
    updateEmptyHint();
  }

  slotFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    slotFileInput.value = '';
    if (!file || selectedSlotIdxForPick === null) return;
    const slot = activeSlots().find(s => s.idx === selectedSlotIdxForPick);
    if (!slot) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => { fillSlot(slot, ev.target.result, img.naturalWidth, img.naturalHeight); selectSlot(slot.idx); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  function fillGridSequentially(files){
    if (mode === 'grid' && !currentTemplate){ alert('Pilih template grid dulu ya.'); return; }
    const empties = activeSlots().filter(s => !s.src);
    if (!empties.length){ alert('Semua kotak sudah terisi.'); return; }
    files.slice(0, empties.length).forEach((file, i) => {
      const slot = empties[i];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => fillSlot(slot, ev.target.result, img.naturalWidth, img.naturalHeight);
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function selectSlot(idx){
    selectedSlotIdx = idx;
    activeSlots().forEach(s => s.el && s.el.classList.toggle('selected', s.idx === idx));
    if (idx === null){ hidePropPanel(); return; }
    const slot = activeSlots().find(s => s.idx === idx);
    gridPropActions.style.display = 'flex';
    sizeLabel.textContent = 'Perbesar';
    sizeSlider.min = 100; sizeSlider.max = 300; sizeSlider.value = Math.round(slot.zoom * 100);
    radiusSlider.value = slot.radius;
    stepperSync.sizeSlider && stepperSync.sizeSlider();
    stepperSync.radiusSlider && stepperSync.radiusSlider();
    selectedPropsWrap.style.display = 'block';
    updatePropsGroupVisibility();
  }

  function applySlotTransform(slot){
    const img = slot.el.querySelector('img');
    if (img) img.style.transform = `scale(${slot.zoom}) translate(${slot.panX}%, ${slot.panY}%)`;
    slot.el.style.borderRadius = pxRadius(slot.el.offsetWidth, slot.el.offsetHeight, slot.radius) + 'px';
  }

  function startSlotPan(e, slot){
    const wrap = slot.el.querySelector('.slot-img-wrap');
    if (!wrap) return;
    wrap.setPointerCapture(e.pointerId);
    const startX = e.clientX, startY = e.clientY;
    const startPanX = slot.panX, startPanY = slot.panY;
    const rect = slot.el.getBoundingClientRect();
    function onMove(ev){
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      const maxOff = (slot.zoom - 1) * 50;
      let nx = startPanX + (dx / rect.width) * 100 / slot.zoom;
      let ny = startPanY + (dy / rect.height) * 100 / slot.zoom;
      slot.panX = Math.max(-maxOff, Math.min(maxOff, nx));
      slot.panY = Math.max(-maxOff, Math.min(maxOff, ny));
      applySlotTransform(slot);
    }
    function onUp(){
      wrap.releasePointerCapture(e.pointerId);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
    }
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
  }

  btnReplacePhoto.addEventListener('click', () => {
    if (selectedSlotIdx === null) return;
    selectedSlotIdxForPick = selectedSlotIdx;
    slotFileInput.click();
  });
  btnRemovePhoto.addEventListener('click', () => {
    if (selectedSlotIdx === null) return;
    const slot = activeSlots().find(s => s.idx === selectedSlotIdx);
    if (!slot) return;
    slot.src = null;
    slot.el.classList.remove('filled');
    setSlotHTML(slot.el, emptySlotHTML());
    applySlotTransform(slot);
    selectSlot(null);
    updateEmptyHint();
  });

  globalGapSlider.addEventListener('input', () => {
    const g = parseFloat(globalGapSlider.value);
    if (mode === 'auto') { applyAutoCells(g); setStageRatio(); }
    else applyTemplateCells(g);
  });
  globalRadiusSlider.addEventListener('input', () => {
    const v = parseFloat(globalRadiusSlider.value);
    currentGlobalRadius = v;
    activeSlots().forEach(s => { s.radius = v; applySlotTransform(s); });
    if (selectedSlotIdx !== null){ radiusSlider.value = v; stepperSync.radiusSlider && stepperSync.radiusSlider(); }
    updateStageRounding();
  });

  // Clears the photos from every slot in the given slot array while keeping
  // the slot boxes themselves (shared by the "Kosongkan" button in both the
  // fixed-template grid and the auto square grid).
  function clearSlots(slots){
    slots.forEach(s => { s.src = null; s.el.classList.remove('filled'); setSlotHTML(s.el, emptySlotHTML()); applySlotTransform(s); });
    selectSlot(null);
    updateEmptyHint();
  }
  btnClearGrid.addEventListener('click', () => clearSlots(gridSlots));
  btnClearAuto.addEventListener('click', () => clearSlots(autoSlots));

  // ===================== SHARED PROPERTY PANEL =====================
  radiusSlider.addEventListener('input', () => {
    const v = parseFloat(radiusSlider.value);
    if (mode === 'free' && selectedId !== null){
      const l = layers.find(l => l.id === selectedId);
      if (l){ l.radius = v; applyLayerStyle(l); }
    } else if ((mode === 'grid' || mode === 'auto') && selectedSlotIdx !== null){
      const slot = activeSlots().find(s => s.idx === selectedSlotIdx);
      if (slot){ slot.radius = v; applySlotTransform(slot); }
    }
  });
  sizeSlider.addEventListener('input', () => {
    const v = parseFloat(sizeSlider.value);
    if (mode === 'free' && selectedId !== null){
      const l = layers.find(l => l.id === selectedId);
      if (l){
        const r = currentRatio();
        const STAGE_W = 1000, STAGE_H = 1000 * (r.h / r.w);
        l.wPct = v;
        l.hPct = v * (STAGE_W / STAGE_H) * (l.natH / l.natW);
        applyLayerStyle(l);
      }
    } else if ((mode === 'grid' || mode === 'auto') && selectedSlotIdx !== null){
      const slot = activeSlots().find(s => s.idx === selectedSlotIdx);
      if (slot){
        slot.zoom = v / 100;
        const maxOff = (slot.zoom - 1) * 50;
        slot.panX = Math.max(-maxOff, Math.min(maxOff, slot.panX));
        slot.panY = Math.max(-maxOff, Math.min(maxOff, slot.panY));
        applySlotTransform(slot);
      }
    }
  });

  selectTemplate(TEMPLATES[2]);
  rebuildAutoGrid();
  setMode('grid');
  document.getElementById('watermarkYear').textContent = new Date().getFullYear();

  // Radius is stored as a percentage but rendered as a fixed px value (see
  // pxRadius), so it must be recomputed whenever the stage's actual pixel
  // size changes (e.g. rotating the phone or resizing the window).
  window.addEventListener('resize', () => {
    layers.forEach(applyLayerStyle);
    gridSlots.forEach(applySlotTransform);
    autoSlots.forEach(applySlotTransform);
  });

  // ===================== EXPORT =====================
  function roundedRectPath(ctx, x, y, w, h, r){
    r = Math.max(0, Math.min(r, Math.min(w,h)/2));
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  let toastTimer = null;
  function showToast(msg){
    toastMsg.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function openResSheet(){
    const hasContent = mode === 'free' ? layers.length > 0 : activeSlots().some(s => s.src);
    if (!hasContent){
      showToast(mode === 'free' ? 'Tambahkan setidaknya satu foto dulu' : 'Isi minimal satu kotak grid dulu');
      return;
    }
    resSheetOverlay.classList.add('open');
  }
  function closeResSheet(){ resSheetOverlay.classList.remove('open'); }

  btnDownload.addEventListener('click', openResSheet);
  btnResCancel.addEventListener('click', closeResSheet);
  resSheetOverlay.addEventListener('click', (e) => { if (e.target === resSheetOverlay) closeResSheet(); });
  document.querySelectorAll('.res-option').forEach(btn => {
    btn.addEventListener('click', () => {
      closeResSheet();
      exportCollage(parseInt(btn.dataset.res, 10));
    });
  });

  function exportCollage(EXPORT_W_INPUT){
    const r = currentRatio();
    const EXPORT_W = EXPORT_W_INPUT;
    const EXPORT_H = Math.round(EXPORT_W * (r.h / r.w));

    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_W; canvas.height = EXPORT_H;
    const ctx = canvas.getContext('2d');
    ctx.save();
    if (!transparentBg){ ctx.fillStyle = currentBgColor; ctx.fillRect(0, 0, EXPORT_W, EXPORT_H); }

    if (mode === 'free'){
      if (!layers.length){ showToast('Tambahkan setidaknya satu foto dulu'); return; }
      const sorted = [...layers].sort((a,b) => a.z - b.z);
      const imgs = sorted.map(l => { const im = new Image(); im.src = l.src; return im; });
      let loaded = 0;
      function drawAll(){
        sorted.forEach((l, i) => {
          const im = imgs[i];
          const w = l.wPct/100 * EXPORT_W, h = l.hPct/100 * EXPORT_H;
          const cx = l.xPct/100 * EXPORT_W + w/2, cy = l.yPct/100 * EXPORT_H + h/2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(l.rot * Math.PI / 180);
          const rad = (l.radius||0)/100 * Math.min(w,h);
          roundedRectPath(ctx, -w/2, -h/2, w, h, rad);
          ctx.clip();
          ctx.drawImage(im, -w/2, -h/2, w, h);
          ctx.restore();
        });
        ctx.restore();
        finishDownload(canvas);
      }
      imgs.forEach(im => { if (im.complete) { loaded++; if (loaded === imgs.length) drawAll(); } else im.onload = () => { loaded++; if (loaded === imgs.length) drawAll(); }; });
    } else {
      const filled = activeSlots().filter(s => s.src);
      if (!filled.length){ showToast('Isi minimal satu kotak grid dulu'); return; }
      const imgs = filled.map(s => { const im = new Image(); im.src = s.src; return im; });
      let loaded = 0;
      function drawAll(){
        filled.forEach((slot, i) => {
          const im = imgs[i];
          const sx = slot.x/100 * EXPORT_W, sy = slot.y/100 * EXPORT_H;
          const sw = slot.w/100 * EXPORT_W, sh = slot.h/100 * EXPORT_H;
          const baseScale = Math.max(sw / slot.natW, sh / slot.natH) * slot.zoom;
          const drawW = slot.natW * baseScale, drawH = slot.natH * baseScale;
          const cx = sx + sw/2 + (slot.panX/100) * sw;
          const cy = sy + sh/2 + (slot.panY/100) * sh;
          ctx.save();
          const rad = (slot.radius||0)/100 * Math.min(sw,sh);
          roundedRectPath(ctx, sx, sy, sw, sh, rad);
          ctx.clip();
          ctx.drawImage(im, cx - drawW/2, cy - drawH/2, drawW, drawH);
          ctx.restore();
        });
        ctx.restore();
        finishDownload(canvas);
      }
      imgs.forEach(im => { if (im.complete) { loaded++; if (loaded === imgs.length) drawAll(); } else im.onload = () => { loaded++; if (loaded === imgs.length) drawAll(); }; });
    }
  }

  function makeFilename(){
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `kolase-${stamp}.png`;
  }

  function finishDownload(canvas){
    const link = document.createElement('a');
    link.download = makeFilename();
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Kolase berhasil diunduh');
  }
})();
