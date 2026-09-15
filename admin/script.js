(function(){
  const FEATURES = ['igdl', 'brat']; // nambah fitur baru ke sistem limit -> tinggal tambah di sini
  const FEATURE_LABEL = { igdl: 'IG DL', brat: 'Brat' };

  const keyList = document.getElementById('keyList');
  const listLabel = document.getElementById('listLabel');
  const addKeyBtn = document.getElementById('addKeyBtn');
  const addSheetOverlay = document.getElementById('addSheetOverlay');
  const cancelAddBtn = document.getElementById('cancelAddBtn');
  const confirmAddBtn = document.getElementById('confirmAddBtn');
  const newLabel = document.getElementById('newLabel');
  const newKey = document.getElementById('newKey');
  const newIgdlLimit = document.getElementById('newIgdlLimit');
  const newBratLimit = document.getElementById('newBratLimit');
  const toast = document.getElementById('toast');

  async function loadKeys(){
    listLabel.textContent = 'Memuat daftar key...';
    try {
      const res = await fetch('/api/admin/keys');
      const data = await res.json();
      if (!data.ok) { listLabel.textContent = 'Gagal memuat data.'; return; }
      renderKeys(data.keys);
    } catch (err) {
      listLabel.textContent = 'Gagal memuat data.';
    }
  }

  function renderKeys(keys){
    listLabel.textContent = `${keys.length} key terdaftar`;
    keyList.innerHTML = '';

    if (keys.length === 0) {
      keyList.innerHTML = '<div class="empty-state">Belum ada key. Tambah key baru buat mulai bagi akses.</div>';
      return;
    }

    keys.forEach(k => keyList.appendChild(buildKeyCard(k)));
  }

  function buildKeyCard(k){
    const card = document.createElement('div');
    card.className = 'key-card';

    const head = document.createElement('div');
    head.className = 'key-head';
    head.innerHTML = `
      <div>
        <div class="key-label">${escapeHtml(k.label || k.key)}</div>
        <div class="key-value">${escapeHtml(k.key)}</div>
      </div>
    `;
    const delBtn = document.createElement('button');
    delBtn.className = 'key-del';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>';
    delBtn.addEventListener('click', () => deleteKey(k.key, k.label));
    head.appendChild(delBtn);
    card.appendChild(head);

    FEATURES.forEach(feature => {
      card.appendChild(buildQuotaRow(k, feature));
    });

    return card;
  }

  function buildQuotaRow(k, feature){
    const quota = k.quotas?.[feature];
    const row = document.createElement('div');
    row.className = 'quota-row';

    const label = document.createElement('div');
    label.className = 'quota-feature';
    label.textContent = FEATURE_LABEL[feature] || feature;
    row.appendChild(label);

    const barWrap = document.createElement('div');
    barWrap.className = 'quota-bar-wrap';

    if (!quota) {
      barWrap.innerHTML = `<div class="quota-numbers">Unlimited</div>`;
    } else {
      const pct = quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 100;
      const low = quota.remaining <= Math.max(1, Math.round(quota.limit * 0.1));
      barWrap.innerHTML = `
        <div class="quota-numbers"><b>${quota.remaining}</b> / ${quota.limit} sisa</div>
        <div class="quota-bar"><div class="quota-bar-fill ${low ? 'low' : ''}" style="width:${pct}%"></div></div>
      `;
    }
    row.appendChild(barWrap);

    const actions = document.createElement('div');
    actions.className = 'quota-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'quota-btn';
    editBtn.title = 'Ubah limit';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>';
    editBtn.addEventListener('click', () => editLimit(k, feature, quota));
    actions.appendChild(editBtn);

    if (quota) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'quota-btn';
      resetBtn.title = 'Reset pemakaian ke 0';
      resetBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
      resetBtn.addEventListener('click', () => resetQuota(k.key, feature));
      actions.appendChild(resetBtn);
    }

    row.appendChild(actions);
    return row;
  }

  async function editLimit(k, feature, quota){
    const current = quota ? String(quota.limit) : '';
    const input = prompt(`Limit ${FEATURE_LABEL[feature] || feature} buat "${k.label || k.key}"\n(kosongkan = unlimited):`, current);
    if (input === null) return; // batal

    const limit = input.trim() === '' ? null : Number(input);
    if (limit !== null && (!Number.isFinite(limit) || limit < 0)) {
      showToast('Angka gak valid.');
      return;
    }

    try {
      const res = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k.key, feature, limit }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Limit diperbarui');
        loadKeys();
      } else {
        showToast(data.message || 'Gagal update.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan.');
    }
  }

  async function resetQuota(key, feature){
    if (!confirm('Reset pemakaian fitur ini balik ke 0?')) return;
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, feature }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Pemakaian direset');
        loadKeys();
      } else {
        showToast(data.message || 'Gagal reset.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan.');
    }
  }

  async function deleteKey(key, label){
    if (!confirm(`Hapus key "${label || key}"? Aksi ini gak bisa dibatalin.`)) return;
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Key dihapus');
        loadKeys();
      } else {
        showToast(data.message || 'Gagal hapus.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan.');
    }
  }

  // ---- Sheet tambah key ----
  addKeyBtn.addEventListener('click', () => {
    newLabel.value = '';
    newKey.value = '';
    newIgdlLimit.value = '';
    newBratLimit.value = '';
    addSheetOverlay.classList.add('show');
  });
  cancelAddBtn.addEventListener('click', () => addSheetOverlay.classList.remove('show'));
  addSheetOverlay.addEventListener('click', (e) => {
    if (e.target === addSheetOverlay) addSheetOverlay.classList.remove('show');
  });

  confirmAddBtn.addEventListener('click', async () => {
    confirmAddBtn.disabled = true;
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel.value.trim(),
          key: newKey.value.trim(),
          igdlLimit: newIgdlLimit.value,
          bratLimit: newBratLimit.value,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        addSheetOverlay.classList.remove('show');
        showToast(`Key "${data.key}" dibuat`);
        loadKeys();
      } else {
        showToast(data.message || 'Gagal membuat key.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan.');
    } finally {
      confirmAddBtn.disabled = false;
    }
  });

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(msg){
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  loadKeys();
})();
