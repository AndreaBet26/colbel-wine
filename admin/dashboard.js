/**
 * ColBel – Console di gestione (uso locale)
 *
 * Legge i contenuti da ../data/*.json e li salva tramite il server locale
 * (server.py → POST /api/save). Le foto caricate finiscono in
 * assets/images/uploads/ tramite POST /api/upload.
 *
 * I campi semplici sono collegati con l'attributo data-bind="file.campo";
 * vini, esperienze, galleria, numeri chiave e capitoli sono liste gestite qui.
 * Ogni modifica viene salvata automaticamente dopo un attimo di pausa.
 */
(function () {
  'use strict';

  // chiave di stato → nome file in data/
  const FILES = {
    impostazioni: 'impostazioni',
    vini: 'vini',
    esperienze: 'esperienze',
    agriturismo: 'agriturismo',
    chiSiamo: 'chi-siamo',
    territorio: 'territorio',
    scrollytelling: 'scrollytelling',
    contatti: 'contatti'
  };

  const state = {};
  const dirty = new Set();
  let serverOnline = false;
  let saveTimer = null;
  let saving = false;
  let editing = { type: null, index: null };

  // ---------------------------------------------------------------------------
  // Utilità
  // ---------------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  function setPath(obj, path, value) {
    const keys = path.split('.');
    let o = obj;
    keys.slice(0, -1).forEach((k) => {
      if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
      o = o[k];
    });
    o[keys[keys.length - 1]] = value;
  }
  const img = (p) => (p ? '../' + String(p).replace(/^\/+/, '') : '');
  const euro = (n) => (parseFloat(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'voce';
  const reindex = (list) => list.forEach((x, i) => { x.ordine = i + 1; });

  function showToast(msg, type = 'info') {
    const container = $('dashToasts');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'danger' ? 'fa-triangle-exclamation' : 'fa-info-circle');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${esc(msg)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, type === 'danger' ? 6000 : 3000);
  }

  function setStatus(text, kind) {
    const box = $('saveStatus');
    const t = $('saveStatusText');
    if (t) t.textContent = text;
    if (box) box.dataset.kind = kind || '';
  }

  // ---------------------------------------------------------------------------
  // Caricamento & salvataggio
  // ---------------------------------------------------------------------------
  async function checkServer() {
    if (location.protocol === 'file:') return false;
    try {
      const res = await fetch('../api/ping', { cache: 'no-store' });
      if (!res.ok) return false;
      const j = await res.json();
      return !!j.ok;
    } catch (e) {
      return false;
    }
  }

  async function loadData() {
    // vecchia cache del browser non più usata
    Object.keys(localStorage).filter((k) => k.startsWith('colbel_data_')).forEach((k) => localStorage.removeItem(k));

    serverOnline = await checkServer();
    $('serverWarning').hidden = serverOnline;

    const results = await Promise.all(Object.entries(FILES).map(async ([key, file]) => {
      try {
        const res = await fetch(`../data/${file}.json?v=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(res.status);
        return [key, await res.json()];
      } catch (e) {
        return [key, null];
      }
    }));

    const missing = [];
    results.forEach(([key, data]) => {
      if (data == null) missing.push(FILES[key]);
      state[key] = data != null ? data : (key === 'vini' || key === 'esperienze' ? [] : {});
    });

    if (missing.length) {
      setStatus('Dati non caricati', 'error');
      showToast('Impossibile leggere: ' + missing.join(', ') + '. Avvia il server locale.', 'danger');
    } else {
      setStatus(serverOnline ? 'Tutto salvato' : 'Sola lettura', serverOnline ? 'ok' : 'error');
    }
    renderAll();
  }

  function markDirty(key) {
    dirty.add(key);
    if (!serverOnline) {
      setStatus('Non salvabile (server spento)', 'error');
      return;
    }
    setStatus('Modifiche in attesa…', 'pending');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDirty, 900);
  }

  async function saveDirty() {
    clearTimeout(saveTimer);
    if (!serverOnline) {
      showToast('Server locale non attivo: avvia "Avvia ColBel.command" per salvare.', 'danger');
      return false;
    }
    if (saving) { saveTimer = setTimeout(saveDirty, 400); return false; }
    if (!dirty.size) { setStatus('Tutto salvato', 'ok'); return true; }

    saving = true;
    setStatus('Salvataggio…', 'pending');
    const keys = Array.from(dirty);
    dirty.clear();
    try {
      for (const key of keys) {
        const res = await fetch('../api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: FILES[key], data: state[key] })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) throw new Error(j.error || ('errore ' + res.status));
      }
      const time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      setStatus('Salvato alle ' + time, 'ok');
      return true;
    } catch (err) {
      keys.forEach((k) => dirty.add(k));
      setStatus('Errore di salvataggio', 'error');
      showToast('Salvataggio non riuscito: ' + err.message, 'danger');
      return false;
    } finally {
      saving = false;
    }
  }

  async function uploadImage(file) {
    if (!serverOnline) throw new Error('server locale non attivo');
    if (file.size > 15 * 1024 * 1024) throw new Error('immagine troppo grande (max 15 MB)');
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('lettura file non riuscita'));
      r.readAsDataURL(file);
    });
    const res = await fetch('../api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, data: dataUrl })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) throw new Error(j.error || ('errore ' + res.status));
    return j.path;
  }

  // ---------------------------------------------------------------------------
  // Campi semplici (data-bind)
  // ---------------------------------------------------------------------------
  function renderBound() {
    document.querySelectorAll('[data-bind]').forEach((el) => {
      const path = el.getAttribute('data-bind');
      const [key, ...rest] = path.split('.');
      const v = getPath(state[key], rest.join('.'));
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v == null ? '' : v;
    });
    refreshImgPreviews();
  }

  function onBoundChange(e) {
    const el = e.target.closest('[data-bind]');
    if (!el) return;
    const path = el.getAttribute('data-bind');
    const [key, ...rest] = path.split('.');
    if (!state[key]) return;
    let value;
    if (el.type === 'checkbox') value = el.checked;
    else if (el.getAttribute('data-type') === 'number') value = parseFloat(el.value) || 0;
    else value = el.value;
    setPath(state[key], rest.join('.'), value);
    markDirty(key);
  }

  // ---------------------------------------------------------------------------
  // Campi immagine (anteprima + caricamento)
  // ---------------------------------------------------------------------------
  function refreshImgPreviews(scope) {
    (scope || document).querySelectorAll('[data-img-field]').forEach((f) => {
      const input = f.querySelector('input[type="text"]');
      const prev = f.querySelector('.img-field-preview');
      if (input && prev) {
        prev.src = img(input.value.trim());
        prev.style.visibility = input.value.trim() ? 'visible' : 'hidden';
      }
    });
  }

  function initImgFields() {
    document.addEventListener('input', (e) => {
      const f = e.target.closest('[data-img-field]');
      if (f && e.target.type === 'text') refreshImgPreviews(f.parentElement);
    });
    document.addEventListener('change', async (e) => {
      const f = e.target.closest('[data-img-field]');
      if (!f || e.target.type !== 'file' || !e.target.files.length) return;
      const input = f.querySelector('input[type="text"]');
      const file = e.target.files[0];
      e.target.value = '';
      try {
        showToast('Caricamento foto…', 'info');
        const path = await uploadImage(file);
        input.value = path;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        showToast('Foto caricata', 'success');
      } catch (err) {
        showToast('Foto non caricata: ' + err.message, 'danger');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Render generale
  // ---------------------------------------------------------------------------
  function renderAll() {
    renderBound();
    renderVini();
    renderEsperienze();
    renderGalleria();
    renderStats();
    renderScrolly();
    updateBadges();
  }

  function updateBadges() {
    $('badge-vini').textContent = (state.vini || []).length;
    $('badge-esperienze').textContent = (state.esperienze || []).length;
    $('badge-agriturismo').textContent = ((state.agriturismo || {}).galleria || []).length;
  }

  function moveItem(list, index, dir) {
    const j = index + dir;
    if (j < 0 || j >= list.length) return false;
    [list[index], list[j]] = [list[j], list[index]];
    reindex(list);
    return true;
  }

  const orderButtons = (fn, idx, len) => `
    <button class="btn btn-icon" title="Sposta su" ${idx === 0 ? 'disabled' : ''} onclick="colbelDash.${fn}(${idx}, -1)"><i class="fa-solid fa-arrow-up"></i></button>
    <button class="btn btn-icon" title="Sposta giù" ${idx === len - 1 ? 'disabled' : ''} onclick="colbelDash.${fn}(${idx}, 1)"><i class="fa-solid fa-arrow-down"></i></button>`;

  // ---------------------------------------------------------------------------
  // VINI
  // ---------------------------------------------------------------------------
  function sortedByOrder(list) {
    list.sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
    return list;
  }

  function renderVini() {
    const grid = $('viniGrid');
    const list = sortedByOrder(state.vini || []);
    grid.innerHTML = list.length ? '' : '<p class="empty-hint">Nessun vino. Clicca "Aggiungi vino".</p>';
    list.forEach((v, idx) => {
      const card = document.createElement('div');
      card.className = 'item-card' + (v.attivo === false ? ' is-hidden' : '');
      card.innerHTML = `
        <div class="item-card-top">
          <div class="item-thumb-box">
            <img src="${esc(img(v.immagine))}" alt="" class="item-thumb-img">
          </div>
          <div class="item-info-col">
            <span class="item-tag">${esc(v.tag)}</span>
            <h3 class="item-title">${esc(v.nome)}</h3>
            <div class="item-appellation">${esc(v.denominazione)}</div>
            <div class="item-price-tag">${euro(v.prezzo)} <small>${esc(v.note_prezzo)}</small></div>
          </div>
        </div>
        <p class="item-desc">${esc(v.descrizione)}</p>
        <div class="item-card-actions">
          <label class="card-status-toggle">
            <span class="switch">
              <input type="checkbox" ${v.attivo !== false ? 'checked' : ''} onchange="colbelDash.toggleVino(${idx}, this.checked)">
              <span class="slider"></span>
            </span>
            <span>${v.attivo !== false ? 'Visibile' : 'Nascosto'}</span>
          </label>
          <div class="card-btns">
            ${orderButtons('moveVino', idx, list.length)}
            <button class="btn btn-secondary btn-sm" onclick="colbelDash.openVinoModal(${idx})"><i class="fa-solid fa-pen"></i> Modifica</button>
            <button class="btn btn-danger btn-sm" title="Elimina" onclick="colbelDash.deleteVino(${idx})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
      grid.appendChild(card);
    });
  }

  function openVinoModal(index) {
    editing = { type: 'vino', index };
    const v = index != null ? state.vini[index] : {
      nome: '', nome_breve: '', tag: pad(state.vini.length + 1) + ' / ', tipo: 'Vino Spumante Brut',
      denominazione: 'Conegliano Valdobbiadene Prosecco Superiore DOCG', descrizione: '', descrizione_breve: '',
      prezzo: 10, note_prezzo: 'IVA incl. (min. 6 bott.)', immagine: '', attivo: true
    };
    $('vinoModalTitle').textContent = index != null ? 'Modifica: ' + v.nome : 'Nuovo vino';
    $('vinoNome').value = v.nome || '';
    $('vinoNomeBreve').value = v.nome_breve || '';
    $('vinoTag').value = v.tag || '';
    $('vinoTipo').value = v.tipo || '';
    $('vinoDenom').value = v.denominazione || '';
    $('vinoPrezzo').value = v.prezzo;
    $('vinoNotePrezzo').value = v.note_prezzo || '';
    $('vinoImg').value = v.immagine || '';
    $('vinoDesc').value = v.descrizione || '';
    $('vinoDescBreve').value = v.descrizione_breve || '';
    $('vinoAttivo').checked = v.attivo !== false;
    refreshImgPreviews($('vinoModal'));
    openModal('vinoModal');
  }

  function saveVinoModal() {
    const nome = $('vinoNome').value.trim();
    if (!nome) { showToast('Inserisci il nome del vino', 'danger'); $('vinoNome').focus(); return; }
    const isNew = editing.index == null;
    const old = isNew ? {} : state.vini[editing.index];
    const v = Object.assign({}, old, {
      id: old.id || slug(nome) + '-' + Date.now().toString(36),
      nome,
      nome_breve: $('vinoNomeBreve').value.trim(),
      tag: $('vinoTag').value.trim(),
      tipo: $('vinoTipo').value.trim(),
      denominazione: $('vinoDenom').value.trim(),
      prezzo: Math.round((parseFloat($('vinoPrezzo').value) || 0) * 100) / 100,
      note_prezzo: $('vinoNotePrezzo').value.trim(),
      immagine: $('vinoImg').value.trim(),
      descrizione: $('vinoDesc').value.trim(),
      descrizione_breve: $('vinoDescBreve').value.trim(),
      attivo: $('vinoAttivo').checked
    });
    // il nome per l'ordine segue il nome se l'utente lo rinomina
    if (!old.nome_ordine || old.nome !== nome) v.nome_ordine = nome;
    if (isNew) { v.ordine = state.vini.length + 1; state.vini.push(v); }
    else state.vini[editing.index] = v;
    closeModal('vinoModal');
    renderVini(); updateBadges(); markDirty('vini');
  }

  function deleteVino(i) {
    if (!confirm(`Eliminare "${state.vini[i].nome}"?\n(Se vuoi solo toglierlo temporaneamente, usa l'interruttore "Visibile".)`)) return;
    state.vini.splice(i, 1); reindex(state.vini);
    renderVini(); updateBadges(); markDirty('vini');
  }
  function toggleVino(i, val) { state.vini[i].attivo = val; renderVini(); markDirty('vini'); }
  function moveVino(i, dir) { if (moveItem(state.vini, i, dir)) { renderVini(); markDirty('vini'); } }

  // ---------------------------------------------------------------------------
  // ESPERIENZE
  // ---------------------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, '0');
  const refKey = (e) => e.referente || (/lissa/i.test(e.referente_nome || '') ? 'lissa' : 'gianni');
  const refName = (key) => ((state.contatti || {})[key] || {}).nome || (key === 'lissa' ? 'Lissa' : 'Gianni');

  function renderEsperienze() {
    const grid = $('esperienzeGrid');
    const list = sortedByOrder(state.esperienze || []);
    grid.innerHTML = list.length ? '' : '<p class="empty-hint">Nessuna esperienza.</p>';
    list.forEach((e, idx) => {
      const tags = (e.tags || []).map((t) => `<span class="mini-tag"><i class="${esc(t.icona || 'fa-solid fa-check')}"></i> ${esc(t.testo)}</span>`).join('');
      const card = document.createElement('div');
      card.className = 'item-card' + (e.attivo === false ? ' is-hidden' : '');
      card.innerHTML = `
        <div class="item-card-top">
          <div class="item-thumb-box wide">
            <img src="${esc(img(e.immagine))}" alt="" class="item-thumb-img cover">
          </div>
          <div class="item-info-col">
            <span class="item-tag">${esc(e.badge)}</span>
            <h3 class="item-title">${esc(e.titolo)}</h3>
            <div class="item-price-tag">${esc(e.prezzo)} € <small>${esc(e.unita_prezzo)}</small></div>
            <div class="item-appellation">Prenotazioni a: <strong>${esc(refName(refKey(e)))}</strong></div>
          </div>
        </div>
        <p class="item-desc">${esc(e.descrizione)}</p>
        <div class="mini-tags">${tags}</div>
        <div class="item-card-actions">
          <label class="card-status-toggle">
            <span class="switch">
              <input type="checkbox" ${e.attivo !== false ? 'checked' : ''} onchange="colbelDash.toggleExp(${idx}, this.checked)">
              <span class="slider"></span>
            </span>
            <span>${e.attivo !== false ? 'Visibile' : 'Nascosta'}</span>
          </label>
          <div class="card-btns">
            ${orderButtons('moveExp', idx, list.length)}
            <button class="btn btn-secondary btn-sm" onclick="colbelDash.openExpModal(${idx})"><i class="fa-solid fa-pen"></i> Modifica</button>
            <button class="btn btn-danger btn-sm" title="Elimina" onclick="colbelDash.deleteExp(${idx})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
      grid.appendChild(card);
    });
  }

  function openExpModal(index) {
    editing = { type: 'exp', index };
    const e = index != null ? state.esperienze[index] : {
      badge: pad(state.esperienze.length + 1) + ' / ', titolo: '', prezzo: 20, unita_prezzo: '/ persona',
      descrizione: '', tags: [], immagine: '', referente: 'gianni', testo_pulsante: '', messaggio_whatsapp: '', attivo: true
    };
    $('expModalTitle').textContent = index != null ? 'Modifica: ' + e.titolo : 'Nuova esperienza';
    $('expTitolo').value = e.titolo || '';
    $('expBadge').value = e.badge || '';
    $('expPrezzo').value = e.prezzo;
    $('expUnitaPrezzo').value = e.unita_prezzo || '';
    $('expDesc').value = e.descrizione || '';
    $('expTagsStr').value = (e.tags || []).map((t) => t.testo).join('\n');
    $('expImg').value = e.immagine || '';
    $('expRef').value = refKey(e);
    $('expBtnText').value = e.testo_pulsante || '';
    $('expWaMsg').value = e.messaggio_whatsapp || '';
    $('expAttivo').checked = e.attivo !== false;
    refreshImgPreviews($('expModal'));
    openModal('expModal');
  }

  function saveExpModal() {
    const titolo = $('expTitolo').value.trim();
    if (!titolo) { showToast("Inserisci il titolo dell'esperienza", 'danger'); $('expTitolo').focus(); return; }
    const isNew = editing.index == null;
    const old = isNew ? {} : state.esperienze[editing.index];
    // mantiene l'icona delle caratteristiche già esistenti
    const oldIcons = {};
    (old.tags || []).forEach((t) => { oldIcons[t.testo] = t.icona; });
    const tags = $('expTagsStr').value.split(/\n/).map((s) => s.trim()).filter(Boolean)
      .map((testo) => ({ icona: oldIcons[testo] || 'fa-solid fa-check', testo }));
    const ref = $('expRef').value;
    let btnText = $('expBtnText').value.trim();
    const oldRef = old.referente ? old.referente : (isNew ? null : refKey(old));
    if (oldRef && oldRef !== ref && btnText === 'Prenota con ' + refName(oldRef).split(' ')[0]) btnText = '';
    const contatto = (state.contatti || {})[ref] || {};
    const e = Object.assign({}, old, {
      id: old.id || 'exp-' + slug(titolo),
      titolo,
      badge: $('expBadge').value.trim(),
      prezzo: parseFloat($('expPrezzo').value) || 0,
      unita_prezzo: $('expUnitaPrezzo').value.trim(),
      descrizione: $('expDesc').value.trim(),
      tags,
      immagine: $('expImg').value.trim(),
      referente: ref,
      referente_nome: (contatto.nome || ref).split(' ')[0],
      referente_wa: contatto.wa_numero || old.referente_wa || '',
      testo_pulsante: btnText || ('Prenota con ' + refName(ref).split(' ')[0]),
      messaggio_whatsapp: $('expWaMsg').value.trim() || ('Buongiorno, vorrei prenotare: ' + titolo),
      attivo: $('expAttivo').checked
    });
    if (isNew) { e.ordine = state.esperienze.length + 1; state.esperienze.push(e); }
    else state.esperienze[editing.index] = e;
    closeModal('expModal');
    renderEsperienze(); updateBadges(); markDirty('esperienze');
  }

  function deleteExp(i) {
    if (!confirm(`Eliminare "${state.esperienze[i].titolo}"?`)) return;
    state.esperienze.splice(i, 1); reindex(state.esperienze);
    renderEsperienze(); updateBadges(); markDirty('esperienze');
  }
  function toggleExp(i, val) { state.esperienze[i].attivo = val; renderEsperienze(); markDirty('esperienze'); }
  function moveExp(i, dir) { if (moveItem(state.esperienze, i, dir)) { renderEsperienze(); markDirty('esperienze'); } }

  // ---------------------------------------------------------------------------
  // AGRITURISMO – galleria
  // ---------------------------------------------------------------------------
  function gallery() {
    if (!state.agriturismo.galleria) state.agriturismo.galleria = [];
    return sortedByOrder(state.agriturismo.galleria);
  }

  function renderGalleria() {
    const grid = $('agriGalleriaGrid');
    const list = gallery();
    grid.innerHTML = list.length ? '' : '<p class="empty-hint">Nessuna foto. Clicca "Aggiungi foto".</p>';
    list.forEach((f, idx) => {
      const card = document.createElement('div');
      card.className = 'item-card photo-card';
      card.innerHTML = `
        <div class="item-thumb-box wide"><img src="${esc(img(f.immagine))}" class="item-thumb-img cover" alt=""></div>
        <div class="photo-card-body">
          <input type="text" class="form-control" value="${esc(f.didascalia)}" placeholder="Didascalia della foto…"
                 oninput="colbelDash.updateCaption(${idx}, this.value)">
          <div class="photo-path">${esc(f.immagine)}</div>
        </div>
        <div class="card-btns">
          ${orderButtons('moveFoto', idx, list.length)}
          <button class="btn btn-danger btn-sm" title="Rimuovi foto" onclick="colbelDash.deleteFoto(${idx})"><i class="fa-solid fa-trash"></i></button>
        </div>`;
      grid.appendChild(card);
    });
  }

  function updateCaption(i, val) { gallery()[i].didascalia = val; markDirty('agriturismo'); }
  function moveFoto(i, dir) { if (moveItem(gallery(), i, dir)) { renderGalleria(); markDirty('agriturismo'); } }
  function deleteFoto(i) {
    if (!confirm('Togliere questa foto dal rullino? (il file resta nella cartella immagini)')) return;
    gallery().splice(i, 1); reindex(state.agriturismo.galleria);
    renderGalleria(); updateBadges(); markDirty('agriturismo');
  }

  async function addFotoFiles(files) {
    for (const file of files) {
      try {
        showToast('Caricamento ' + file.name + '…', 'info');
        const path = await uploadImage(file);
        const list = gallery();
        list.push({ id: 'foto-' + Date.now().toString(36), immagine: path, didascalia: '', ordine: list.length + 1 });
      } catch (err) {
        showToast(file.name + ': ' + err.message, 'danger');
      }
    }
    renderGalleria(); updateBadges(); markDirty('agriturismo');
    showToast('Foto aggiunte: scrivi una didascalia', 'success');
  }

  // ---------------------------------------------------------------------------
  // CHI SIAMO – numeri chiave
  // ---------------------------------------------------------------------------
  function renderStats() {
    const box = $('csStatsGrid');
    const stats = state.chiSiamo.statistiche || (state.chiSiamo.statistiche = []);
    box.innerHTML = stats.length ? '' : '<p class="empty-hint">Nessun numero.</p>';
    stats.forEach((s, idx) => {
      const row = document.createElement('div');
      row.className = 'form-row stat-row';
      row.innerHTML = `
        <div class="form-group" style="flex:0 0 140px;">
          <label class="form-label">Numero</label>
          <input type="text" class="form-control stat-value" value="${esc(s.valore)}" oninput="colbelDash.updateStat(${idx}, 'valore', this.value)">
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">Descrizione</label>
          <input type="text" class="form-control" value="${esc(s.etichetta)}" oninput="colbelDash.updateStat(${idx}, 'etichetta', this.value)">
        </div>
        <button class="btn btn-danger btn-sm" title="Rimuovi" onclick="colbelDash.deleteStat(${idx})"><i class="fa-solid fa-trash"></i></button>`;
      box.appendChild(row);
    });
  }
  function updateStat(i, field, val) { state.chiSiamo.statistiche[i][field] = val; markDirty('chiSiamo'); }
  function addStat() { state.chiSiamo.statistiche.push({ valore: '', etichetta: '' }); renderStats(); markDirty('chiSiamo'); }
  function deleteStat(i) { state.chiSiamo.statistiche.splice(i, 1); renderStats(); markDirty('chiSiamo'); }

  // ---------------------------------------------------------------------------
  // SCROLLYTELLING – 4 capitoli fissi
  // ---------------------------------------------------------------------------
  function renderScrolly() {
    const grid = $('scrollyGrid');
    const steps = (state.scrollytelling || {}).step || [];
    grid.innerHTML = '';
    steps.forEach((st, idx) => {
      const box = document.createElement('div');
      box.className = 'form-panel';
      box.innerHTML = `
        <h4 class="panel-subtitle">Capitolo ${pad(idx + 1)}</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Etichetta</label>
            <input type="text" class="form-control" value="${esc(st.badge)}" oninput="colbelDash.updateStep(${idx}, 'badge', this.value)">
          </div>
          <div class="form-group" style="flex:2;">
            <label class="form-label">Titolo</label>
            <input type="text" class="form-control" value="${esc(st.titolo)}" oninput="colbelDash.updateStep(${idx}, 'titolo', this.value)">
          </div>
        </div>
        <div class="form-group"${'meta_testo' in st ? '' : ' style="margin-bottom:0;"'}>
          <label class="form-label">Testo</label>
          <textarea class="form-control form-textarea" rows="2" oninput="colbelDash.updateStep(${idx}, 'testo', this.value)">${esc(st.testo)}</textarea>
        </div>
        ${'meta_testo' in st ? `
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Nota finale (con icona)</label>
          <input type="text" class="form-control" value="${esc(st.meta_testo)}" oninput="colbelDash.updateStep(${idx}, 'meta_testo', this.value)">
        </div>` : ''}`;
      grid.appendChild(box);
    });
  }
  function updateStep(i, field, val) { state.scrollytelling.step[i][field] = val; markDirty('scrollytelling'); }

  // ---------------------------------------------------------------------------
  // Backup
  // ---------------------------------------------------------------------------
  function exportJsonFiles() {
    const all = Object.assign({ esportato_il: new Date().toISOString() }, state);
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colbel-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast('Backup scaricato', 'success');
  }

  // ---------------------------------------------------------------------------
  // Modali, tab, tastiera
  // ---------------------------------------------------------------------------
  function openModal(id) { $(id).classList.add('active'); }
  function closeModal(id) { $(id).classList.remove('active'); }

  function initTabs() {
    const activate = (name) => {
      const btn = document.querySelector(`.dash-tab-btn[data-tab="${name}"]`);
      if (!btn) return;
      document.querySelectorAll('.dash-tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + name));
      try { sessionStorage.setItem('colbel_tab', name); } catch (e) {}
    };
    document.querySelectorAll('.dash-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => activate(btn.getAttribute('data-tab')));
    });
    try { const t = sessionStorage.getItem('colbel_tab'); if (t) activate(t); } catch (e) {}
  }

  function startApp() {
    initTabs();
    initImgFields();
    document.addEventListener('input', onBoundChange);
    document.addEventListener('change', (e) => { if (e.target.type === 'checkbox') onBoundChange(e); });

    $('btnSaveHeader').addEventListener('click', async () => {
      if (await saveDirty()) showToast('Tutto salvato', 'success');
    });
    $('btnExportJson').addEventListener('click', exportJsonFiles);
    $('agriUploadInput').addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (files.length) addFotoFiles(files);
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveDirty(); }
      if (e.key === 'Escape') document.querySelectorAll('.dash-modal-backdrop.active').forEach((m) => m.classList.remove('active'));
    });
    document.querySelectorAll('.dash-modal-backdrop').forEach((m) => {
      m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('active'); });
    });
    window.addEventListener('beforeunload', (e) => {
      if (dirty.size || saving) { e.preventDefault(); e.returnValue = ''; }
    });

    loadData();
  }

  window.colbelDash = {
    openVinoModal, saveVinoModal, deleteVino, toggleVino, moveVino,
    openExpModal, saveExpModal, deleteExp, toggleExp, moveExp,
    updateCaption, moveFoto, deleteFoto,
    updateStat, addStat, deleteStat,
    updateStep,
    closeModal, saveDirty, loadData
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startApp);
  else startApp();
})();
