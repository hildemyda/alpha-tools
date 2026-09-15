(function () {
  const MAX_BYTES = 3 * 1024 * 1024; // 3MB, jaga-jaga terhadap limit body Vercel ~4.5MB

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const editor = document.getElementById('editor');
  const previewImg = document.getElementById('previewImg');
  const previewLabel = document.getElementById('previewLabel');
  const serverPicker = document.getElementById('serverPicker');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  const resultMeta = document.getElementById('resultMeta');
  const resultMetaText = document.getElementById('resultMetaText');
  const errorMsg = document.getElementById('errorMsg');
  const errorText = document.getElementById('errorText');
  const changePhotoBtn = document.getElementById('changePhotoBtn');
  const processBtn = document.getElementById('processBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const toast = document.getElementById('toast');
  const quotaNote = document.getElementById('quotaNote');

  const SERVER_LOADING_HINTS = {
    '1': 'Menghapus background lewat Dycoderss...',
    '2': 'Menghapus background lewat Photoroom...',
    '3': 'Menghapus background lewat BgEraser... bisa sampai 1 menit.',
    '6': 'Menghapus background lewat Pixa...',
    '7': 'Menghapus background lewat BG Remover...',
  };

  let originalDataUrl = null;
  let resultDataUrl = null;
  let selectedServer = '2';

  // ---- File selection ----
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
  });

  ['dragover', 'dragenter'].forEach(evt =>
    dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('dragover'); })
  );
  ['dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('dragover'); })
  );
  dropzone.addEventListener('drop', e => {
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('File yang dipilih bukan gambar.');
      return;
    }
    if (file.size > MAX_BYTES) {
      alert('Ukuran foto terlalu besar. Maksimal 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      originalDataUrl = reader.result;
      resultDataUrl = null;
      previewImg.src = originalDataUrl;
      previewLabel.textContent = 'PREVIEW';
      resetResultUI();
      dropzone.hidden = true;
      editor.hidden = false;
    };
    reader.readAsDataURL(file);
  }

  // ---- Server picker ----
  serverPicker.addEventListener('click', e => {
    const btn = e.target.closest('button[data-server]');
    if (!btn) return;
    selectedServer = btn.dataset.server;
    [...serverPicker.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));

    // Balik ke foto asli kalau user ganti server setelah ada hasil sebelumnya
    if (resultDataUrl) {
      previewImg.src = originalDataUrl;
      previewLabel.textContent = 'PREVIEW';
      resetResultUI();
    }
  });

  // ---- Change photo ----
  changePhotoBtn.addEventListener('click', () => {
    originalDataUrl = null;
    resultDataUrl = null;
    fileInput.value = '';
    editor.hidden = true;
    dropzone.hidden = false;
    resetResultUI();
  });

  // ---- Process ----
  processBtn.addEventListener('click', async () => {
    if (!originalDataUrl) return;

    clearError();
    resultMeta.classList.remove('show');
    downloadBtn.hidden = true;
    processBtn.disabled = true;
    loadingText.textContent = SERVER_LOADING_HINTS[selectedServer] || 'Menghapus background...';
    loadingOverlay.hidden = false;

    try {
      const res = await fetch('/api/removebg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: originalDataUrl, server: selectedServer }),
      });
      const data = await res.json();

      if (!data.ok) {
        showError(data.message || 'Gagal menghapus background.');
        renderQuotaNote(data);
        return;
      }

      resultDataUrl = data.image;
      previewImg.src = resultDataUrl;
      previewLabel.textContent = 'HASIL';

      const speedSec = (data.elapsedMs / 1000).toFixed(1);
      resultMetaText.textContent = `Selesai dalam ${speedSec}s · Server ${data.label}`;
      resultMeta.classList.add('show');

      downloadBtn.hidden = false;
      processBtn.textContent = 'Proses Ulang';
      renderQuotaNote(data);
    } catch (err) {
      showError('Terjadi kesalahan, coba lagi.');
    } finally {
      loadingOverlay.hidden = true;
      processBtn.disabled = false;
    }
  });

  // ---- Download ----
  downloadBtn.addEventListener('click', () => {
    if (!resultDataUrl) return;
    const a = document.createElement('a');
    a.href = resultDataUrl;
    a.download = `nobg-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Hasil berhasil diunduh');
  });

  function resetResultUI() {
    resultMeta.classList.remove('show');
    downloadBtn.hidden = true;
    processBtn.hidden = false;
    processBtn.textContent = 'Hapus Background';
    clearError();
  }

  function showError(message) {
    errorText.textContent = message;
    errorMsg.classList.add('show');
  }
  function clearError() {
    errorText.textContent = '';
    errorMsg.classList.remove('show');
  }

  function showToast(msg) {
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function renderQuotaNote(status){
    if (!quotaNote) return;
    if (status.unlimited || status.free || status.remaining === undefined) { quotaNote.textContent = ''; return; }
    quotaNote.textContent = `Sisa ${status.remaining} kredit`;
    quotaNote.classList.toggle('low', status.remaining <= 2);
  }

  async function loadQuotaStatus(){
    try {
      const res = await fetch('/api/quota-status?feature=removebg');
      const data = await res.json();
      if (data.ok) renderQuotaNote(data);
    } catch (err) { /* diamkan, gak krusial buat pengalaman utama */ }
  }
  loadQuotaStatus();
})();
