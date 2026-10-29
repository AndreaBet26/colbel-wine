/**
 * ColBel – Editor visuale "modifica direttamente sul sito"
 *
 * Si attiva aprendo il sito con ?modifica (http://localhost:8080/admin/ ci
 * porta direttamente). Viene caricato da content.js dopo il rendering.
 *
 *  - Clic su un testo con bordo tratteggiato → si scrive direttamente.
 *  - Passando sopra una foto compare "Cambia foto".
 *  - Passando sopra un vino / esperienza / foto / numero compare una barra
 *    con: sposta, nascondi, altri dettagli, elimina.
 *  - "+ Aggiungi" sotto le liste.
 *  - Barra in basso: stato salvataggio, Impostazioni (contatti, avvisi,
 *    social), Anteprima (il sito come lo vedono i visitatori).
 *
 * Ogni modifica è salvata automaticamente in data/*.json tramite server.py.
 */
(function () {
  'use strict';

  const C = window.ColBel;
  const data = window.COLBEL_DATA;
  if (!C || !data) return;

  const FILE_OF = {
    impostazioni: 'impostazioni', vini: 'vini', esperienze: 'esperienze', agriturismo: 'agriturismo',
    chiSiamo: 'chi-siamo', territorio: 'territorio', scrollytelling: 'scrollytelling', contatti: 'contatti'
  };
  const rootKey = (path) => String(path).split(/[.#]/)[0];
  const esc = C.esc;
  const $ = (sel, root) => (root || document).querySelector(sel);

  const LABELS = {
    titolo: 'Titolo', etichetta: 'Etichetta', descrizione: 'Descrizione', citazione: 'Citazione',
    introduzione: 'Introduzione', paragrafo_1: 'Primo paragrafo', paragrafo_2: 'Secondo paragrafo',
    claim: 'Frase sotto il logo', hero_sottotitolo: 'Testo di presentazione', testo_pulsante: 'Testo del pulsante',
    badge: 'Etichetta', testo: 'Testo', meta_testo: 'Nota finale', testo_footer: 'Testo del piè di pagina',
    vini_etichetta: 'Etichetta sezione', vini_titolo: 'Titolo sezione', vini_sottotitolo: 'Sottotitolo sezione',
    esperienze_etichetta: 'Etichetta sezione', esperienze_titolo: 'Titolo sezione', esperienze_intro: 'Introduzione sezione',
    sottotitolo: 'Sottotitolo', immagine: 'Foto', immagine_sfondo: 'Foto di sfondo', immagine_bottiglia: 'Bottiglia',
    nome: 'Nome', telefono: 'Telefono', ruolo: 'Ruolo', email: 'Email'
  };
  const labelFor = (el, path) => el.getAttribute('data-cb-label') || LABELS[String(path).split('.').pop()] || 'Testo';

  // Campi "nascosti" modificabili dal pannello Dettagli di ogni blocco
  const KINDS = {
    vino: {
      name: 'vino', move: true, hide: true, del: true,
      fields: [
        { k: 'nome_breve', label: 'Nome breve (pulsanti della vista "Palcoscenico")' },
        { k: 'descrizione_breve', label: 'Descrizione breve (vista "Palcoscenico")', type: 'textarea' },
        { k: 'nome_ordine', label: 'Nome del vino nel messaggio d\'ordine WhatsApp' }
      ]
    },
    esperienza: {
      name: 'esperienza', move: true, hide: true, del: true,
      fields: [
        { k: 'referente', label: 'Chi riceve le prenotazioni su WhatsApp', type: 'select', options: () => [['gianni', (data.contatti.gianni || {}).nome || 'Gianni'], ['lissa', (data.contatti.lissa || {}).nome || 'Lissa']] },
        { k: 'messaggio_whatsapp', label: 'Messaggio WhatsApp già scritto per il cliente' },
        { k: 'tags', label: 'Caratteristiche (una per riga)', type: 'lines' }
      ]
    },
    foto: { name: 'foto', move: true, del: true },
    stat: { name: 'numero', move: true, del: true },
    persona: {
      name: 'contatto',
      fields: [
        { k: 'telefono', label: 'Telefono (come appare sul sito)' },
        { k: 'wa_numero', label: 'Numero WhatsApp (solo cifre, con 39 davanti)' }
      ]
    },
    sede: {
      name: 'sede',
      fields: [
        { k: 'mappa_url', label: 'Link Google Maps' },
        { k: 'indirizzo_breve', label: 'Indirizzo breve (piè di pagina)' },
        { k: 'email', label: 'Email', path: 'contatti.azienda.email' }
      ]
    },
    ordine: {
      name: 'ordine',
      fields: [
        { k: 'nome', label: 'Vino ordinato dal pulsante' },
        { k: 'prezzo', label: 'Prezzo a bottiglia (€)', type: 'number' },
        { k: 'testo_pulsante', label: 'Testo del pulsante' }
      ]
    },
    banner: {
      name: 'barra avvisi', toggleBanner: true,
      fields: [{ k: 'link', label: 'Link "Dettagli" (es. #contatti, #esperienze)' }]
    }
  };

  // ---------------------------------------------------------------------------
  // Stato salvataggio
  // ---------------------------------------------------------------------------
  const dirty = new Set();
  let serverOnline = false;
  let saving = false;
  let saveTimer = null;
  let needsRender = false;
  let preview = false;

  function markDirty(path) {
    const key = rootKey(path);
    if (!FILE_OF[key]) return;
    dirty.add(key);
    if (!serverOnline) { setStatus('Server spento: non salvato', 'error'); return; }
    setStatus('Modifiche in corso…', 'pending');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDirty, 1000);
  }

  async function saveDirty() {
    clearTimeout(saveTimer);
    if (!serverOnline) { toast('Il server locale non è attivo: avvia "Avvia ColBel.command" per salvare.', 'error'); return false; }
    if (saving) { saveTimer = setTimeout(saveDirty, 400); return false; }
    if (!dirty.size) { setStatus('Tutto salvato', 'ok'); return true; }
    saving = true;
    setStatus('Salvataggio…', 'pending');
    const keys = Array.from(dirty);
    dirty.clear();
    try {
      for (const key of keys) {
        const res = await fetch('api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: FILE_OF[key], data: data[key] })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) throw new Error(j.error || ('errore ' + res.status));
      }
      setStatus('Salvato alle ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }), 'ok');
      return true;
    } catch (err) {
      keys.forEach((k) => dirty.add(k));
      setStatus('Errore di salvataggio', 'error');
      toast('Salvataggio non riuscito: ' + err.message, 'error');
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
      r.onerror = () => reject(new Error('lettura non riuscita'));
      r.readAsDataURL(file);
    });
    const res = await fetch('api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, data: dataUrl })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) throw new Error(j.error || ('errore ' + res.status));
    return j.path;
  }

  function rerender() {
    needsRender = false;
    C.render(data);
    decorate();
    if (window.ScrollTrigger) setTimeout(() => window.ScrollTrigger.refresh(), 50);
  }
  function renderWhenIdle() {
    needsRender = true;
    setTimeout(() => {
      const a = document.activeElement;
      if (needsRender && !(a && a.classList && a.classList.contains('cb-editable'))) rerender();
    }, 0);
  }

  // ---------------------------------------------------------------------------
  // Interfaccia: barra, etichetta, pulsanti flottanti, popover, pannello
  // ---------------------------------------------------------------------------
  const ui = document.createElement('div');
  ui.id = 'cbUI';
  ui.innerHTML = `
    <div id="cbBar" role="toolbar" aria-label="Modifica del sito">
      <span class="cb-bar-brand"><i class="fa-solid fa-pen-nib"></i> Modifica sito</span>
      <span class="cb-status" id="cbStatus" data-kind=""><span class="cb-dot"></span><span id="cbStatusText">Caricamento…</span></span>
      <button type="button" class="cb-btn" id="cbBtnSettings"><i class="fa-solid fa-sliders"></i><span>Contatti & avvisi</span></button>
      <button type="button" class="cb-btn" id="cbBtnPreview"><i class="fa-solid fa-eye"></i><span>Anteprima</span></button>
      <button type="button" class="cb-btn cb-btn-ghost" id="cbBtnHelp" title="Come funziona"><i class="fa-solid fa-circle-question"></i></button>
      <a class="cb-btn cb-btn-ghost" href="./" title="Esci dalla modifica"><i class="fa-solid fa-xmark"></i><span>Esci</span></a>
    </div>
    <div id="cbOffline" hidden>
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span><strong>Il server locale non è attivo:</strong> puoi provare le modifiche ma non verranno salvate. Avvia <code>Avvia ColBel.command</code> e ricarica questa pagina.</span>
    </div>
    <div id="cbLabel" hidden></div>
    <button type="button" id="cbImgBtn" hidden><i class="fa-solid fa-camera"></i> <span>Cambia foto</span></button>
    <div id="cbItemBar" hidden></div>
    <div id="cbPop" hidden></div>
    <aside id="cbPanel" aria-hidden="true">
      <div class="cb-panel-head">
        <h3>Contatti & avvisi</h3>
        <button type="button" class="cb-icon" id="cbPanelClose" aria-label="Chiudi">&times;</button>
      </div>
      <div class="cb-panel-body">
        <section>
          <h4>Barra avvisi in cima al sito</h4>
          <label class="cb-check"><input type="checkbox" data-bind="impostazioni.banner_annuncio.attivo"> Mostra la barra ai visitatori</label>
          <label>Messaggio<input type="text" data-bind="impostazioni.banner_annuncio.testo"></label>
          <label>Link "Dettagli" (es. #contatti)<input type="text" data-bind="impostazioni.banner_annuncio.link"></label>
        </section>
        <section>
          <h4>Gianni</h4>
          <label>Telefono<input type="text" data-bind="contatti.gianni.telefono"></label>
          <label>WhatsApp (solo cifre, con 39)<input type="text" data-bind="contatti.gianni.wa_numero"></label>
        </section>
        <section>
          <h4>Lissa</h4>
          <label>Telefono<input type="text" data-bind="contatti.lissa.telefono"></label>
          <label>WhatsApp (solo cifre, con 39)<input type="text" data-bind="contatti.lissa.wa_numero"></label>
        </section>
        <section>
          <h4>Cantina</h4>
          <label>Email<input type="email" data-bind="contatti.azienda.email"></label>
          <label>Link Google Maps<input type="text" data-bind="contatti.azienda.mappa_url"></label>
        </section>
        <section>
          <h4>Social (vuoto = icona nascosta)</h4>
          <label>Facebook<input type="text" data-bind="contatti.social.facebook"></label>
          <label>Instagram<input type="text" data-bind="contatti.social.instagram"></label>
        </section>
        <section class="cb-panel-foot">
          <a href="admin/elenco.html" class="cb-link"><i class="fa-solid fa-table-list"></i> Apri la vista a elenco (tutti i campi)</a>
        </section>
      </div>
    </aside>
    <div id="cbHelp" hidden>
      <h3>Come si modifica il sito</h3>
      <ul>
        <li><i class="fa-solid fa-i-cursor"></i> <strong>Testi:</strong> passa sopra un testo, compare un bordo tratteggiato: clicca e scrivi.</li>
        <li><i class="fa-solid fa-camera"></i> <strong>Foto:</strong> passa sopra una foto e clicca <em>Cambia foto</em>.</li>
        <li><i class="fa-solid fa-layer-group"></i> <strong>Vini, esperienze, foto, numeri:</strong> passandoci sopra compare una barra per spostarli, nasconderli, eliminarli o cambiare i dettagli.</li>
        <li><i class="fa-solid fa-plus"></i> <strong>Aggiungere:</strong> usa i pulsanti <em>+ Aggiungi</em> sotto ogni elenco.</li>
        <li><i class="fa-solid fa-floppy-disk"></i> <strong>Salvataggio automatico:</strong> lo stato è in basso. Nessun pulsante da premere.</li>
        <li><i class="fa-solid fa-eye"></i> <strong>Anteprima:</strong> mostra il sito esattamente come lo vedono i visitatori.</li>
      </ul>
      <button type="button" class="cb-btn cb-btn-gold" id="cbHelpOk">Ho capito</button>
    </div>
    <div id="cbToasts"></div>
    <input type="file" id="cbFile" accept="image/*" hidden>
    <input type="file" id="cbFileMulti" accept="image/*" multiple hidden>
  `;
  document.body.appendChild(ui);
  document.documentElement.classList.add('cb-editor-on');

  const statusEl = $('#cbStatus');
  function setStatus(text, kind) {
    $('#cbStatusText').textContent = text;
    statusEl.dataset.kind = kind || '';
  }

  let lastToast = 0;
  function toast(msg, kind) {
    const t = document.createElement('div');
    t.className = 'cb-toast ' + (kind || '');
    t.textContent = msg;
    $('#cbToasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, kind === 'error' ? 6000 : 2800);
  }

  // ---------------------------------------------------------------------------
  // Testi modificabili
  // ---------------------------------------------------------------------------
  const supportsPlain = (() => { const d = document.createElement('div'); d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only'; })();

  function decorate() {
    document.querySelectorAll('[data-cb]').forEach((el) => {
      if (el.closest('#cbUI')) return;
      el.classList.add('cb-editable');
      if (el.closest('button')) {
        el.classList.add('cb-editable-pop');
        el.removeAttribute('contenteditable');
        return;
      }
      el.setAttribute('contenteditable', preview ? 'false' : (supportsPlain ? 'plaintext-only' : 'true'));
      el.setAttribute('spellcheck', 'true');
      if (!el.hasAttribute('data-cb-placeholder')) el.setAttribute('data-cb-placeholder', labelFor(el, el.getAttribute('data-cb')) + '…');
    });

    // elementi nascosti ai visitatori
    document.querySelectorAll('.cb-is-hidden').forEach((el) => {
      if (!el.querySelector(':scope > .cb-hidden-badge')) {
        const b = document.createElement('div');
        b.className = 'cb-hidden-badge';
        b.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Nascosto ai visitatori';
        el.prepend(b);
      }
    });

    addButton('cbAddVino', '#winesRunwayView', 'afterend', '<i class="fa-solid fa-plus"></i> Aggiungi un vino', () => addItem('vino'));
    addButton('cbAddExp', '#expViewport', 'afterend', '<i class="fa-solid fa-plus"></i> Aggiungi un\'esperienza', () => addItem('esperienza'));
    addButton('cbAddFoto', '#galleryViewport', 'afterend', '<i class="fa-solid fa-camera"></i> Aggiungi foto al rullino', () => $('#cbFileMulti').click());
    addButton('cbAddStat', '#csStats', 'beforeend', '<i class="fa-solid fa-plus"></i> Numero', () => addItem('stat'), 'cb-add-inline');
  }

  function addButton(id, targetSel, where, html, onClick, extraCls) {
    const target = $(targetSel);
    if (!target || document.getElementById(id)) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.id = id;
    b.className = 'cb-add ' + (extraCls || '');
    b.innerHTML = html;
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick(); });
    target.insertAdjacentElement(where, b);
  }

  function parsePrice(text) {
    const clean = String(text).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const v = parseFloat(clean);
    return isNaN(v) ? null : Math.round(v * 100) / 100;
  }

  function readEditable(el) {
    const path = el.getAttribute('data-cb');
    const type = el.getAttribute('data-cb-type');
    let value = el.textContent.replace(/ /g, ' ');
    if (type === 'price' || type === 'price-short') {
      value = parsePrice(value);
      if (value == null) return;
    } else {
      value = value.replace(/\s*\n\s*/g, ' ');
    }
    if (C.get(data, path) === value) return;
    C.set(data, path, value);
    // aggiorna subito le altre copie dello stesso testo (es. piè di pagina)
    document.querySelectorAll('[data-cb]').forEach((o) => {
      if (o !== el && o.getAttribute('data-cb') === path && o !== document.activeElement) o.textContent = el.textContent;
    });
    markDirty(path);
    needsRender = true;
  }

  document.addEventListener('input', (e) => {
    const el = e.target.closest && e.target.closest('.cb-editable');
    if (el && !preview) readEditable(el);
  });

  document.addEventListener('keydown', (e) => {
    const el = e.target.closest && e.target.closest('.cb-editable');
    if (el && (e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); el.blur(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveDirty().then((ok) => ok && toast('Tutto salvato', 'ok')); }
    if (e.key === 'Escape') { closePop(); closePanel(); }
  });

  document.addEventListener('focusin', (e) => {
    const el = e.target.closest && e.target.closest('.cb-editable');
    if (!el || preview) return;
    showLabel(el);
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target.closest && e.target.closest('.cb-editable');
    if (!el) return;
    hideLabel();
    // riformatta i prezzi
    const t = el.getAttribute('data-cb-type');
    if (t === 'price' || t === 'price-short') {
      const v = C.get(data, el.getAttribute('data-cb'));
      el.textContent = t === 'price' ? v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : (Number.isInteger(v) ? String(v) : v.toLocaleString('it-IT', { minimumFractionDigits: 2 }));
    }
    if (needsRender) renderWhenIdle();
  });

  const labelEl = $('#cbLabel');
  function showLabel(el) {
    labelEl.textContent = labelFor(el, el.getAttribute('data-cb'));
    labelEl.hidden = false;
    const r = el.getBoundingClientRect();
    labelEl.style.left = Math.max(8, r.left) + 'px';
    labelEl.style.top = Math.max(8, r.top - 30) + 'px';
  }
  function hideLabel() { labelEl.hidden = true; }

  // Il trascinamento degli slider non deve partire mentre si seleziona del testo
  document.addEventListener('mousedown', (e) => {
    if (preview) return;
    if (e.target.closest && e.target.closest('.cb-editable') && e.target.closest('#galleryViewport, #expViewport')) e.stopPropagation();
  }, true);

  // ---------------------------------------------------------------------------
  // Link e pulsanti del sito: in modifica non devono portare altrove
  // ---------------------------------------------------------------------------
  window.addEventListener('click', (e) => {
    if (preview || !e.target.closest) return;
    if (e.target.closest('#cbUI, .cb-add')) return;

    const popEditable = e.target.closest('.cb-editable-pop');
    if (popEditable) {
      e.preventDefault(); e.stopImmediatePropagation();
      openTextPop(popEditable);
      return;
    }

    const el = e.target.closest('a, button');
    if (!el) return;
    if (e.target.closest('.cb-editable')) { e.preventDefault(); return; }
    if (el.closest('.site-header, .menu-overlay, .wine-index, .story-progress')) return;
    const href = el.getAttribute('href') || '';
    if (el.tagName === 'A' && href.startsWith('#')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (Date.now() - lastToast > 2500) {
      lastToast = Date.now();
      toast('In modifica i pulsanti sono disattivati: usa "Anteprima" per provarli.');
    }
  }, true);

  // ---------------------------------------------------------------------------
  // Pulsanti flottanti: foto e barra del blocco
  // ---------------------------------------------------------------------------
  const imgBtn = $('#cbImgBtn');
  const itemBar = $('#cbItemBar');
  let pointer = { x: -1, y: -1 };
  let currentImg = null;
  let currentItem = null;
  let rafPending = false;
  let barLocked = false; // mentre il popover è aperto

  function smallestContaining(selector, x, y) {
    let best = null;
    let bestArea = Infinity;
    document.querySelectorAll(selector).forEach((el) => {
      if (el.closest('#cbUI')) return;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 20) return;
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        const area = r.width * r.height;
        if (area < bestArea) { best = el; bestArea = area; }
      }
    });
    return best;
  }

  function headerBottom() {
    const h = document.querySelector('.site-header');
    return h ? Math.max(0, h.getBoundingClientRect().bottom) : 0;
  }

  function updateFloating() {
    rafPending = false;
    if (preview || barLocked) return;
    const { x, y } = pointer;
    const top0 = headerBottom() + 8;

    const img = smallestContaining('[data-cb-src], [data-cb-bg]', x, y);
    currentImg = img;
    if (img) {
      const r = img.getBoundingClientRect();
      imgBtn.hidden = false;
      imgBtn.style.left = Math.max(8, r.left + 12) + 'px';
      imgBtn.style.top = Math.min(window.innerHeight - 60, Math.max(top0, r.top + 12)) + 'px';
      imgBtn.querySelector('span').textContent = 'Cambia ' + (img.getAttribute('data-cb-label') || 'foto').toLowerCase();
    } else imgBtn.hidden = true;

    const item = smallestContaining('[data-cb-item]', x, y);
    if (item !== currentItem) {
      currentItem = item;
      if (item) buildItemBar(item);
    }
    if (item) {
      const r = item.getBoundingClientRect();
      itemBar.hidden = false;
      const w = itemBar.getBoundingClientRect().width;
      itemBar.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w - 12)) + 'px';
      let top = Math.min(window.innerHeight - 60, Math.max(top0, r.top + 12));
      // evita di coprire il pulsante foto se sono allineati
      if (!imgBtn.hidden && Math.abs(parseFloat(imgBtn.style.top) - top) < 40 && parseFloat(imgBtn.style.left) + imgBtn.offsetWidth > parseFloat(itemBar.style.left)) top += 46;
      itemBar.style.top = top + 'px';
    } else itemBar.hidden = true;
  }

  function scheduleFloating() {
    if (!rafPending) { rafPending = true; requestAnimationFrame(updateFloating); }
  }
  document.addEventListener('mousemove', (e) => { pointer = { x: e.clientX, y: e.clientY }; scheduleFloating(); }, { passive: true });
  window.addEventListener('scroll', scheduleFloating, { passive: true });
  document.addEventListener('mouseleave', () => { imgBtn.hidden = true; if (!barLocked) itemBar.hidden = true; });

  // Cambio foto
  let imgTargetPath = null;
  imgBtn.addEventListener('click', () => {
    if (!currentImg) return;
    imgTargetPath = currentImg.getAttribute('data-cb-src') || currentImg.getAttribute('data-cb-bg');
    $('#cbFile').click();
  });
  $('#cbFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !imgTargetPath) return;
    try {
      toast('Caricamento foto…');
      const path = await uploadImage(file);
      C.set(data, imgTargetPath, path);
      markDirty(imgTargetPath);
      rerender();
      toast('Foto cambiata', 'ok');
    } catch (err) {
      toast('Foto non caricata: ' + err.message, 'error');
    }
  });

  // Barra del blocco (sposta / nascondi / dettagli / elimina)
  function itemInfo(item) {
    const path = item.getAttribute('data-cb-item');
    const kind = KINDS[item.getAttribute('data-cb-kind')] || {};
    return { path, kind, kindKey: item.getAttribute('data-cb-kind'), obj: C.get(data, path) };
  }

  function buildItemBar(item) {
    const { kind, obj, kindKey } = itemInfo(item);
    const btns = [];
    btns.push(`<span class="cb-ib-name">${esc(kind.name || 'blocco')}</span>`);
    if (kind.move) {
      btns.push(`<button type="button" data-act="up" title="Sposta prima"><i class="fa-solid fa-arrow-${kindKey === 'stat' || kindKey === 'foto' ? 'left' : 'up'}"></i></button>`);
      btns.push(`<button type="button" data-act="down" title="Sposta dopo"><i class="fa-solid fa-arrow-${kindKey === 'stat' || kindKey === 'foto' ? 'right' : 'down'}"></i></button>`);
    }
    if (kind.hide && obj) {
      const hidden = obj.attivo === false;
      btns.push(`<button type="button" data-act="hide" title="${hidden ? 'Mostra ai visitatori' : 'Nascondi ai visitatori'}"><i class="fa-solid fa-eye${hidden ? '' : '-slash'}"></i><span>${hidden ? 'Mostra' : 'Nascondi'}</span></button>`);
    }
    if (kind.toggleBanner && obj) {
      btns.push(`<button type="button" data-act="banner" title="Mostra o nascondi la barra"><i class="fa-solid fa-eye${obj.attivo ? '-slash' : ''}"></i><span>${obj.attivo ? 'Nascondi barra' : 'Mostra barra'}</span></button>`);
    }
    if (kind.fields) btns.push(`<button type="button" data-act="details" title="Altri dettagli"><i class="fa-solid fa-sliders"></i><span>Dettagli</span></button>`);
    if (kind.del) btns.push(`<button type="button" data-act="delete" class="cb-danger" title="Elimina"><i class="fa-solid fa-trash"></i></button>`);
    itemBar.innerHTML = btns.join('');
  }

  itemBar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b || !currentItem) return;
    const item = currentItem;
    const { path, kind, obj } = itemInfo(item);
    const act = b.getAttribute('data-act');
    if (act === 'up' || act === 'down') moveItem(path, act === 'up' ? -1 : 1);
    else if (act === 'hide') { obj.attivo = obj.attivo === false; markDirty(path); rerender(); toast(obj.attivo ? 'Ora è visibile ai visitatori' : 'Nascosto: i visitatori non lo vedono più', 'ok'); }
    else if (act === 'banner') { obj.attivo = !obj.attivo; markDirty(path); rerender(); syncPanel(); }
    else if (act === 'delete') deleteItem(path, kind);
    else if (act === 'details') openDetails(item, path, kind);
    currentItem = null;
    scheduleFloating();
  });

  function listOf(path) {
    // percorso del blocco → array che lo contiene + indice
    const segs = path.split('.');
    const last = segs.pop();
    const parentPath = segs.join('.');
    const container = parentPath ? C.get(data, parentPath) : data;
    if (last.includes('#')) {
      const [name, id] = last.split('#');
      const list = container[name];
      return { list, index: list.findIndex((x) => String(x.id) === id) };
    }
    return { list: container, index: parseInt(last, 10) };
  }

  function moveItem(path, dir) {
    const { list, index } = listOf(path);
    if (!Array.isArray(list) || index < 0) return;
    const ordered = list[0] && 'ordine' in list[0];
    if (ordered) list.sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
    const idx = ordered ? list.indexOf(C.get(data, path)) : index;
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j], list[idx]];
    if (ordered) list.forEach((x, i) => { x.ordine = i + 1; });
    markDirty(path);
    rerender();
  }

  function deleteItem(path, kind) {
    const obj = C.get(data, path) || {};
    const name = obj.nome || obj.titolo || obj.didascalia || obj.valore || '';
    if (!confirm(`Eliminare ${kind.name || 'questo blocco'}${name ? ' "' + name + '"' : ''}?` +
      (kind.hide ? '\n\nSe vuoi toglierlo solo per un periodo usa "Nascondi".' : ''))) return;
    const { list, index } = listOf(path);
    list.splice(index, 1);
    if (list[0] && 'ordine' in list[0]) {
      list.sort((a, b) => (a.ordine || 0) - (b.ordine || 0)).forEach((x, i) => { x.ordine = i + 1; });
    }
    markDirty(path);
    rerender();
    toast('Eliminato', 'ok');
  }

  // ---------------------------------------------------------------------------
  // Aggiunta elementi
  // ---------------------------------------------------------------------------
  const uid = (p) => p + '-' + Date.now().toString(36);
  const nextOrder = (list) => list.reduce((m, x) => Math.max(m, x.ordine || 0), 0) + 1;
  const pad2 = (n) => String(n).padStart(2, '0');

  function addItem(kind) {
    let focusPath = null;
    if (kind === 'vino') {
      const id = uid('vino');
      const n = nextOrder(data.vini);
      data.vini.push({
        id, nome: 'Nuovo vino', nome_breve: 'Nuovo vino', nome_ordine: 'Nuovo vino',
        tipo: 'Tipologia (es. Vino Spumante Brut)', denominazione: 'Denominazione',
        tag: pad2(n) + ' / Nuova etichetta', descrizione: 'Scrivi qui la descrizione del vino.', descrizione_breve: '',
        prezzo: 10, note_prezzo: 'IVA incl. (min. 6 bott.)', immagine: 'assets/images/ColBel_Giusto_transparent.png',
        categoria: 'docg', ordine: n, attivo: true
      });
      focusPath = `vini#${id}.nome`;
      markDirty('vini');
    } else if (kind === 'esperienza') {
      const id = uid('exp');
      const n = nextOrder(data.esperienze);
      data.esperienze.push({
        id, badge: pad2(n) + ' / Nuova esperienza', titolo: 'Nuova esperienza', prezzo: 20, unita_prezzo: '/ persona',
        descrizione: 'Descrivi qui l\'esperienza.', tags: [{ icona: 'fa-solid fa-wine-glass', testo: 'Caratteristica' }],
        immagine: 'assets/images/p9201773.jpg', referente: 'gianni', referente_nome: 'Gianni',
        referente_wa: (data.contatti.gianni || {}).wa_numero || '', testo_pulsante: 'Prenota con Gianni',
        messaggio_whatsapp: 'Buongiorno, vorrei prenotare la Nuova esperienza', ordine: n, attivo: true
      });
      focusPath = `esperienze#${id}.titolo`;
      markDirty('esperienze');
    } else if (kind === 'stat') {
      const list = data.chiSiamo.statistiche || (data.chiSiamo.statistiche = []);
      list.push({ valore: '0', etichetta: 'Descrizione' });
      focusPath = `chiSiamo.statistiche.${list.length - 1}.valore`;
      markDirty('chiSiamo');
    }
    rerender();
    if (focusPath) {
      const el = Array.from(document.querySelectorAll('[data-cb]')).find((x) => x.getAttribute('data-cb') === focusPath);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          el.focus();
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(el);
          sel.removeAllRanges(); sel.addRange(range);
        }, 450);
      }
      toast('Aggiunto: scrivi direttamente sui testi per completarlo', 'ok');
    }
  }

  $('#cbFileMulti').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const gal = data.agriturismo.galleria || (data.agriturismo.galleria = []);
    let added = 0;
    for (const f of files) {
      try {
        toast('Caricamento ' + f.name + '…');
        const path = await uploadImage(f);
        gal.push({ id: uid('foto'), immagine: path, didascalia: 'Scrivi una didascalia', ordine: nextOrder(gal) });
        added++;
      } catch (err) {
        toast(f.name + ': ' + err.message, 'error');
      }
    }
    if (added) {
      markDirty('agriturismo');
      rerender();
      const vp = $('#galleryViewport');
      if (vp) { vp.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => vp.scrollTo({ left: vp.scrollWidth, behavior: 'smooth' }), 400); }
      toast(added === 1 ? 'Foto aggiunta: clicca sulla didascalia per scriverla' : added + ' foto aggiunte', 'ok');
    }
  });

  // ---------------------------------------------------------------------------
  // Popover: dettagli del blocco e testi dentro i pulsanti
  // ---------------------------------------------------------------------------
  const pop = $('#cbPop');

  function placePop(anchorRect) {
    pop.hidden = false;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    let left = Math.min(window.innerWidth - w - 12, Math.max(12, anchorRect.right - w));
    let top = anchorRect.bottom + 8;
    if (top + h > window.innerHeight - 80) top = Math.max(12, anchorRect.top - h - 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function closePop() { pop.hidden = true; pop.innerHTML = ''; barLocked = false; }

  function fieldHtml(f, value) {
    const id = 'cbf_' + f.k;
    if (f.type === 'textarea') return `<label for="${id}">${esc(f.label)}</label><textarea id="${id}" data-k="${f.k}" rows="3">${esc(value || '')}</textarea>`;
    if (f.type === 'lines') return `<label for="${id}">${esc(f.label)}</label><textarea id="${id}" data-k="${f.k}" rows="4">${esc((value || []).map((t) => t.testo).join('\n'))}</textarea>`;
    if (f.type === 'select') return `<label for="${id}">${esc(f.label)}</label><select id="${id}" data-k="${f.k}">${f.options().map(([v, l]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    if (f.type === 'number') return `<label for="${id}">${esc(f.label)}</label><input id="${id}" type="number" step="0.10" data-k="${f.k}" value="${esc(value)}">`;
    return `<label for="${id}">${esc(f.label)}</label><input id="${id}" type="text" data-k="${f.k}" value="${esc(value || '')}">`;
  }

  function openDetails(item, path, kind) {
    const obj = C.get(data, path);
    if (!obj || !kind.fields) return;
    barLocked = true;
    itemBar.hidden = true;
    pop.innerHTML = `
      <div class="cb-pop-head">Dettagli ${esc(kind.name)}</div>
      <div class="cb-pop-body">${kind.fields.map((f) => fieldHtml(f, f.path ? C.get(data, f.path) : obj[f.k])).join('')}</div>
      <div class="cb-pop-foot">
        <button type="button" class="cb-btn cb-btn-ghost" data-pop="cancel">Annulla</button>
        <button type="button" class="cb-btn cb-btn-gold" data-pop="ok">Applica</button>
      </div>`;
    const r = item.getBoundingClientRect();
    const top = Math.max(r.top, headerBottom() + 8);
    placePop({ left: r.left, right: Math.min(r.right - 12, window.innerWidth - 12), top, bottom: top + 44 });
    const first = pop.querySelector('input, textarea, select');
    if (first) first.focus();

    pop.onclick = (e) => {
      const a = e.target.closest('[data-pop]');
      if (!a) return;
      if (a.getAttribute('data-pop') === 'ok') {
        kind.fields.forEach((f) => {
          const input = pop.querySelector(`[data-k="${f.k}"]`);
          if (!input) return;
          let v = input.value.trim();
          if (f.type === 'number') v = parsePrice(v) || 0;
          if (f.type === 'lines') {
            const icons = {};
            (obj[f.k] || []).forEach((t) => { icons[t.testo] = t.icona; });
            v = v.split('\n').map((s) => s.trim()).filter(Boolean).map((testo) => ({ icona: icons[testo] || 'fa-solid fa-check', testo }));
          }
          if (f.path) C.set(data, f.path, v); else obj[f.k] = v;
        });
        // coerenza dei dati derivati
        if (obj.referente && data.contatti[obj.referente]) {
          const c = data.contatti[obj.referente];
          obj.referente_nome = (c.nome || obj.referente).split(' ')[0];
          obj.referente_wa = c.wa_numero || obj.referente_wa;
        }
        markDirty(path);
        kind.fields.forEach((f) => f.path && markDirty(f.path));
        rerender();
        toast('Dettagli aggiornati', 'ok');
      }
      closePop();
    };
  }

  function openTextPop(el) {
    const path = el.getAttribute('data-cb');
    barLocked = true;
    itemBar.hidden = true;
    pop.innerHTML = `
      <div class="cb-pop-head">${esc(labelFor(el, path))}</div>
      <div class="cb-pop-body"><input type="text" id="cbPopText" value="${esc(C.get(data, path) || '')}"></div>
      <div class="cb-pop-foot">
        <button type="button" class="cb-btn cb-btn-ghost" data-pop="cancel">Annulla</button>
        <button type="button" class="cb-btn cb-btn-gold" data-pop="ok">Applica</button>
      </div>`;
    placePop(el.getBoundingClientRect());
    const input = $('#cbPopText');
    input.focus(); input.select();
    const apply = () => { C.set(data, path, input.value.trim()); markDirty(path); rerender(); };
    input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); closePop(); } };
    pop.onclick = (e) => {
      const a = e.target.closest('[data-pop]');
      if (!a) return;
      if (a.getAttribute('data-pop') === 'ok') apply();
      closePop();
    };
  }

  document.addEventListener('mousedown', (e) => {
    if (!pop.hidden && !e.target.closest('#cbPop')) closePop();
  });

  // ---------------------------------------------------------------------------
  // Pannello "Contatti & avvisi"
  // ---------------------------------------------------------------------------
  const panel = $('#cbPanel');
  function syncPanel() {
    panel.querySelectorAll('[data-bind]').forEach((inp) => {
      const v = C.get(data, inp.getAttribute('data-bind'));
      if (inp.type === 'checkbox') inp.checked = !!v; else if (inp !== document.activeElement) inp.value = v == null ? '' : v;
    });
  }
  function openPanel() { syncPanel(); panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); }
  function closePanel() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); }
  $('#cbBtnSettings').addEventListener('click', () => (panel.classList.contains('open') ? closePanel() : openPanel()));
  $('#cbPanelClose').addEventListener('click', closePanel);
  let panelTimer = null;
  panel.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-bind]');
    if (!inp) return;
    const path = inp.getAttribute('data-bind');
    C.set(data, path, inp.type === 'checkbox' ? inp.checked : inp.value);
    markDirty(path);
    clearTimeout(panelTimer);
    panelTimer = setTimeout(rerender, 350);
  });
  panel.addEventListener('change', (e) => { if (e.target.type === 'checkbox') e.target.dispatchEvent(new Event('input', { bubbles: true })); });

  // ---------------------------------------------------------------------------
  // Anteprima, aiuto, avvio
  // ---------------------------------------------------------------------------
  function setPreview(on) {
    preview = on;
    document.documentElement.classList.toggle('cb-preview', on);
    const btn = $('#cbBtnPreview');
    btn.innerHTML = on ? '<i class="fa-solid fa-pen"></i><span>Torna a modificare</span>' : '<i class="fa-solid fa-eye"></i><span>Anteprima</span>';
    btn.classList.toggle('cb-btn-gold', on);
    imgBtn.hidden = true; itemBar.hidden = true; closePop(); closePanel();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    rerender();
    if (on) toast('Anteprima: così vedono il sito i visitatori');
  }
  $('#cbBtnPreview').addEventListener('click', () => setPreview(!preview));

  const help = $('#cbHelp');
  const showHelp = () => { help.hidden = false; };
  $('#cbBtnHelp').addEventListener('click', showHelp);
  $('#cbHelpOk').addEventListener('click', () => {
    help.hidden = true;
    try { localStorage.setItem('colbel_editor_help', '1'); } catch (e) {}
  });

  window.addEventListener('beforeunload', (e) => {
    if (dirty.size || saving) { e.preventDefault(); e.returnValue = ''; }
  });

  // Il palcoscenico viene usato solo per i visitatori: in modifica si lavora sulla sfilata
  const runway = document.getElementById('winesRunwayView');
  if (runway) runway.style.display = '';
  if (window.gsap) {
    document.querySelectorAll('.wine-bottle img, .wine-info > *, .exp-scene .col > *, .caption-row').forEach((el) => {
      window.gsap.set(el, { clearProps: 'all' });
    });
  }

  (async function init() {
    try {
      const res = await fetch('api/ping', { cache: 'no-store' });
      serverOnline = res.ok && (await res.json()).ok;
    } catch (e) { serverOnline = false; }
    $('#cbOffline').hidden = serverOnline;
    setStatus(serverOnline ? 'Tutto salvato' : 'Server spento', serverOnline ? 'ok' : 'error');
    decorate();
    let seen = false;
    try { seen = localStorage.getItem('colbel_editor_help') === '1'; } catch (e) {}
    if (!seen) showHelp();
  })();

  window.ColBelEditor = { save: saveDirty, rerender, setPreview };
})();
