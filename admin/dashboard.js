/**
 * ColBel – Studio Dashboard (Console di Gestione Locale)
 *
 * Ispirata al flusso di lavoro moderno e diretto dello Studio Dashboard di Andrea Bellotto:
 * - Anteprime interattive in-place (Vini, Esperienze, Rullino Fotografico) con modifica diretta
 * - Split-screen studio per le sezioni a pagina intera (Home, Chi Siamo, Territorio, Contatti):
 *   Modifica a sinistra con controlli puliti, Anteprima Live fedele del sito a destra in tempo reale.
 * - Autosave debounced con indicatore di stato + Salvataggio forzato (Ctrl+S / Cmd+S).
 * - Sincronizzato con data/*.json tramite server.py (POST /api/save & POST /api/upload).
 */
(function () {
  'use strict';

  // Mappatura stato -> nome file JSON in data/
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
  let uploadTarget = { type: null, index: null };

  // ---------------------------------------------------------------------------
  // Utilità di base
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
  const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'voce';
  const reindex = (list) => list.forEach((x, i) => { x.ordine = i + 1; });
  const pad = (n) => String(n).padStart(2, '0');

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
  // Connessione Server & Caricamento Dati
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
    // Rimuovi eventuale vecchia cache obsoleta
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
      setStatus('Dati incompleti', 'error');
      showToast('Impossibile leggere: ' + missing.join(', ') + '. Assicurati che server.py sia avviato.', 'danger');
    } else {
      setStatus(serverOnline ? 'Tutto salvato' : 'Sola lettura (server spento)', serverOnline ? 'ok' : 'error');
    }

    renderAll();
  }

  function markDirty(key) {
    dirty.add(key);
    if (!serverOnline) {
      setStatus('Non salvabile (server offline)', 'error');
      return;
    }
    setStatus('Modifiche in corso…', 'pending');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDirty, 900);
  }

  async function saveDirty() {
    clearTimeout(saveTimer);
    if (!serverOnline) {
      showToast('Server locale non attivo. Avvia "Avvia ColBel.bat" per salvare.', 'danger');
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
      const time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setStatus('Salvato alle ' + time, 'ok');
      return true;
    } catch (err) {
      keys.forEach((k) => dirty.add(k));
      setStatus('Errore salvataggio', 'error');
      showToast('Salvataggio non riuscito: ' + err.message, 'danger');
      return false;
    } finally {
      saving = false;
    }
  }

  async function uploadImage(file) {
    if (!serverOnline) throw new Error('server locale non attivo');
    if (file.size > 15 * 1024 * 1024) throw new Error('immagine troppo grande (massimo 15 MB)');
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('lettura del file non riuscita'));
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
  // MOTORE DI MODIFICA IN-PLACE (bindInlineEdit)
  // Ispirato alla console Studio di Andrea Bellotto:
  // Clicchi e scrivi direttamente sulla scheda senza aprire modali ingombranti.
  // ---------------------------------------------------------------------------
  function bindInlineEdit(el, targetObj, propName, options = {}) {
    if (!el) return;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');
    el.classList.add('visual-editable');
    if (options.multiline) el.classList.add('multiline');

    let initialVal = (targetObj[propName] !== undefined && targetObj[propName] !== null)
      ? String(targetObj[propName]).trim() : '';

    el.addEventListener('focus', () => {
      initialVal = el.innerText.trim();
      el.classList.add('is-editing');
    });

    el.addEventListener('keydown', (e) => {
      if (!options.multiline && e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
    });

    el.addEventListener('input', () => {
      const raw = options.multiline ? el.innerText : el.innerText.replace(/[\r\n]+/g, ' ');
      let val = raw;
      if (options.isNumber) {
        val = parseFloat(raw.replace(',', '.')) || 0;
      }
      targetObj[propName] = val;
      markDirty(options.fileKey || 'vini');
      if (options.onUpdate) options.onUpdate(val);
    });

    el.addEventListener('blur', () => {
      el.classList.remove('is-editing');
      let clean = el.innerText.trim();
      if (!clean && options.fallback) {
        clean = options.fallback;
        el.innerText = clean;
        targetObj[propName] = options.isNumber ? (parseFloat(clean) || 0) : clean;
        markDirty(options.fileKey || 'vini');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // GESTIONE VINI: SCHEDE INTERATTIVE INLINE
  // ---------------------------------------------------------------------------
  function sortedByOrder(list) {
    list.sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
    return list;
  }

  function renderVisualVini() {
    const grid = $('viniVisualGrid');
    if (!grid) return;
    const list = sortedByOrder(state.vini || []);
    grid.innerHTML = list.length ? '' : '<p class="empty-hint">Nessun vino in catalogo. Clicca su "+ Aggiungi vino".</p>';

    list.forEach((v, idx) => {
      const isHidden = v.attivo === false;
      const card = document.createElement('div');
      card.className = 'visual-wine-card' + (isHidden ? ' is-hidden' : '');

      // Barra superiore della scheda con ordine, stato visibilità e azioni rapide
      const topBar = document.createElement('div');
      topBar.style.display = 'flex';
      topBar.style.alignItems = 'center';
      topBar.style.justifyContent = 'space-between';
      topBar.style.borderBottom = '1px solid var(--line)';
      topBar.style.paddingBottom = '0.65rem';

      // Status visibile/nascosto
      const statusLabel = document.createElement('label');
      statusLabel.className = 'card-status-toggle';
      statusLabel.innerHTML = `
        <span class="switch">
          <input type="checkbox" ${v.attivo !== false ? 'checked' : ''}>
          <span class="slider"></span>
        </span>
        <span style="font-weight:600;">${v.attivo !== false ? 'Visibile sul sito' : 'Nascosto'}</span>
      `;
      statusLabel.querySelector('input').addEventListener('change', (e) => {
        v.attivo = e.target.checked;
        card.classList.toggle('is-hidden', !v.attivo);
        statusLabel.querySelector('span:last-child').textContent = v.attivo ? 'Visibile sul sito' : 'Nascosto';
        markDirty('vini');
      });

      // Pulsanti spostamento e gestione
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'card-btns';
      actionsDiv.innerHTML = `
        <button class="btn btn-icon btn-sm" title="Sposta su" ${idx === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
        <button class="btn btn-icon btn-sm" title="Sposta giù" ${idx === list.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
        <button class="btn btn-secondary btn-sm" title="Centra foto"><i class="fa-solid fa-arrows-up-down-left-right"></i></button>
        <button class="btn btn-secondary btn-sm" title="Duplica questo vino"><i class="fa-solid fa-copy"></i></button>
        <button class="btn btn-danger btn-sm" title="Elimina vino"><i class="fa-solid fa-trash"></i></button>
      `;
      const [btnUp, btnDown, btnCrop, btnDup, btnDel] = actionsDiv.querySelectorAll('button');
      btnUp.addEventListener('click', () => { moveItem(list, idx, -1); renderVisualVini(); markDirty('vini'); });
      btnDown.addEventListener('click', () => { moveItem(list, idx, 1); renderVisualVini(); markDirty('vini'); });
      btnCrop.addEventListener('click', () => {
        openDashCrop({
          title: 'Inquadratura: ' + (v.nome || 'Bottiglia'),
          subtitle: 'Proporzioni bottiglia',
          imgUrl: v.immagine,
          targetObj: v,
          targetKey: 'immagine_pos',
          fileKey: 'vini',
          aspect: 0.65,
          onSave: () => renderVisualVini()
        });
      });
      btnDup.addEventListener('click', () => duplicateVino(idx));
      btnDel.addEventListener('click', () => deleteVino(idx));

      topBar.appendChild(statusLabel);
      topBar.appendChild(actionsDiv);
      card.appendChild(topBar);

      // Area centrale: Bottiglia con cambio foto con un clic + dettagli del vino
      const stage = document.createElement('div');
      stage.className = 'wine-card-stage';

      // Riquadro bottiglia
      const bottleBox = document.createElement('div');
      bottleBox.className = 'wine-bottle-box';
      bottleBox.title = 'Clicca per sostituire la foto della bottiglia';
      bottleBox.innerHTML = `
        <img src="${esc(img(v.immagine))}" alt="${esc(v.nome)}" class="wine-bottle-img">
        <div class="wine-change-photo-badge">
          <i class="fa-solid fa-camera" style="font-size:1.1rem;"></i>
          <span>Cambia Foto</span>
        </div>
      `;
      bottleBox.addEventListener('click', () => {
        uploadTarget = { type: 'vino', index: idx };
        $('directWinePhotoInput').click();
      });

      // Dettagli vino (tutti modificabili inline)
      const details = document.createElement('div');
      details.className = 'wine-card-details';

      // Tag / Millesimato
      const tagEl = document.createElement('div');
      tagEl.className = 'wine-tag';
      tagEl.textContent = v.tag || `${pad(idx + 1)} / Millesimato`;
      bindInlineEdit(tagEl, v, 'tag', { fallback: `${pad(idx + 1)} / Millesimato`, fileKey: 'vini' });

      // Nome Vino
      const nameEl = document.createElement('h3');
      nameEl.className = 'wine-name';
      nameEl.textContent = v.nome || 'Nome Vino';
      bindInlineEdit(nameEl, v, 'nome', {
        fallback: 'Nome Vino',
        fileKey: 'vini',
        onUpdate: (val) => { v.nome_ordine = val; }
      });

      // Denominazione
      const denomEl = document.createElement('div');
      denomEl.className = 'wine-appellation';
      denomEl.textContent = v.denominazione || 'Conegliano Valdobbiadene Prosecco Superiore DOCG';
      bindInlineEdit(denomEl, v, 'denominazione', { fallback: 'DOCG / DOC', fileKey: 'vini' });

      // Tipo (es. Spumante Brut, Extra Dry...)
      const tipoEl = document.createElement('div');
      tipoEl.style.fontFamily = 'var(--font-mono)';
      tipoEl.style.fontSize = '0.72rem';
      tipoEl.style.color = 'var(--gold)';
      tipoEl.textContent = v.tipo || 'Vino Spumante Brut';
      bindInlineEdit(tipoEl, v, 'tipo', { fallback: 'Tipo Vino', fileKey: 'vini' });

      // Prezzo & Note
      const priceRow = document.createElement('div');
      priceRow.className = 'wine-price-row';

      const pricePrefix = document.createElement('span');
      pricePrefix.style.color = 'var(--gold)';
      pricePrefix.style.fontWeight = 'bold';
      pricePrefix.textContent = '€';

      const priceEl = document.createElement('span');
      priceEl.className = 'wine-price';
      priceEl.textContent = (v.prezzo !== undefined && v.prezzo !== null) ? v.prezzo : '11.90';
      bindInlineEdit(priceEl, v, 'prezzo', { isNumber: true, fallback: '10.00', fileKey: 'vini' });

      const noteEl = document.createElement('span');
      noteEl.className = 'wine-price-note';
      noteEl.textContent = v.note_prezzo || 'Euro/bottiglia (minimo 6 bottiglie)';
      bindInlineEdit(noteEl, v, 'note_prezzo', { fallback: 'Euro/bottiglia', fileKey: 'vini' });

      priceRow.appendChild(pricePrefix);
      priceRow.appendChild(priceEl);
      priceRow.appendChild(noteEl);

      details.appendChild(tagEl);
      details.appendChild(nameEl);
      details.appendChild(denomEl);
      details.appendChild(tipoEl);
      details.appendChild(priceRow);

      stage.appendChild(bottleBox);
      stage.appendChild(details);
      card.appendChild(stage);

      // Descrizione del vino (multiline inline)
      const descEl = document.createElement('div');
      descEl.className = 'wine-desc';
      descEl.textContent = v.descrizione || 'Descrizione del vino, delle sue note olfattive e abbinamenti consigliati…';
      bindInlineEdit(descEl, v, 'descrizione', {
        multiline: true,
        fallback: 'Descrizione del vino…',
        fileKey: 'vini'
      });
      card.appendChild(descEl);

      grid.appendChild(card);
    });

    updateBadges();
  }

  function addNewVino() {
    const list = state.vini || (state.vini = []);
    const newIdx = list.length + 1;
    const newVino = {
      id: 'vino-' + Date.now().toString(36),
      nome: 'Nuovo Vino ' + newIdx,
      nome_breve: 'Vino ' + newIdx,
      nome_ordine: 'Nuovo Vino ' + newIdx,
      tipo: 'Vino Spumante Brut',
      denominazione: 'Conegliano Valdobbiadene Prosecco Superiore DOCG',
      tag: `${pad(newIdx)} / Millesimato`,
      descrizione: 'Descrizione del nuovo vino, note floreali e abbinamenti…',
      descrizione_breve: '',
      prezzo: 11.9,
      note_prezzo: 'Euro/bottiglia (ordine minimo di 6 bottiglie)',
      immagine: 'assets/images/bottiglie/giusto.png',
      categoria: 'docg',
      ordine: newIdx,
      attivo: true
    };
    list.push(newVino);
    renderVisualVini();
    markDirty('vini');
    showToast(`"${newVino.nome}" aggiunto: modificalo direttamente sulla scheda`, 'success');
  }

  function duplicateVino(idx) {
    const orig = state.vini[idx];
    const clone = JSON.parse(JSON.stringify(orig));
    clone.id = 'vino-' + Date.now().toString(36);
    clone.nome += ' (Copia)';
    clone.nome_ordine = clone.nome;
    state.vini.splice(idx + 1, 0, clone);
    reindex(state.vini);
    renderVisualVini();
    markDirty('vini');
    showToast(`Vino duplicato con successo`, 'success');
  }

  function deleteVino(idx) {
    const v = state.vini[idx];
    if (!confirm(`Sei sicuro di voler eliminare "${v.nome}" dal catalogo?\n(Se vuoi solo nasconderlo temporaneamente ai visitatori, disattiva l'interruttore "Visibile sul sito".)`)) return;
    state.vini.splice(idx, 1);
    reindex(state.vini);
    renderVisualVini();
    markDirty('vini');
    showToast('Vino eliminato', 'info');
  }

  // ---------------------------------------------------------------------------
  // GESTIONE ESPERIENZE: SCHEDE INTERATTIVE INLINE
  // ---------------------------------------------------------------------------
  const refKey = (e) => e.referente || (/lissa/i.test(e.referente_nome || '') ? 'lissa' : 'gianni');
  const refName = (key) => ((state.contatti || {})[key] || {}).nome || (key === 'lissa' ? 'Lissa' : 'Gianni');

  function renderVisualEsperienze() {
    const grid = $('esperienzeVisualGrid');
    if (!grid) return;
    const list = sortedByOrder(state.esperienze || []);
    grid.innerHTML = list.length ? '' : '<p class="empty-hint">Nessuna esperienza configurata. Clicca su "+ Nuova esperienza".</p>';

    list.forEach((e, idx) => {
      const isHidden = e.attivo === false;
      const card = document.createElement('div');
      card.className = 'visual-exp-card' + (isHidden ? ' is-hidden' : '');

      // Foto cover con cambio immediato al tocco
      const photoBox = document.createElement('div');
      photoBox.className = 'exp-photo-box';
      photoBox.title = 'Clicca per sostituire la foto di copertina';

      const badgeFloat = document.createElement('span');
      badgeFloat.className = 'exp-badge-float';
      badgeFloat.textContent = e.badge || `0${idx + 1} / TOUR`;
      bindInlineEdit(badgeFloat, e, 'badge', { fallback: `0${idx + 1} / TOUR`, fileKey: 'esperienze' });

      photoBox.appendChild(badgeFloat);
      photoBox.innerHTML += `
        <img src="${esc(img(e.immagine))}" alt="${esc(e.titolo)}" class="exp-photo-img">
        <div class="exp-change-photo-badge">
          <i class="fa-solid fa-camera"></i>
          <span>Cambia Foto Copertina</span>
        </div>
      `;
      // riapplica il badge float perché innerHTML lo cancella
      photoBox.prepend(badgeFloat);

      bindInteractivePan(photoBox, {
        getImgEl: () => photoBox.querySelector('.exp-photo-img'),
        getPos: () => e.immagine_pos || '50% 50%',
        setPos: (val) => { e.immagine_pos = val; markDirty('esperienze'); }
      });

      photoBox.addEventListener('click', (evt) => {
        if (evt.target === badgeFloat || badgeFloat.contains(evt.target)) return;
        if (evt.target.closest('.pan-hud') || evt.target.closest('.pan-reticle') || evt.target.closest('.pan-status-badge')) return;
        uploadTarget = { type: 'exp', index: idx };
        $('directExpPhotoInput').click();
      });

      card.appendChild(photoBox);

      // Corpo scheda
      const body = document.createElement('div');
      body.className = 'exp-card-body';

      // Titolo esperienza
      const titleEl = document.createElement('h3');
      titleEl.className = 'exp-title';
      titleEl.textContent = e.titolo || 'Nuova Esperienza';
      bindInlineEdit(titleEl, e, 'titolo', { fallback: 'Titolo Esperienza', fileKey: 'esperienze' });
      body.appendChild(titleEl);

      // Prezzo & unità
      const priceRow = document.createElement('div');
      priceRow.className = 'exp-price-row';

      const priceEl = document.createElement('span');
      priceEl.className = 'exp-price';
      priceEl.textContent = (e.prezzo !== undefined && e.prezzo !== null) ? e.prezzo : '20';
      bindInlineEdit(priceEl, e, 'prezzo', { isNumber: true, fallback: '20', fileKey: 'esperienze' });

      const euroSuffix = document.createElement('span');
      euroSuffix.style.color = 'var(--gold)';
      euroSuffix.style.fontWeight = 'bold';
      euroSuffix.textContent = '€';

      const unitEl = document.createElement('span');
      unitEl.className = 'exp-unit';
      unitEl.textContent = e.unita_prezzo || 'a persona';
      bindInlineEdit(unitEl, e, 'unita_prezzo', { fallback: 'a persona', fileKey: 'esperienze' });

      priceRow.appendChild(priceEl);
      priceRow.appendChild(euroSuffix);
      priceRow.appendChild(unitEl);
      body.appendChild(priceRow);

      // Referente WhatsApp (Gianni o Lissa)
      const currentRef = refKey(e);
      const refBox = document.createElement('div');
      refBox.className = 'exp-ref-selector';
      refBox.innerHTML = `
        <i class="fa-brands fa-whatsapp" style="color:#25d366;"></i>
        <span>Prenotazioni a:</span>
        <select>
          <option value="gianni" ${currentRef === 'gianni' ? 'selected' : ''}>Gianni</option>
          <option value="lissa" ${currentRef === 'lissa' ? 'selected' : ''}>Lissa</option>
        </select>
      `;
      refBox.querySelector('select').addEventListener('change', (evt) => {
        const val = evt.target.value;
        e.referente = val;
        const cont = (state.contatti || {})[val] || {};
        e.referente_nome = (cont.nome || val).split(' ')[0];
        e.referente_wa = cont.wa_numero || '';
        e.testo_pulsante = `${e.referente_nome} Whatsapp`;
        markDirty('esperienze');
        showToast(`Referente prenotazioni impostato su ${e.referente_nome}`, 'info');
      });
      body.appendChild(refBox);

      // Descrizione
      const descEl = document.createElement('div');
      descEl.className = 'wine-desc';
      descEl.textContent = e.descrizione || 'Descrizione dei vini assaggiati, salumi artigianali e visita alla cantina…';
      bindInlineEdit(descEl, e, 'descrizione', {
        multiline: true,
        fallback: 'Descrizione esperienza…',
        fileKey: 'esperienze'
      });
      body.appendChild(descEl);

      // Barra azioni inferiore
      const botBar = document.createElement('div');
      botBar.style.display = 'flex';
      botBar.style.alignItems = 'center';
      botBar.style.justifyContent = 'space-between';
      botBar.style.borderTop = '1px solid var(--line)';
      botBar.style.paddingTop = '0.75rem';
      botBar.style.marginTop = '0.5rem';

      const expStatus = document.createElement('label');
      expStatus.className = 'card-status-toggle';
      expStatus.innerHTML = `
        <span class="switch">
          <input type="checkbox" ${e.attivo !== false ? 'checked' : ''}>
          <span class="slider"></span>
        </span>
        <span style="font-weight:600;">${e.attivo !== false ? 'Visibile' : 'Nascosta'}</span>
      `;
      expStatus.querySelector('input').addEventListener('change', (evt) => {
        e.attivo = evt.target.checked;
        card.classList.toggle('is-hidden', !e.attivo);
        expStatus.querySelector('span:last-child').textContent = e.attivo ? 'Visibile' : 'Nascosta';
        markDirty('esperienze');
      });

      const expActions = document.createElement('div');
      expActions.className = 'card-btns';
      expActions.innerHTML = `
        <button class="btn btn-icon btn-sm" title="Sposta su" ${idx === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
        <button class="btn btn-icon btn-sm" title="Sposta giù" ${idx === list.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
        <button class="btn btn-secondary btn-sm" title="Centra e inquadra foto"><i class="fa-solid fa-arrows-up-down-left-right"></i></button>
        <button class="btn btn-secondary btn-sm" title="Duplica esperienza"><i class="fa-solid fa-copy"></i></button>
        <button class="btn btn-danger btn-sm" title="Elimina"><i class="fa-solid fa-trash"></i></button>
      `;
      const [bUp, bDown, bCrop, bDup, bDel] = expActions.querySelectorAll('button');
      bUp.addEventListener('click', () => { moveItem(list, idx, -1); renderVisualEsperienze(); markDirty('esperienze'); });
      bDown.addEventListener('click', () => { moveItem(list, idx, 1); renderVisualEsperienze(); markDirty('esperienze'); });
      bCrop.addEventListener('click', () => {
        openDashCrop({
          title: 'Inquadratura: ' + (e.titolo || 'Esperienza'),
          subtitle: 'Proporzioni 16:10',
          imgUrl: e.immagine,
          targetObj: e,
          targetKey: 'immagine_pos',
          fileKey: 'esperienze',
          aspect: 16 / 10,
          onSave: () => renderVisualEsperienze()
        });
      });
      bDup.addEventListener('click', () => duplicateExp(idx));
      bDel.addEventListener('click', () => deleteExp(idx));

      botBar.appendChild(expStatus);
      botBar.appendChild(expActions);
      body.appendChild(botBar);

      card.appendChild(body);
      grid.appendChild(card);
    });

    updateBadges();
  }

  function addNewExp() {
    const list = state.esperienze || (state.esperienze = []);
    const newIdx = list.length + 1;
    const newExp = {
      id: 'exp-' + Date.now().toString(36),
      badge: `0${newIdx} / DEGUSTAZIONE`,
      titolo: 'Nuova Degustazione ' + newIdx,
      prezzo: 20,
      unita_prezzo: 'euro a persona',
      descrizione: 'Assaggio di calici di Prosecco Superiore DOCG con tagliere di salumi e pane di nostra produzione…',
      tags: [],
      immagine: 'assets/images/stock/calice-bollicine.jpg',
      immagine_pos: '50% 50%',
      referente: 'gianni',
      referente_nome: 'Gianni',
      referente_wa: '393462443607',
      testo_pulsante: 'Gianni Whatsapp',
      messaggio_whatsapp: 'Buongiorno, vorrei informazioni sulla nuova degustazione',
      ordine: newIdx,
      attivo: true
    };
    list.push(newExp);
    renderVisualEsperienze();
    markDirty('esperienze');
    showToast(`"${newExp.titolo}" creata: personalizzala direttamente sulla scheda`, 'success');
  }

  function duplicateExp(idx) {
    const orig = state.esperienze[idx];
    const clone = JSON.parse(JSON.stringify(orig));
    clone.id = 'exp-' + Date.now().toString(36);
    clone.titolo += ' (Copia)';
    state.esperienze.splice(idx + 1, 0, clone);
    reindex(state.esperienze);
    renderVisualEsperienze();
    markDirty('esperienze');
    showToast('Esperienza duplicata con successo', 'success');
  }

  function deleteExp(idx) {
    const e = state.esperienze[idx];
    if (!confirm(`Eliminare l'esperienza "${e.titolo}"?`)) return;
    state.esperienze.splice(idx, 1);
    reindex(state.esperienze);
    renderVisualEsperienze();
    markDirty('esperienze');
    showToast('Esperienza eliminata', 'info');
  }

  // ---------------------------------------------------------------------------
  // GESTIONE AGRITURISMO – RULLINO FOTOGRAFICO LIVE
  // ---------------------------------------------------------------------------
  function gallery() {
    if (!state.agriturismo) state.agriturismo = {};
    if (!state.agriturismo.galleria) state.agriturismo.galleria = [];
    return sortedByOrder(state.agriturismo.galleria);
  }

  function renderVisualGalleria() {
    const grid = $('agriGalleriaGrid');
    if (!grid) return;
    const list = gallery();
    grid.innerHTML = list.length ? '' : '<p class="empty-hint">Nessuna foto nel rullino. Clicca su "Aggiungi foto al rullino".</p>';

    list.forEach((f, idx) => {
      const card = document.createElement('div');
      card.className = 'visual-photo-card';

      // Riquadro immagine cliccabile per sostituire la foto
      const imgBox = document.createElement('div');
      imgBox.className = 'photo-card-img-box';
      imgBox.title = 'Clicca per sostituire questa foto';
      imgBox.innerHTML = `
        <img src="${esc(img(f.immagine))}" class="photo-card-img" alt="">
        <div class="exp-change-photo-badge">
          <i class="fa-solid fa-camera"></i>
          <span>Cambia Foto</span>
        </div>
      `;
      bindInteractivePan(imgBox, {
        getImgEl: () => imgBox.querySelector('.photo-card-img'),
        getPos: () => f.immagine_pos || '50% 50%',
        setPos: (val) => { f.immagine_pos = val; markDirty('agriturismo'); }
      });
      imgBox.addEventListener('click', (evt) => {
        if (evt.target.closest('.pan-hud') || evt.target.closest('.pan-reticle') || evt.target.closest('.pan-status-badge')) return;
        uploadTarget = { type: 'gallery', index: idx };
        $('directGalleryPhotoInput').click();
      });
      card.appendChild(imgBox);

      // Didascalia modificabile inline
      const captionWrap = document.createElement('div');
      captionWrap.className = 'photo-card-caption-wrap';

      const captionEl = document.createElement('div');
      captionEl.className = 'photo-caption visual-editable';
      captionEl.textContent = f.didascalia || 'Scrivi qui la didascalia della foto…';
      bindInlineEdit(captionEl, f, 'didascalia', {
        multiline: true,
        fallback: 'Didascalia della foto…',
        fileKey: 'agriturismo'
      });
      captionWrap.appendChild(captionEl);

      // Barra azioni
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.justifyContent = 'space-between';
      actions.style.alignItems = 'center';
      actions.style.borderTop = '1px solid var(--line)';
      actions.style.paddingTop = '0.65rem';
      actions.style.marginTop = 'auto';

      actions.innerHTML = `
        <span style="font-family:var(--font-mono); font-size:0.68rem; color:var(--text-dim);">Foto ${idx + 1}</span>
        <div class="card-btns">
          <button class="btn btn-icon btn-sm" title="Sposta a sinistra" ${idx === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-left"></i></button>
          <button class="btn btn-icon btn-sm" title="Sposta a destra" ${idx === list.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-right"></i></button>
          <button class="btn btn-secondary btn-sm" title="Centra e inquadra"><i class="fa-solid fa-arrows-up-down-left-right"></i></button>
          <button class="btn btn-danger btn-sm" title="Rimuovi"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      const [bLeft, bRight, bCrop, bDel] = actions.querySelectorAll('button');
      bLeft.addEventListener('click', () => { moveItem(list, idx, -1); renderVisualGalleria(); markDirty('agriturismo'); });
      bRight.addEventListener('click', () => { moveItem(list, idx, 1); renderVisualGalleria(); markDirty('agriturismo'); });
      bCrop.addEventListener('click', () => {
        openDashCrop({
          title: 'Inquadratura foto rullino',
          subtitle: 'Proporzioni 16:10',
          imgUrl: f.immagine,
          targetObj: f,
          targetKey: 'immagine_pos',
          fileKey: 'agriturismo',
          aspect: 16 / 10,
          onSave: () => renderVisualGalleria()
        });
      });
      bDel.addEventListener('click', () => {
        if (!confirm('Rimuovere questa foto dal rullino?')) return;
        list.splice(idx, 1);
        reindex(list);
        renderVisualGalleria();
        markDirty('agriturismo');
      });

      captionWrap.appendChild(actions);
      card.appendChild(captionWrap);
      grid.appendChild(card);
    });

    updateBadges();
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
    renderVisualGalleria();
    updateBadges();
    markDirty('agriturismo');
    showToast('Foto aggiunte al rullino', 'success');
  }

  // ---------------------------------------------------------------------------
  // MOTORE DI CENTRATURA DIRETTA & SPOSTAMENTO NATURALE DELLE IMMAGINI
  // Clicchi e trascini direttamente col mouse dove vuoi l'immagine, rotella per zoom,
  // doppio clic per ricentrare. Nessun mirino ingombrante o tasti antiintuitivi.
  // ---------------------------------------------------------------------------
  function parsePos(str) {
    if (!str) return { x: 50, y: 50, scale: 1 };
    const parts = String(str).trim().split('/');
    const coords = (parts[0] || '').trim().split(/\s+/);
    const x = parseFloat(coords[0]);
    const y = parseFloat(coords[1] !== undefined ? coords[1] : coords[0]);
    const scale = parts[1] ? parseFloat(parts[1]) : 1;
    return {
      x: isNaN(x) ? 50 : Math.max(0, Math.min(100, x)),
      y: isNaN(y) ? 50 : Math.max(0, Math.min(100, y)),
      scale: isNaN(scale) ? 1 : Math.max(1, Math.min(2.5, scale))
    };
  }

  function formatPos(x, y, scale) {
    const rx = Math.round(Math.max(0, Math.min(100, x)));
    const ry = Math.round(Math.max(0, Math.min(100, y)));
    const rs = Math.round(Math.max(1, Math.min(2.5, scale)) * 100) / 100;
    return rs > 1.01 ? `${rx}% ${ry}% / ${rs}` : `${rx}% ${ry}%`;
  }

  function bindInteractivePan(container, opts) {
    if (!container) return;
    if (container._panInited) {
      if (container._updatePanVisual) container._updatePanVisual();
      return;
    }
    container._panInited = true;
    container.classList.add('preview-interactive-pan');

    // Badge discreto che appare solo al passaggio del mouse
    const badge = document.createElement('div');
    badge.className = 'pan-badge';
    badge.innerHTML = '<i class="fa-solid fa-hand"></i> Trascina per spostare';
    container.appendChild(badge);

    function applyVisual(x, y, scale) {
      const rx = Math.round(Math.max(0, Math.min(100, x)));
      const ry = Math.round(Math.max(0, Math.min(100, y)));
      const rs = Math.round(Math.max(1, Math.min(2.5, scale)) * 100) / 100;
      const posStr = `${rx}% ${ry}%`;

      if (opts.isBg) {
        container.style.backgroundPosition = posStr;
        if (rs > 1.01) container.style.backgroundSize = `${Math.round(rs * 100)}%`;
        else container.style.backgroundSize = 'cover';
      } else {
        const targetImg = opts.getImgEl ? opts.getImgEl() : (opts.imgEl || container.querySelector('img'));
        if (targetImg) {
          targetImg.style.objectPosition = posStr;
          targetImg.style.transform = rs > 1.01 ? `scale(${rs})` : '';
          targetImg.style.transformOrigin = posStr;
        }
      }
      badge.innerHTML = `<i class="fa-solid fa-arrows-up-down-left-right"></i> ${rx}% ${ry}%${rs > 1.01 ? ' · Zoom ' + Math.round(rs * 100) + '%' : ''}`;
    }

    container._updatePanVisual = () => {
      const p = parsePos(opts.getPos());
      applyVisual(p.x, p.y, p.scale);
    };
    container._updatePanVisual();

    function commitPos(x, y, scale) {
      const val = formatPos(x, y, scale);
      opts.setPos(val);
      applyVisual(x, y, scale);
    }

    // Drag naturale con il mouse
    let isDragging = false;
    let startX = 0, startY = 0;
    let initX = 50, initY = 50, initScale = 1;
    let curX = 50, curY = 50;

    container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.exp-change-photo-badge') || e.target.closest('.wine-change-photo-badge') || e.target.closest('.page-backdrop-hover-badge')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const p = parsePos(opts.getPos());
      initX = curX = p.x;
      initY = curY = p.y;
      initScale = p.scale;
      container.classList.add('is-dragging');
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const rect = container.getBoundingClientRect();
      const dx = ((e.clientX - startX) / (rect.width || 400)) * (100 / (initScale || 1));
      const dy = ((e.clientY - startY) / (rect.height || 300)) * (100 / (initScale || 1));
      curX = Math.round(Math.max(0, Math.min(100, initX - dx)));
      curY = Math.round(Math.max(0, Math.min(100, initY - dy)));
      applyVisual(curX, curY, initScale);
    }, { passive: true });

    window.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      container.classList.remove('is-dragging');
      commitPos(curX, curY, initScale);
    });

    // Zoom fluido con rotella del mouse
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      const p = parsePos(opts.getPos());
      const newScale = Math.round(Math.max(1, Math.min(2.5, p.scale + delta)) * 100) / 100;
      commitPos(p.x, p.y, newScale);
    }, { passive: false });

    // Doppio clic: ricentra rapidamente al 50% 50%
    container.addEventListener('dblclick', (e) => {
      if (e.target.closest('.exp-change-photo-badge') || e.target.closest('.wine-change-photo-badge') || e.target.closest('.page-backdrop-hover-badge')) return;
      e.preventDefault();
      commitPos(50, 50, 1);
      showToast('Posizione foto reimpostata al centro', 'info');
    });
  }

  function initPreviewExpansion() {
    // Pulsanti Vista Ampia (espansione preview nella dashboard)
    document.querySelectorAll('.btn-toggle-expand').forEach((btn) => {
      btn.addEventListener('click', () => {
        const split = btn.closest('.split-studio');
        if (!split) return;
        const isExp = split.classList.toggle('is-expanded');
        btn.classList.toggle('active', isExp);
        const icon = btn.querySelector('i');
        const span = btn.querySelector('span');
        if (icon) icon.className = isExp ? 'fa-solid fa-minimize' : 'fa-solid fa-maximize';
        if (span) span.textContent = isExp ? 'Riduci' : 'Vista Ampia';
      });
    });

    // Selettore dispositivi (Desktop 16:9, Tablet 4:3, Mobile 9:16)
    document.querySelectorAll('.preview-device-switcher').forEach((switcher) => {
      const splitPrev = switcher.closest('.split-preview');
      const viewport = splitPrev ? splitPrev.querySelector('.preview-viewport') : null;
      switcher.querySelectorAll('.btn-device-mode').forEach((btn) => {
        btn.addEventListener('click', () => {
          switcher.querySelectorAll('.btn-device-mode').forEach((b) => b.classList.toggle('active', b === btn));
          const dev = btn.dataset.device;
          if (viewport) {
            viewport.classList.toggle('is-tablet', dev === 'tablet');
            viewport.classList.toggle('is-mobile', dev === 'mobile');
          }
        });
      });
    });
  }

  function initDirectInteractivePans() {
    // 1. Home Hero
    const hBox = $('previewHeroBox');
    if (hBox) {
      bindInteractivePan(hBox, {
        isBg: true,
        getPos: () => (state.impostazioni || {}).hero_immagine_pos || '50% 50%',
        setPos: (v) => { state.impostazioni.hero_immagine_pos = v; markDirty('impostazioni'); updateHomePreview(); }
      });
    }

    // 2. Home Porte
    const dProd = $('previewDoorProdCard');
    if (dProd) {
      bindInteractivePan(dProd, {
        getImgEl: () => $('previewDoorProdImg'),
        getPos: () => (state.impostazioni || {}).porte_prodotti_img_pos || '50% 50%',
        setPos: (v) => { state.impostazioni.porte_prodotti_img_pos = v; markDirty('impostazioni'); updateHomePreview(); }
      });
    }
    const dExp = $('previewDoorExpCard');
    if (dExp) {
      bindInteractivePan(dExp, {
        getImgEl: () => $('previewDoorExpImg'),
        getPos: () => (state.impostazioni || {}).porte_esperienze_img_pos || '50% 50%',
        setPos: (v) => { state.impostazioni.porte_esperienze_img_pos = v; markDirty('impostazioni'); updateHomePreview(); }
      });
    }
    const dAgri = $('previewDoorAgriCard');
    if (dAgri) {
      bindInteractivePan(dAgri, {
        getImgEl: () => $('previewDoorAgriImg'),
        getPos: () => (state.impostazioni || {}).porte_agriturismo_img_pos || '50% 50%',
        setPos: (v) => { state.impostazioni.porte_agriturismo_img_pos = v; markDirty('impostazioni'); updateHomePreview(); }
      });
    }

    // 3. Chi Siamo Story Img
    const csWrap = $('prevCsImgWrap');
    if (csWrap) {
      bindInteractivePan(csWrap, {
        getImgEl: () => $('prevCsImg'),
        getPos: () => (state.chiSiamo || {}).immagine_pos || '50% 50%',
        setPos: (v) => { state.chiSiamo.immagine_pos = v; markDirty('chiSiamo'); updateChiSiamoPreview(); }
      });
    }

    // 4. Territorio Panoramic Box
    const terBox = $('prevTerBox');
    if (terBox) {
      bindInteractivePan(terBox, {
        isBg: true,
        getPos: () => (state.territorio || {}).immagine_sfondo_pos || '50% 50%',
        setPos: (v) => { state.territorio.immagine_sfondo_pos = v; markDirty('territorio'); updateTerritorioPreview(); }
      });
    }

    // 5. Contatti Cantina Banner
    const cBox = $('prevContactBox');
    if (cBox) {
      bindInteractivePan(cBox, {
        isBg: true,
        getPos: () => (((state.contatti || {}).azienda || {}).immagine_pos) || '50% 50%',
        setPos: (v) => {
          if (!state.contatti) state.contatti = {};
          if (!state.contatti.azienda) state.contatti.azienda = {};
          state.contatti.azienda.immagine_pos = v;
          markDirty('contatti');
          updateContattiPreview();
        }
      });
    }

    // 6. Thumbnails dedicate nei backdrop
    const heroTh = $('homeHeroThumb');
    if (heroTh && heroTh.parentElement) {
      bindInteractivePan(heroTh.parentElement, {
        getImgEl: () => heroTh,
        getPos: () => (state.impostazioni || {}).hero_immagine_pos || '50% 50%',
        setPos: (v) => { state.impostazioni.hero_immagine_pos = v; markDirty('impostazioni'); updateHomePreview(); }
      });
    }
    const csTh = $('csThumbImg');
    if (csTh && csTh.parentElement) {
      bindInteractivePan(csTh.parentElement, {
        getImgEl: () => csTh,
        getPos: () => (state.chiSiamo || {}).immagine_pos || '50% 50%',
        setPos: (v) => { state.chiSiamo.immagine_pos = v; markDirty('chiSiamo'); updateChiSiamoPreview(); }
      });
    }
    const terTh = $('terThumbImg');
    if (terTh && terTh.parentElement) {
      bindInteractivePan(terTh.parentElement, {
        getImgEl: () => terTh,
        getPos: () => (state.territorio || {}).immagine_sfondo_pos || '50% 50%',
        setPos: (v) => { state.territorio.immagine_sfondo_pos = v; markDirty('territorio'); updateTerritorioPreview(); }
      });
    }
    const prodTh = $('prodOpeningThumb');
    if (prodTh && prodTh.parentElement) {
      bindInteractivePan(prodTh.parentElement, {
        getImgEl: () => prodTh,
        getPos: () => ((state.impostazioni || {}).testi_sezioni || {}).vini_immagine_pos || '50% 50%',
        setPos: (v) => {
          if (!state.impostazioni) state.impostazioni = {};
          if (!state.impostazioni.testi_sezioni) state.impostazioni.testi_sezioni = {};
          state.impostazioni.testi_sezioni.vini_immagine_pos = v;
          markDirty('impostazioni');
        }
      });
    }
    const expTh = $('expHeroThumb');
    if (expTh && expTh.parentElement) {
      bindInteractivePan(expTh.parentElement, {
        getImgEl: () => expTh,
        getPos: () => ((state.impostazioni || {}).testi_sezioni || {}).esperienze_immagine_pos || '50% 50%',
        setPos: (v) => {
          if (!state.impostazioni) state.impostazioni = {};
          if (!state.impostazioni.testi_sezioni) state.impostazioni.testi_sezioni = {};
          state.impostazioni.testi_sezioni.esperienze_immagine_pos = v;
          markDirty('impostazioni');
        }
      });
    }
    const agriTh = $('agriCoverThumb');
    if (agriTh && agriTh.parentElement) {
      bindInteractivePan(agriTh.parentElement, {
        getImgEl: () => agriTh,
        getPos: () => (state.agriturismo || {}).immagine_pos || '50% 50%',
        setPos: (v) => {
          if (!state.agriturismo) state.agriturismo = {};
          state.agriturismo.immagine_pos = v;
          markDirty('agriturismo');
        }
      });
    }
    const contTh = $('contactAziendaThumb');
    if (contTh && contTh.parentElement) {
      bindInteractivePan(contTh.parentElement, {
        getImgEl: () => contTh,
        getPos: () => (((state.contatti || {}).azienda || {}).immagine_pos) || '50% 50%',
        setPos: (v) => {
          if (!state.contatti) state.contatti = {};
          if (!state.contatti.azienda) state.contatti.azienda = {};
          state.contatti.azienda.immagine_pos = v;
          markDirty('contatti');
          updateContattiPreview();
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // ANTEPRIME LIVE IN TEMPO REALE (SPLIT-SCREEN DESTRA)
  // ---------------------------------------------------------------------------
  function updateHomePreview() {
    const imp = state.impostazioni || {};
    const banner = imp.banner_annuncio || {};

    // Barra avviso
    const bBox = $('previewBannerBox');
    if (bBox) {
      bBox.style.display = banner.attivo ? 'flex' : 'none';
      bBox.style.borderColor = banner.colore || 'var(--gold)';
      bBox.style.color = banner.colore || 'var(--gold)';
      $('previewBannerText').textContent = banner.testo || 'Vendemmia 2026 in corso';
    }

    // Hero Box
    const hBox = $('previewHeroBox');
    if (hBox) {
      const bgImg = img(imp.hero_immagine || 'assets/images/p9201811-2.jpg');
      hBox.style.backgroundImage = `radial-gradient(ellipse at center, rgba(13,12,10,0.55) 0%, rgba(13,12,10,0.92) 100%), url('${bgImg}')`;
      if (imp.hero_immagine_pos) {
        const parts = String(imp.hero_immagine_pos).split('/');
        hBox.style.backgroundPosition = parts[0].trim();
        const sc = parseFloat(parts[1]) || 1;
        if (sc > 1.01) hBox.style.backgroundSize = `${Math.round(sc * 100)}%`;
        else hBox.style.backgroundSize = 'cover';
      } else {
        hBox.style.backgroundPosition = 'center';
        hBox.style.backgroundSize = 'cover';
      }
      if (hBox._updatePanVisual) hBox._updatePanVisual();
      $('previewHeroClaim').textContent = imp.claim || 'Una tradizione, un’emozione';
      $('previewHeroSubtitle').textContent = imp.hero_sottotitolo || 'A Solighetto, tra le colline del Prosecco Superiore DOCG';
    }

    // Porte d'accesso (Prodotti, Esperienze, Agriturismo)
    const pProd = $('previewDoorProdImg');
    const pExp = $('previewDoorExpImg');
    const pAgri = $('previewDoorAgriImg');
    if (pProd) {
      pProd.src = img(imp.porte_prodotti_img || 'assets/images/bottiglie/giusto.png');
      if (imp.porte_prodotti_img_pos) {
        const parts = String(imp.porte_prodotti_img_pos).split('/');
        pProd.style.objectPosition = parts[0].trim();
        const sc = parseFloat(parts[1]) || 1;
        pProd.style.transform = sc > 1.01 ? `scale(${sc})` : '';
      }
    }
    if (pExp) {
      pExp.src = img(imp.porte_esperienze_img || 'assets/images/stock/tagliere-salumi.jpg');
      if (imp.porte_esperienze_img_pos) {
        const parts = String(imp.porte_esperienze_img_pos).split('/');
        pExp.style.objectPosition = parts[0].trim();
        const sc = parseFloat(parts[1]) || 1;
        pExp.style.transform = sc > 1.01 ? `scale(${sc})` : '';
      }
    }
    if (pAgri) {
      pAgri.src = img(imp.porte_agriturismo_img || 'assets/images/stock/pane-olive.jpg');
      if (imp.porte_agriturismo_img_pos) {
        const parts = String(imp.porte_agriturismo_img_pos).split('/');
        pAgri.style.objectPosition = parts[0].trim();
        const sc = parseFloat(parts[1]) || 1;
        pAgri.style.transform = sc > 1.01 ? `scale(${sc})` : '';
      }
    }
  }

  function updateChiSiamoPreview() {
    const cs = state.chiSiamo || {};
    if ($('prevCsEyebrow')) $('prevCsEyebrow').textContent = cs.etichetta || 'LA NOSTRA STORIA';
    if ($('prevCsTitle')) $('prevCsTitle').textContent = cs.titolo || 'Chi siamo';
    if ($('prevCsIntro')) $('prevCsIntro').textContent = cs.introduzione || '“Col Bel” in dialetto veneto significa “bel colle”.';
    if ($('prevCsImg')) {
      $('prevCsImg').src = img(cs.immagine || 'assets/images/web/vendemmia-gianni.jpg');
      if (cs.immagine_pos) {
        const parts = String(cs.immagine_pos).split('/');
        $('prevCsImg').style.objectPosition = parts[0].trim();
        const sc = parseFloat(parts[1]) || 1;
        $('prevCsImg').style.transform = sc > 1.01 ? `scale(${sc})` : '';
      } else {
        $('prevCsImg').style.objectPosition = 'center';
        $('prevCsImg').style.transform = '';
      }
    }
    const csWrap = $('prevCsImgWrap');
    if (csWrap && csWrap._updatePanVisual) csWrap._updatePanVisual();

    if ($('prevCsP0')) $('prevCsP0').textContent = cs.paragrafo_0 || '';
    if ($('prevCsP1')) $('prevCsP1').textContent = cs.paragrafo_1 || '';
    if ($('prevCsP2')) $('prevCsP2').textContent = cs.paragrafo_2 || '';

    const qBox = $('prevCsQuoteBox');
    if (qBox) {
      qBox.style.display = cs.citazione ? 'block' : 'none';
      if ($('prevCsQuote')) $('prevCsQuote').textContent = cs.citazione || '';
    }
  }

  function updateTerritorioPreview() {
    const ter = state.territorio || {};
    const tBox = $('prevTerBox');
    if (tBox) {
      const bg = img(ter.immagine_sfondo || 'assets/images/IMG-20180409-WA0003.jpg');
      tBox.style.backgroundImage = `linear-gradient(to top, rgba(13,12,10,0.95) 15%, rgba(13,12,10,0.4) 100%), url('${bg}')`;
      tBox.style.backgroundSize = 'cover';
      if (ter.immagine_sfondo_pos) {
        const parts = String(ter.immagine_sfondo_pos).split('/');
        tBox.style.backgroundPosition = parts[0].trim();
        const sc = parseFloat(parts[1]) || 1;
        if (sc > 1.01) tBox.style.backgroundSize = `${Math.round(sc * 100)}%`;
      } else {
        tBox.style.backgroundPosition = 'center';
      }
      if (tBox._updatePanVisual) tBox._updatePanVisual();
    }
    if ($('prevTerEyebrow')) $('prevTerEyebrow').textContent = ter.etichetta || 'TERRITORIO';
    if ($('prevTerTitle')) $('prevTerTitle').textContent = ter.titolo || 'Solighetto';
    if ($('prevTerQuote')) $('prevTerQuote').textContent = ter.citazione || '';
    if ($('prevTerDesc1')) $('prevTerDesc1').textContent = ter.descrizione || '';
    if ($('prevTerDesc2')) $('prevTerDesc2').textContent = ter.descrizione_2 || '';

    // Sincronizza anche la bottiglia e i capitoli a destra
    const sc = state.scrollytelling || {};
    if ($('prevBottleImg')) $('prevBottleImg').src = img(sc.immagine_bottiglia || 'assets/images/bottiglie/giusto.png');
    const stepsBox = $('prevBottleSteps');
    if (stepsBox && sc.step) {
      stepsBox.innerHTML = sc.step.map((st, i) => `
        <div style="border-bottom:1px solid rgba(212,175,55,0.14); padding-bottom:0.5rem; margin-bottom:0.4rem;">
          <strong style="font-family:var(--font-serif); font-size:1.15rem; color:var(--gold); display:block; margin-bottom:0.2rem;">${esc(st.titolo)}</strong>
          <span style="font-size:0.84rem; color:#f2ebdf; line-height:1.45; display:block;">${esc(st.testo)}</span>
        </div>
      `).join('');
    }
  }

  function updateContattiPreview() {
    const c = state.contatti || {};
    const g = c.gianni || {};
    const l = c.lissa || {};
    const az = c.azienda || {};

    const cBox = $('prevContactBox');
    if (cBox) {
      const bg = img(az.immagine || 'assets/images/azienda-cantina.jpg');
      cBox.style.backgroundImage = `linear-gradient(to top, rgba(13,12,10,0.92) 15%, rgba(13,12,10,0.3) 100%), url('${bg}')`;
      if (az.immagine_pos) {
        const parts = String(az.immagine_pos).split('/');
        cBox.style.backgroundPosition = parts[0].trim();
        const sc = parseFloat(parts[1]) || 1;
        if (sc > 1.01) cBox.style.backgroundSize = `${Math.round(sc * 100)}%`;
      } else {
        cBox.style.backgroundPosition = 'center';
      }
      if (cBox._updatePanVisual) cBox._updatePanVisual();
    }

    // Gianni
    if ($('prevGianniNome')) $('prevGianniNome').textContent = g.nome || 'Gianni Teo';
    if ($('prevGianniRuolo')) $('prevGianniRuolo').textContent = (g.ruolo || 'CANTINA & TOUR').toUpperCase();
    if ($('prevGianniTel')) $('prevGianniTel').textContent = g.telefono || '+39 346 2443607';
    if ($('prevGianniEmail')) $('prevGianniEmail').textContent = g.email || 'gianniteo@libero.it';

    // Lissa
    if ($('prevLissaNome')) $('prevLissaNome').textContent = l.nome || 'Lissa Veilleux';
    if ($('prevLissaRuolo')) $('prevLissaRuolo').textContent = (l.ruolo || 'CUCINA & DEGUSTAZIONI').toUpperCase();
    if ($('prevLissaTel')) $('prevLissaTel').textContent = l.telefono || '+39 349 4356778';
    if ($('prevLissaEmail')) $('prevLissaEmail').textContent = l.email || 'lmveilleux@gmail.com';

    // Azienda
    if ($('prevAziendaIndirizzo')) $('prevAziendaIndirizzo').textContent = az.indirizzo || 'Via Drio Cisa, 2, Solighetto (TV)';
    if ($('prevAziendaEmail')) $('prevAziendaEmail').textContent = az.email || 'lissa@colbelwine.com';
    if ($('prevContactTitle')) $('prevContactTitle').textContent = az.nome || 'Azienda Agricola ColBel';
  }

  function renderAllLivePreviews() {
    updateHomePreview();
    updateChiSiamoPreview();
    updateTerritorioPreview();
    updateContattiPreview();
    initDirectInteractivePans();
  }

  // ---------------------------------------------------------------------------
  // Campi semplici collegati con data-bind
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
    renderAllLivePreviews();
  }

  // ---------------------------------------------------------------------------
  // Campi immagine con anteprima e upload
  // ---------------------------------------------------------------------------
  function refreshImgPreviews(scope) {
    (scope || document).querySelectorAll('[data-img-field]').forEach((f) => {
      const input = f.querySelector('input[type="text"]');
      const prev = f.querySelector('.img-field-preview');
      if (input && prev) {
        prev.src = img(input.value.trim());
        prev.style.visibility = input.value.trim() ? 'visible' : 'hidden';
      }
      const oldBtn = f.querySelector('.btn-crop-field');
      if (oldBtn) oldBtn.remove();
    });
    // Sincronizza i thumbnail dedicati di testata/sfondo
    const imp = state.impostazioni || {};
    const ts = imp.testi_sezioni || {};
    if ($('homeHeroThumb')) $('homeHeroThumb').src = img(imp.hero_immagine || '');
    if ($('csThumbImg')) $('csThumbImg').src = img((state.chiSiamo || {}).immagine || '');
    if ($('terThumbImg')) $('terThumbImg').src = img((state.territorio || {}).immagine_sfondo || '');
    if ($('prodOpeningThumb')) $('prodOpeningThumb').src = img(ts.vini_immagine || '');
    if ($('expHeroThumb')) $('expHeroThumb').src = img(ts.esperienze_immagine || '');
    if ($('agriCoverThumb')) $('agriCoverThumb').src = img((state.agriturismo || {}).immagine || '');
    if ($('contactAziendaThumb')) $('contactAziendaThumb').src = img(((state.contatti || {}).azienda || {}).immagine || '');
  }

  function initImgFields() {
    document.addEventListener('input', (e) => {
      const f = e.target.closest('[data-img-field]');
      if (f && e.target.type === 'text') {
        refreshImgPreviews(f.parentElement);
        renderAllLivePreviews();
      }
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
  // Sezioni secondarie (Statistiche & Scrollytelling)
  // ---------------------------------------------------------------------------
  function renderStats() {
    const box = $('csStatsGrid');
    if (!box) return;
    const stats = (state.chiSiamo && state.chiSiamo.statistiche) || (state.chiSiamo.statistiche = []);
    box.innerHTML = stats.length ? '' : '<p class="empty-hint" style="padding:0.5rem 0;">Nessun numero inserito.</p>';
    stats.forEach((s, idx) => {
      const row = document.createElement('div');
      row.className = 'form-row stat-row';
      row.innerHTML = `
        <div class="form-group" style="flex:0 0 140px; margin-bottom:0.5rem;">
          <label class="form-label">Numero / Valore</label>
          <input type="text" class="form-control stat-value" value="${esc(s.valore)}" oninput="colbelDash.updateStat(${idx}, 'valore', this.value)">
        </div>
        <div class="form-group" style="flex:1; margin-bottom:0.5rem;">
          <label class="form-label">Descrizione</label>
          <input type="text" class="form-control" value="${esc(s.etichetta)}" oninput="colbelDash.updateStat(${idx}, 'etichetta', this.value)">
        </div>
        <button class="btn btn-danger btn-sm" title="Rimuovi" style="margin-bottom:0.5rem;" onclick="colbelDash.deleteStat(${idx})"><i class="fa-solid fa-trash"></i></button>
      `;
      box.appendChild(row);
    });
  }
  function updateStat(i, field, val) { state.chiSiamo.statistiche[i][field] = val; markDirty('chiSiamo'); }
  function addStat() { state.chiSiamo.statistiche.push({ valore: '', etichetta: '' }); renderStats(); markDirty('chiSiamo'); }
  function deleteStat(i) { state.chiSiamo.statistiche.splice(i, 1); renderStats(); markDirty('chiSiamo'); }

  function renderScrolly() {
    const grid = $('scrollyGrid');
    if (!grid) return;
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
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Testo</label>
          <textarea class="form-control form-textarea" rows="2" oninput="colbelDash.updateStep(${idx}, 'testo', this.value)">${esc(st.testo)}</textarea>
        </div>
      `;
      grid.appendChild(box);
    });
  }
  function updateStep(i, field, val) { state.scrollytelling.step[i][field] = val; markDirty('scrollytelling'); }

  function updateBadges() {
    if ($('badge-prodotti')) $('badge-prodotti').textContent = (state.vini || []).length;
    if ($('badge-esperienze')) $('badge-esperienze').textContent = (state.esperienze || []).length;
    if ($('badge-agriturismo')) $('badge-agriturismo').textContent = ((state.agriturismo || {}).galleria || []).length;
  }

  function moveItem(list, index, dir) {
    const j = index + dir;
    if (j < 0 || j >= list.length) return false;
    [list[index], list[j]] = [list[j], list[index]];
    reindex(list);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Backup JSON Completo
  // ---------------------------------------------------------------------------
  function exportJsonFiles() {
    const all = Object.assign({ esportato_il: new Date().toISOString() }, state);
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colbel-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Backup JSON scaricato con successo', 'success');
  }

  // ---------------------------------------------------------------------------
  // Inizializzazione Tabs & Event Listeners
  // ---------------------------------------------------------------------------
  function initTabs() {
    const activate = (name) => {
      const btn = document.querySelector(`.dash-tab-btn[data-tab="${name}"]`);
      if (!btn) return;
      document.querySelectorAll('.dash-tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + name));
      try { sessionStorage.setItem('colbel_active_tab', name); } catch (e) {}
    };
    document.querySelectorAll('.dash-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => activate(btn.getAttribute('data-tab')));
    });
    try {
      const savedTab = sessionStorage.getItem('colbel_active_tab');
      if (savedTab) activate(savedTab);
    } catch (e) {}
  }

  function initDirectUploadInputs() {
    // Caricamento bottiglia vino
    $('directWinePhotoInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file || uploadTarget.type !== 'vino') return;
      try {
        showToast('Caricamento foto bottiglia…', 'info');
        const path = await uploadImage(file);
        state.vini[uploadTarget.index].immagine = path;
        renderVisualVini();
        markDirty('vini');
        showToast('Foto bottiglia aggiornata', 'success');
      } catch (err) {
        showToast('Errore foto: ' + err.message, 'danger');
      }
    });

    // Caricamento foto esperienza
    $('directExpPhotoInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file || uploadTarget.type !== 'exp') return;
      try {
        showToast('Caricamento foto esperienza…', 'info');
        const path = await uploadImage(file);
        state.esperienze[uploadTarget.index].immagine = path;
        renderVisualEsperienze();
        markDirty('esperienze');
        showToast('Foto esperienza aggiornata', 'success');
      } catch (err) {
        showToast('Errore foto: ' + err.message, 'danger');
      }
    });

    // Caricamento foto rullino singola (sostituzione)
    $('directGalleryPhotoInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file || uploadTarget.type !== 'gallery') return;
      try {
        showToast('Sostituzione foto rullino…', 'info');
        const path = await uploadImage(file);
        gallery()[uploadTarget.index].immagine = path;
        renderVisualGalleria();
        markDirty('agriturismo');
        showToast('Foto sostituita con successo', 'success');
      } catch (err) {
        showToast('Errore foto: ' + err.message, 'danger');
      }
    });
  }

  function renderAll() {
    renderBound();
    renderVisualVini();
    renderVisualEsperienze();
    renderVisualGalleria();
    renderStats();
    renderScrolly();
    renderAllLivePreviews();
    updateBadges();
  }

  // ---------------------------------------------------------------------------
  // DASHBOARD PHOTO FRAMER & CENTERING MODAL
  // ---------------------------------------------------------------------------
  let dashCropCurrent = {
    title: '',
    imgUrl: '',
    posPath: '',
    targetObj: null,
    targetKey: '',
    fileKey: '',
    initialPos: '50% 50%',
    x: 50,
    y: 50,
    scale: 1,
    aspect: 16 / 9,
    onSave: null
  };
  let dashIsDragging = false;
  let dashDragStart = { x: 0, y: 0 };
  let dashDragCoords = { x: 50, y: 50 };

  function parseDashPos(str) {
    if (!str) return { x: 50, y: 50, scale: 1 };
    const parts = String(str).trim().split('/');
    const coords = (parts[0] || '').trim().split(/\s+/);
    const x = parseFloat(coords[0]) || 50;
    const y = parseFloat(coords[1] || coords[0]) || 50;
    const scale = parts[1] ? parseFloat(parts[1]) : 1;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      scale: Math.max(1, Math.min(2.5, scale || 1))
    };
  }

  function applyDashCrop(x, y, scale = dashCropCurrent.scale) {
    dashCropCurrent.x = Math.round(Math.max(0, Math.min(100, x)));
    dashCropCurrent.y = Math.round(Math.max(0, Math.min(100, y)));
    dashCropCurrent.scale = Math.round(Math.max(1, Math.min(2.5, scale)) * 100) / 100;

    const posStr = `${dashCropCurrent.x}% ${dashCropCurrent.y}%`;
    const cropImg = $('dashCropImg');
    const reticle = $('dashCropReticle');
    if (cropImg) {
      cropImg.style.objectPosition = posStr;
      cropImg.style.transform = dashCropCurrent.scale > 1.01 ? `scale(${dashCropCurrent.scale})` : '';
      cropImg.style.transformOrigin = posStr;
    }
    if (reticle) {
      reticle.style.left = dashCropCurrent.x + '%';
      reticle.style.top = dashCropCurrent.y + '%';
    }

    const rZoom = $('dashCropZoomRange');
    const vZoom = $('dashCropZoomVal');
    const zInt = Math.round(dashCropCurrent.scale * 100);
    if (rZoom) rZoom.value = zInt;
    if (vZoom) vZoom.textContent = zInt + '%';

    document.querySelectorAll('.dash-preset').forEach((b) => {
      const bx = parseInt(b.getAttribute('data-x'), 10);
      const by = parseInt(b.getAttribute('data-y'), 10);
      b.classList.toggle('active', Math.abs(bx - dashCropCurrent.x) < 4 && Math.abs(by - dashCropCurrent.y) < 4);
    });
  }

  function openDashCrop(opts) {
    dashCropCurrent.title = opts.title || 'Inquadratura foto';
    dashCropCurrent.imgUrl = opts.imgUrl || '';
    dashCropCurrent.posPath = opts.posPath || '';
    dashCropCurrent.targetObj = opts.targetObj || null;
    dashCropCurrent.targetKey = opts.targetKey || '';
    dashCropCurrent.fileKey = opts.fileKey || '';
    dashCropCurrent.aspect = opts.aspect || (16 / 9);
    dashCropCurrent.onSave = opts.onSave || null;

    let initialPosStr = '50% 50%';
    if (opts.initialPos) initialPosStr = opts.initialPos;
    else if (opts.targetObj && opts.targetKey) initialPosStr = opts.targetObj[opts.targetKey] || '50% 50%';
    else if (opts.posPath) initialPosStr = getByPath(state, opts.posPath) || '50% 50%';
    dashCropCurrent.initialPos = initialPosStr;

    const parsed = parseDashPos(initialPosStr);
    dashCropCurrent.x = parsed.x;
    dashCropCurrent.y = parsed.y;
    dashCropCurrent.scale = parsed.scale;

    if ($('dashCropTitle')) $('dashCropTitle').textContent = opts.title || 'Inquadratura foto';
    if ($('dashCropSubtitle')) $('dashCropSubtitle').textContent = opts.subtitle || 'Proporzioni reali senza distorsioni';

    const vp = $('dashCropViewport');
    const im = $('dashCropImg');
    if (im) im.src = img(opts.imgUrl);
    if (vp) {
      vp.style.aspectRatio = String(opts.aspect.toFixed(3));
      if (opts.aspect >= 1.3) {
        vp.style.maxWidth = '580px';
        vp.style.maxHeight = '340px';
      } else if (opts.aspect <= 0.8) {
        vp.style.maxWidth = '280px';
        vp.style.maxHeight = '420px';
      } else {
        vp.style.maxWidth = '420px';
        vp.style.maxHeight = '360px';
      }
    }

    applyDashCrop(parsed.x, parsed.y, parsed.scale);
    const m = $('dashCropModal');
    if (m) m.hidden = false;
  }

  function closeDashCrop() {
    const m = $('dashCropModal');
    if (m) m.hidden = true;
  }

  function saveDashCrop() {
    const finalVal = dashCropCurrent.scale > 1.01
      ? `${dashCropCurrent.x}% ${dashCropCurrent.y}% / ${dashCropCurrent.scale}`
      : `${dashCropCurrent.x}% ${dashCropCurrent.y}%`;

    if (dashCropCurrent.targetObj && dashCropCurrent.targetKey) {
      dashCropCurrent.targetObj[dashCropCurrent.targetKey] = finalVal;
      if (dashCropCurrent.fileKey) markDirty(dashCropCurrent.fileKey);
    } else if (dashCropCurrent.posPath) {
      setByPath(state, dashCropCurrent.posPath, finalVal);
      const rootKey = dashCropCurrent.posPath.split('.')[0];
      markDirty(rootKey);
    }
    if (dashCropCurrent.onSave) dashCropCurrent.onSave(finalVal);
    renderAllLivePreviews();
    showToast(`Inquadratura salvata (${finalVal})`, 'success');
    closeDashCrop();
  }

  function initDashCropEvents() {
    const vp = $('dashCropViewport');
    if (vp) {
      vp.addEventListener('mousedown', (e) => {
        dashIsDragging = true;
        dashDragStart = { x: e.clientX, y: e.clientY };
        dashDragCoords = { x: dashCropCurrent.x, y: dashCropCurrent.y };
        e.preventDefault();
      });
      window.addEventListener('mousemove', (e) => {
        if (!dashIsDragging) return;
        const dx = e.clientX - dashDragStart.x;
        const dy = e.clientY - dashDragStart.y;
        const rect = vp.getBoundingClientRect();
        const speed = 100 / (dashCropCurrent.scale || 1);
        const nx = dashDragCoords.x - (dx / (rect.width || 400)) * speed;
        const ny = dashDragCoords.y - (dy / (rect.height || 300)) * speed;
        applyDashCrop(nx, ny, dashCropCurrent.scale);
      }, { passive: true });
      window.addEventListener('mouseup', () => { dashIsDragging = false; });
      vp.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        applyDashCrop(dashCropCurrent.x, dashCropCurrent.y, dashCropCurrent.scale + delta);
      }, { passive: false });
    }

    const rZoom = $('dashCropZoomRange');
    if (rZoom) rZoom.addEventListener('input', () => applyDashCrop(dashCropCurrent.x, dashCropCurrent.y, parseFloat(rZoom.value) / 100));
    const zMinus = $('dashCropZoomMinus');
    const zPlus = $('dashCropZoomPlus');
    if (zMinus) zMinus.addEventListener('click', () => applyDashCrop(dashCropCurrent.x, dashCropCurrent.y, dashCropCurrent.scale - 0.1));
    if (zPlus) zPlus.addEventListener('click', () => applyDashCrop(dashCropCurrent.x, dashCropCurrent.y, dashCropCurrent.scale + 0.1));

    document.querySelectorAll('.dash-nudge').forEach((b) => {
      b.addEventListener('click', () => {
        const dx = parseFloat(b.dataset.dx || '0');
        const dy = parseFloat(b.dataset.dy || '0');
        applyDashCrop(dashCropCurrent.x + dx, dashCropCurrent.y + dy, dashCropCurrent.scale);
      });
    });

    document.querySelectorAll('.dash-preset').forEach((b) => {
      b.addEventListener('click', () => {
        const x = parseFloat(b.dataset.x);
        const y = parseFloat(b.dataset.y);
        applyDashCrop(x, y, dashCropCurrent.scale);
      });
    });

    const btnSave = $('dashCropSave');
    const btnCancel = $('dashCropCancel');
    const btnClose = $('dashCropClose');
    const backdrop = $('dashCropBackdrop');
    if (btnSave) btnSave.addEventListener('click', saveDashCrop);
    if (btnCancel) btnCancel.addEventListener('click', closeDashCrop);
    if (btnClose) btnClose.addEventListener('click', closeDashCrop);
    if (backdrop) backdrop.addEventListener('click', closeDashCrop);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const m = $('dashCropModal');
        if (m && !m.hidden) closeDashCrop();
      }
    });
  }

  function startApp() {
    initTabs();
    initImgFields();
    initDirectUploadInputs();
    initDashCropEvents();
    initPreviewExpansion();
    initDirectInteractivePans();

    // Ascolto modifiche campi form
    document.addEventListener('input', onBoundChange);
    document.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') onBoundChange(e);
    });

    // Pulsanti Aggiungi Vino ed Esperienza
    $('btnAddNewVino').addEventListener('click', addNewVino);
    $('btnAddNewExp').addEventListener('click', addNewExp);

    // Dropdown Pagine Sito
    const dropBtn = $('btnVisualEditMenu');
    const dropMenu = $('dashVisualMenu');
    if (dropBtn && dropMenu) {
      dropBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropMenu.hidden = !dropMenu.hidden;
      });
      document.addEventListener('click', () => { dropMenu.hidden = true; });
    }

    // Salva forzato Header
    $('btnSaveHeader').addEventListener('click', async () => {
      if (await saveDirty()) showToast('Tutte le modifiche sono state salvate', 'success');
    });

    // Backup JSON
    $('btnExportJson').addEventListener('click', exportJsonFiles);

    // Upload multiplo rullino
    $('agriUploadInput').addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (files.length) addFotoFiles(files);
    });

    // Scorciatoie da tastiera
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDirty();
      }
    });

    window.addEventListener('beforeunload', (e) => {
      if (dirty.size || saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    loadData();
  }

  // API esposta per compatibilità globale
  window.colbelDash = {
    addNewVino, duplicateVino, deleteVino,
    addNewExp, duplicateExp, deleteExp,
    updateStat, addStat, deleteStat,
    updateStep,
    saveDirty, loadData
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startApp);
  else startApp();
})();
