(function(){
  const urlInput = document.getElementById('urlInput');
  const pasteBtn = document.getElementById('pasteBtn');
  const fetchBtn = document.getElementById('fetchBtn');
  const errorMsg = document.getElementById('errorMsg');
  const errorText = document.getElementById('errorText');
  const result = document.getElementById('result');
  const resultCount = document.getElementById('resultCount');
  const resultList = document.getElementById('resultList');
  const toast = document.getElementById('toast');

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) { urlInput.value = text.trim(); clearError(); }
    } catch {
      // clipboard permission ditolak / gak didukung -> biarkan user paste manual
    }
  });

  fetchBtn.addEventListener('click', fetchMedia);
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchMedia(); });

  async function fetchMedia(){
    const url = urlInput.value.trim();
    if (!url) { showError('Link Instagram belum diisi.'); return; }
    if (!/instagram\.com\//i.test(url)) { showError('Ini bukan link Instagram.'); return; }

    clearError();
    result.hidden = true;
    resultList.innerHTML = '';
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Mengambil...';

    try {
      const res = await fetch(`/api/igdl?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!data.ok) {
        showError(data.message || 'Gagal mengambil media.');
        return;
      }

      renderItems(data.items);
    } catch (err) {
      showError('Terjadi kesalahan, coba lagi.');
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.textContent = 'Ambil Media';
    }
  }

  function renderItems(items){
    resultCount.textContent = items.length > 1
      ? `${items.length} media ditemukan`
      : '1 media ditemukan';

    items.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'media-card';

      const preview = document.createElement('div');
      preview.className = 'media-preview';
      if (item.type === 'video') {
        const video = document.createElement('video');
        video.src = item.url;
        video.controls = true;
        video.playsInline = true;
        preview.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = item.url;
        img.loading = 'lazy';
        img.alt = item.title || 'Instagram media';
        preview.appendChild(img);
      }

      const actions = document.createElement('div');
      actions.className = 'media-actions';

      const dlBtn = document.createElement('a');
      dlBtn.className = 'media-download';
      dlBtn.href = `/api/igdl-file?url=${encodeURIComponent(item.url)}&name=${encodeURIComponent('ig-media-' + (i + 1))}`;
      dlBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg> Unduh`;
      dlBtn.addEventListener('click', () => showToast('Sedang diunduh...'));

      const fallback = document.createElement('a');
      fallback.className = 'media-fallback';
      fallback.href = item.url;
      fallback.target = '_blank';
      fallback.rel = 'noopener';
      fallback.title = 'Buka link asli (kalau tombol Unduh gagal)';
      fallback.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>`;

      actions.appendChild(dlBtn);
      actions.appendChild(fallback);
      card.appendChild(preview);
      card.appendChild(actions);
      resultList.appendChild(card);
    });

    result.hidden = false;
  }

  function showError(message){
    errorText.textContent = message;
    errorMsg.classList.add('show');
  }
  function clearError(){
    errorText.textContent = '';
    errorMsg.classList.remove('show');
  }

  function showToast(msg){
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
  }
})();
