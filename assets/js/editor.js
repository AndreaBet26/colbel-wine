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
    if (!serverOnline) { toast('Il server locale non è attivo: avvia "Avvia ColBel.bat" (Windows) o "Avvia ColBel.command" (Mac) per salvare.', 'error'); return false; }
    if (saving) { saveTimer = setTimeout(saveDirty, 400); return false; }
    if (!dirty.size) { setStatus('Tutto salvato', 'ok'); return true; }
    saving = true;
    setStatus('Salvataggio…', 'pending');
    const keys = Array.from(dirty);
    dirty.clear();
    try {
      for (const key of keys) {
        const res = await fetch('/api/save', {
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
    const res = await fetch('/api/upload', {
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
      <div class="cb-page-switcher" id="cbPageSwitcher">
        <button type="button" class="cb-page-current" id="cbPageCurrent" aria-expanded="false" title="Cambia pagina">
          <i class="fa-solid fa-file-lines"></i>
          <span id="cbPageLabel">Home</span>
          <i class="fa-solid fa-chevron-down cb-chevron"></i>
        </button>
        <div class="cb-page-menu" id="cbPageMenu" hidden>
          <a href="index.html?modifica" class="cb-page-link" data-page="index"><i class="fa-solid fa-house"></i> <span>Home</span></a>
          <a href="storia.html?modifica" class="cb-page-link" data-page="storia"><i class="fa-solid fa-book-open"></i> <span>Chi siamo & Storia</span></a>
          <a href="vini.html?modifica" class="cb-page-link" data-page="vini"><i class="fa-solid fa-wine-bottle"></i> <span>Prodotti & Vini</span></a>
          <a href="esperienze.html?modifica" class="cb-page-link" data-page="esperienze"><i class="fa-solid fa-wine-glass"></i> <span>Esperienze & Degustazioni</span></a>
          <a href="agriturismo.html?modifica" class="cb-page-link" data-page="agriturismo"><i class="fa-solid fa-utensils"></i> <span>Agriturismo & Cucina</span></a>
          <a href="contatti.html?modifica" class="cb-page-link" data-page="contatti"><i class="fa-solid fa-envelope"></i> <span>Contatti</span></a>
        </div>
      </div>
      <span class="cb-status" id="cbStatus" data-kind=""><span class="cb-dot"></span><span id="cbStatusText">Caricamento…</span></span>
      <button type="button" class="cb-btn" id="cbBtnSettings"><i class="fa-solid fa-sliders"></i><span>Contatti & avvisi</span></button>
      <button type="button" class="cb-btn" id="cbBtnPreview"><i class="fa-solid fa-eye"></i><span>Anteprima</span></button>
      <button type="button" class="cb-btn cb-btn-ghost" id="cbBtnHelp" title="Come funziona"><i class="fa-solid fa-circle-question"></i></button>
      <a class="cb-btn cb-btn-ghost" id="cbBtnExit" href="./" title="Esci dalla modifica"><i class="fa-solid fa-xmark"></i><span>Esci</span></a>
    </div>
    <div id="cbOffline" hidden>
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span><strong>Il server locale non è attivo:</strong> puoi provare le modifiche ma non verranno salvate. Avvia <code>Avvia ColBel.bat</code> (Windows) o <code>Avvia ColBel.command</code> (Mac) e ricarica questa pagina.</span>
    </div>
    <div id="cbLabel" hidden></div>
    <div id="cbImgBar" hidden>
      <button type="button" id="cbImgBtn" class="cb-img-action"><i class="fa-solid fa-camera"></i> <span>Cambia foto</span></button>
      <button type="button" id="cbCropBtn" class="cb-img-action" title="Regola inquadratura e centratura"><i class="fa-solid fa-arrows-up-down-left-right"></i> <span>Centra foto</span></button>
    </div>
    <div id="cbItemBar" hidden></div>
    <div id="cbPop" hidden></div>
    <div id="cbCropHud" hidden>
      <div class="cb-hud-meta">
        <span class="cb-hud-badge"><i class="fa-solid fa-arrows-up-down-left-right"></i> Inquadratura</span>
        <span id="cbHudTitle" class="cb-hud-name">Foto</span>
        <span id="cbHudDimensions" class="cb-hud-dim">Scala reale</span>
      </div>
      <div class="cb-hud-controls">
        <div class="cb-hud-drag-hint">
          <i class="fa-solid fa-hand"></i> <span>Trascina con il mouse per spostare</span>
        </div>
        <div class="cb-hud-arrows" title="Regolazione fine a passi">
          <button type="button" class="cb-nudge-btn" data-dx="-2" data-dy="0" title="Sposta foto a sinistra"><i class="fa-solid fa-arrow-left"></i></button>
          <button type="button" class="cb-nudge-btn" data-dx="0" data-dy="-2" title="Sposta foto in alto"><i class="fa-solid fa-arrow-up"></i></button>
          <button type="button" class="cb-nudge-btn" data-dx="0" data-dy="2" title="Sposta foto in basso"><i class="fa-solid fa-arrow-down"></i></button>
          <button type="button" class="cb-nudge-btn" data-dx="2" data-dy="0" title="Sposta foto a destra"><i class="fa-solid fa-arrow-right"></i></button>
        </div>
        <div class="cb-hud-zoom">
          <span class="cb-zoom-lbl"><i class="fa-solid fa-magnifying-glass-plus"></i> Zoom</span>
          <button type="button" class="cb-zoom-step" id="cbZoomMinus" title="Rimpicciolisci"><i class="fa-solid fa-minus"></i></button>
          <input type="range" id="cbCropZoomRange" min="100" max="250" value="100" step="1">
          <button type="button" class="cb-zoom-step" id="cbZoomPlus" title="Ingrandisci"><i class="fa-solid fa-plus"></i></button>
          <span id="cbCropZoomVal" class="cb-zoom-val">100%</span>
        </div>
        <div class="cb-hud-presets">
          <button type="button" class="cb-hud-preset-btn active" data-x="50" data-y="50" title="Al centro"><i class="fa-solid fa-bullseye"></i></button>
          <button type="button" class="cb-hud-preset-btn" data-x="50" data-y="15" title="In alto"><i class="fa-solid fa-arrow-up"></i></button>
          <button type="button" class="cb-hud-preset-btn" data-x="50" data-y="85" title="In basso"><i class="fa-solid fa-arrow-down"></i></button>
          <button type="button" class="cb-hud-preset-btn" data-x="15" data-y="50" title="A sinistra"><i class="fa-solid fa-arrow-left"></i></button>
          <button type="button" class="cb-hud-preset-btn" data-x="85" data-y="50" title="A destra"><i class="fa-solid fa-arrow-right"></i></button>
        </div>
      </div>
      <div class="cb-hud-actions">
        <button type="button" class="cb-btn cb-btn-ghost" id="cbCropModalToggle" title="Vista lente di precisione"><i class="fa-solid fa-crop-simple"></i> <span>Lente</span></button>
        <button type="button" class="cb-btn cb-btn-ghost" id="cbHudCancel"><i class="fa-solid fa-xmark"></i> <span>Annulla</span></button>
        <button type="button" class="cb-btn cb-btn-gold" id="cbHudSave"><i class="fa-solid fa-check"></i> <span>Salva</span></button>
      </div>
    </div>
    <div id="cbCropModal" class="cb-modal" hidden>
      <div class="cb-modal-backdrop" id="cbCropBackdrop"></div>
      <div class="cb-modal-box">
        <div class="cb-modal-head">
          <h3><i class="fa-solid fa-arrows-up-down-left-right"></i> Inquadratura proporzionale reale</h3>
          <button type="button" class="cb-icon cb-modal-close" id="cbCropClose" aria-label="Chiudi">&times;</button>
        </div>
        <div class="cb-modal-body">
          <p class="cb-crop-intro">Trascina direttamente la foto per posizionarla, usa lo slider zoom o le posizioni rapide.</p>
          <div class="cb-crop-preview-wrap">
            <div class="cb-crop-preview" id="cbCropPreview">
              <img id="cbCropImg" src="" alt="Anteprima" draggable="false" />
              <div class="cb-crop-reticle" id="cbCropReticle">
                <span class="cb-reticle-circle"></span>
                <span class="cb-reticle-cross-h"></span>
                <span class="cb-reticle-cross-v"></span>
              </div>
            </div>
          </div>
          <div class="cb-crop-presets">
            <span class="cb-crop-label">Posizioni rapide:</span>
            <div class="cb-preset-grid">
              <button type="button" class="cb-preset-btn" data-x="50" data-y="15"><i class="fa-solid fa-arrow-up"></i> In alto</button>
              <button type="button" class="cb-preset-btn active" data-x="50" data-y="50"><i class="fa-solid fa-bullseye"></i> Al centro</button>
              <button type="button" class="cb-preset-btn" data-x="50" data-y="85"><i class="fa-solid fa-arrow-down"></i> In basso</button>
              <button type="button" class="cb-preset-btn" data-x="15" data-y="50"><i class="fa-solid fa-arrow-left"></i> A sinistra</button>
              <button type="button" class="cb-preset-btn" data-x="85" data-y="50"><i class="fa-solid fa-arrow-right"></i> A destra</button>
              <button type="button" class="cb-preset-btn" data-x="50" data-y="30"><i class="fa-solid fa-user"></i> Ritratto (30%)</button>
            </div>
          </div>
          <div class="cb-crop-sliders">
            <div class="cb-slider-row">
              <label for="cbCropRangeZoom">Zoom / Scala: <strong id="cbCropModalZoomVal">100%</strong></label>
              <input type="range" id="cbCropRangeZoom" min="100" max="250" value="100" step="1">
            </div>
            <div class="cb-slider-row">
              <label for="cbCropRangeX">Orizzontale (X): <strong id="cbCropValX">50%</strong></label>
              <input type="range" id="cbCropRangeX" min="0" max="100" value="50" step="1">
            </div>
            <div class="cb-slider-row">
              <label for="cbCropRangeY">Verticale (Y): <strong id="cbCropValY">50%</strong></label>
              <input type="range" id="cbCropRangeY" min="0" max="100" value="50" step="1">
            </div>
          </div>
        </div>
        <div class="cb-modal-foot">
          <button type="button" class="cb-btn cb-btn-ghost" id="cbCropCancel">Annulla</button>
          <button type="button" class="cb-btn cb-btn-gold" id="cbCropSave"><i class="fa-solid fa-check"></i> Salva inquadratura</button>
        </div>
      </div>
    </div>
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
  // Pulsanti flottanti: foto (cambia + centra) e barra del blocco
  // ---------------------------------------------------------------------------
  const imgBar = $('#cbImgBar');
  const imgBtn = $('#cbImgBtn');
  const cropBtn = $('#cbCropBtn');
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
    if (x < 0 || y < 0) return;

    // Se il mouse è sopra la barra comandi inferiore (#cbBar), nascondiamo le barre flottanti
    const hoveredEl = document.elementFromPoint(x, y);
    if (hoveredEl && hoveredEl.closest('#cbBar')) {
      if (imgBar) imgBar.hidden = true;
      if (itemBar) itemBar.hidden = true;
      currentImg = null;
      currentItem = null;
      return;
    }

    // Se la modalità centratura foto è attiva, nascondiamo le barre flottanti per non intralciare
    if (cropTargetEl) {
      if (imgBar) imgBar.hidden = true;
      if (itemBar) itemBar.hidden = true;
      return;
    }

    // Se il puntatore è sopra una delle due barre flottanti o dentro un popover/modale/HUD,
    // manteniamo la visualizzazione corrente ed evitiamo sfarfallii mentre l'utente clicca
    if (hoveredEl && hoveredEl.closest('#cbImgBar, #cbItemBar, #cbPop, #cbCropModal, #cbCropHud')) {
      if ((!currentImg || currentImg.isConnected) && (!currentItem || currentItem.isConnected)) {
        return;
      }
    }

    const top0 = headerBottom() + 10;
    const bottomLimit = window.innerHeight - 76;
    const minLeft = 10;
    const maxRight = window.innerWidth - 10;

    const img = smallestContaining('[data-cb-src], [data-cb-bg]', x, y);
    const item = smallestContaining('[data-cb-item]', x, y);

    currentImg = img;
    if (img && imgBar) {
      imgBar.hidden = false;
      const lbl = img.getAttribute('data-cb-label') || 'foto';
      const span = imgBtn ? imgBtn.querySelector('span') : null;
      if (span) span.textContent = 'Cambia ' + lbl.toLowerCase();
    } else if (imgBar) {
      imgBar.hidden = true;
    }

    if (item !== currentItem) {
      currentItem = item;
      if (item && itemBar) buildItemBar(item);
    }
    if (item && itemBar) {
      itemBar.hidden = false;
    } else if (itemBar) {
      itemBar.hidden = true;
    }

    // Calcolo posizione Item Bar (in alto a destra del blocco)
    let itemRect = null;
    if (item && itemBar && !itemBar.hidden) {
      const rItem = item.getBoundingClientRect();
      const w = itemBar.offsetWidth || 260;
      const h = itemBar.offsetHeight || 38;
      const left = Math.max(minLeft, Math.min(maxRight - w, rItem.right - w - 12));
      const top = Math.max(top0, Math.min(bottomLimit - h, rItem.top + 10));
      itemRect = { left, top, right: left + w, bottom: top + h, w, h };
    }

    // Calcolo posizione Image Bar (in basso a sinistra della foto)
    let imgRect = null;
    if (img && imgBar && !imgBar.hidden) {
      const rImg = img.getBoundingClientRect();
      const w = imgBar.offsetWidth || 240;
      const h = imgBar.offsetHeight || 38;
      const visibleTop = Math.max(top0, rImg.top);
      const visibleBottom = Math.min(bottomLimit, rImg.bottom);

      const left = Math.max(minLeft, Math.min(maxRight - w, rImg.left + 12));
      let top = visibleBottom - h - 10;
      top = Math.max(visibleTop, Math.min(bottomLimit - h, top));
      imgRect = { left, top, right: left + w, bottom: top + h, w, h };
    }

    // Controllo collisione 2D: prevenzione sovrapposizione garantita
    if (itemRect && imgRect) {
      const gap = 10;
      const overlapX = !(itemRect.right + gap <= imgRect.left || imgRect.right + gap <= itemRect.left);
      const overlapY = !(itemRect.bottom + gap <= imgRect.top || imgRect.bottom + gap <= itemRect.top);

      if (overlapX && overlapY) {
        // Se si sovrappongono, separiamo verticalmente:
        if (itemRect.bottom + gap + imgRect.h <= bottomLimit) {
          imgRect.top = itemRect.bottom + gap;
          imgRect.bottom = imgRect.top + imgRect.h;
        } else if (itemRect.top - gap - imgRect.h >= top0) {
          imgRect.top = itemRect.top - gap - imgRect.h;
          imgRect.bottom = imgRect.top + imgRect.h;
        } else if (itemRect.left - gap - imgRect.w >= minLeft) {
          imgRect.left = itemRect.left - gap - imgRect.w;
          imgRect.right = imgRect.left + imgRect.w;
        } else {
          itemRect.left = Math.min(maxRight - itemRect.w, imgRect.right + gap);
          itemRect.right = itemRect.left + itemRect.w;
        }
      }
    }

    // Applicazione coordinate a schermo
    if (itemRect && itemBar) {
      itemBar.style.left = Math.round(itemRect.left) + 'px';
      itemBar.style.top = Math.round(itemRect.top) + 'px';
    }
    if (imgRect && imgBar) {
      imgBar.style.left = Math.round(imgRect.left) + 'px';
      imgBar.style.top = Math.round(imgRect.top) + 'px';
    }
  }

  function scheduleFloating() {
    if (!rafPending) { rafPending = true; requestAnimationFrame(updateFloating); }
  }
  document.addEventListener('mousemove', (e) => { pointer = { x: e.clientX, y: e.clientY }; scheduleFloating(); }, { passive: true });
  window.addEventListener('scroll', scheduleFloating, { passive: true });
  document.addEventListener('mouseleave', () => { if (imgBar) imgBar.hidden = true; if (!barLocked) itemBar.hidden = true; });

  // Cambio foto
  let imgTargetPath = null;
  if (imgBtn) {
    imgBtn.addEventListener('click', () => {
      if (!currentImg) return;
      imgTargetPath = currentImg.getAttribute('data-cb-src') || currentImg.getAttribute('data-cb-bg');
      $('#cbFile').click();
    });
  }
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

  // Regola Inquadratura & Centratura foto
  if (cropBtn) {
    cropBtn.addEventListener('click', () => {
      if (currentImg) openCropModal(currentImg);
    });
  }

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
  // Gestione Pagine (Selettore rapido e mantenimento ?modifica)
  // ---------------------------------------------------------------------------
  function initPageSwitcher() {
    const rawPath = location.pathname.split('/').pop() || 'index.html';
    const curPage = rawPath.replace(/\.html$/, '') || 'index';
    const pageNames = {
      index: 'Home',
      storia: 'Chi siamo & Storia',
      vini: 'Prodotti & Vini',
      esperienze: 'Esperienze',
      agriturismo: 'Agriturismo',
      contatti: 'Contatti'
    };
    const pageLabel = pageNames[curPage] || 'Pagina';
    const lbl = $('#cbPageLabel');
    if (lbl) lbl.textContent = pageLabel;

    const btnCurrent = $('#cbPageCurrent');
    const menu = $('#cbPageMenu');
    if (btnCurrent && menu) {
      btnCurrent.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !menu.hidden;
        menu.hidden = open;
        btnCurrent.setAttribute('aria-expanded', String(!open));
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#cbPageSwitcher')) {
          menu.hidden = true;
          btnCurrent.setAttribute('aria-expanded', 'false');
        }
      });
    }

    document.querySelectorAll('.cb-page-link').forEach((a) => {
      if (a.getAttribute('data-page') === curPage) a.classList.add('active');
    });

    const exitBtn = $('#cbBtnExit');
    if (exitBtn) {
      exitBtn.href = rawPath.split('?')[0];
    }

    // Assicura che i link di navigazione nell'header e nei menu portino a ?modifica
    document.querySelectorAll('.site-header a, .menu-overlay a').forEach((a) => {
      const h = a.getAttribute('href');
      if (h && (h.endsWith('.html') || h.includes('.html#')) && !h.includes('modifica')) {
        const parts = h.split('#');
        const file = parts[0];
        const hash = parts[1] ? '#' + parts[1] : '';
        a.href = file + '?modifica' + hash;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Regolazione Inquadratura & Centratura Foto (Live HUD a Schermo Intero + Lente)
  // ---------------------------------------------------------------------------
  let cropTargetEl = null;
  let cropPosPath = null;
  let cropInitialPos = '50% 50%';
  let currentCropX = 50;
  let currentCropY = 50;
  let currentCropScale = 1;
  let isDraggingCrop = false;
  let dragStartPointer = { x: 0, y: 0 };
  let dragStartCoords = { x: 50, y: 50 };

  function parsePos(posStr) {
    if (!posStr) return { x: 50, y: 50, scale: 1 };
    const parts = String(posStr).trim().split('/');
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

  function getElementPos(el, posPath) {
    if (posPath) {
      const v = C.get(data, posPath);
      if (v) return String(v);
    }
    if (el) {
      if (el.style.objectPosition) {
        return el.style.transform && el.style.transform.includes('scale')
          ? `${el.style.objectPosition} / ${currentCropScale}`
          : el.style.objectPosition;
      }
      if (el.style.backgroundPosition) return el.style.backgroundPosition;
    }
    return '50% 50%';
  }

  function applyCrop(x, y, scale = currentCropScale) {
    currentCropX = Math.round(Math.max(0, Math.min(100, x)));
    currentCropY = Math.round(Math.max(0, Math.min(100, y)));
    currentCropScale = Math.round(Math.max(1, Math.min(2.5, scale)) * 100) / 100;

    const posStr = `${currentCropX}% ${currentCropY}%`;

    // Aggiorna reticolo modal
    const reticle = $('#cbCropReticle');
    if (reticle) {
      reticle.style.left = currentCropX + '%';
      reticle.style.top = currentCropY + '%';
    }

    // Aggiorna preview modal (con lo stesso identico object-position e transform scale)
    const cropImg = $('#cbCropImg');
    if (cropImg) {
      cropImg.style.objectPosition = posStr;
      cropImg.style.transform = currentCropScale > 1.01 ? `scale(${currentCropScale})` : '';
      cropImg.style.transformOrigin = posStr;
    }

    // Aggiorna controlli slider in modale e in HUD
    const rx = $('#cbCropRangeX');
    const ry = $('#cbCropRangeY');
    const vx = $('#cbCropValX');
    const vy = $('#cbCropValY');
    if (rx) rx.value = currentCropX;
    if (ry) ry.value = currentCropY;
    if (vx) vx.textContent = currentCropX + '%';
    if (vy) vy.textContent = currentCropY + '%';

    const rZoom = $('#cbCropZoomRange');
    const vZoom = $('#cbCropZoomVal');
    const rModalZoom = $('#cbCropRangeZoom');
    const vModalZoom = $('#cbCropModalZoomVal');
    const zoomInt = Math.round(currentCropScale * 100);
    if (rZoom) rZoom.value = zoomInt;
    if (vZoom) vZoom.textContent = zoomInt + '%';
    if (rModalZoom) rModalZoom.value = zoomInt;
    if (vModalZoom) vModalZoom.textContent = zoomInt + '%';

    // Aggiorna stato attivo dei pulsanti preset
    document.querySelectorAll('.cb-preset-btn, .cb-hud-preset-btn').forEach((b) => {
      const bx = parseInt(b.getAttribute('data-x'), 10);
      const by = parseInt(b.getAttribute('data-y'), 10);
      b.classList.toggle('active', Math.abs(bx - currentCropX) < 4 && Math.abs(by - currentCropY) < 4);
    });

    // Aggiorna l'elemento reale sulla pagina IN TEMPO REALE senza alcuna deformazione
    if (cropTargetEl) {
      if (cropTargetEl.tagName === 'IMG') {
        cropTargetEl.style.objectPosition = posStr;
        if (currentCropScale > 1.01) {
          cropTargetEl.style.transform = `scale(${currentCropScale})`;
          cropTargetEl.style.transformOrigin = posStr;
        } else {
          cropTargetEl.style.transform = '';
        }
      } else {
        cropTargetEl.style.backgroundPosition = posStr;
        if (currentCropScale > 1.01) {
          cropTargetEl.style.backgroundSize = `${Math.round(currentCropScale * 100)}%`;
        } else {
          cropTargetEl.style.backgroundSize = '';
        }
      }
    }
  }

  function openCropModal(el) {
    if (!el) return;
    cropTargetEl = el;

    const directPos = el.getAttribute('data-cb-pos');
    const srcPath = el.getAttribute('data-cb-src');
    const bgPath = el.getAttribute('data-cb-bg');
    cropPosPath = directPos || (srcPath ? srcPath + '_pos' : (bgPath ? bgPath + '_pos' : null));

    let imgUrl = el.tagName === 'IMG' ? el.src : '';
    if (!imgUrl && el.style.backgroundImage) {
      const m = el.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
      if (m) imgUrl = m[1];
    }
    if (!imgUrl && srcPath) imgUrl = C.get(data, srcPath) || '';
    if (!imgUrl && bgPath) imgUrl = C.get(data, bgPath) || '';

    // Misura le dimensioni reali del blocco per riprodurre la scala reale 1:1 esatta
    const rect = el.getBoundingClientRect();
    const targetWidth = Math.round(rect.width) || window.innerWidth;
    const targetHeight = Math.round(rect.height) || window.innerHeight;
    const targetAspect = (targetWidth / targetHeight) || (16 / 9);

    cropInitialPos = getElementPos(el, cropPosPath);
    const parsed = parsePos(cropInitialPos);
    currentCropScale = parsed.scale || 1;

    // Configura immagine e aspect-ratio reale nella preview
    const cropImg = $('#cbCropImg');
    const previewBox = $('#cbCropPreview');
    if (cropImg) cropImg.src = imgUrl;
    if (previewBox) {
      previewBox.style.aspectRatio = String(targetAspect.toFixed(3));
      if (targetAspect >= 1.3) {
        previewBox.style.maxWidth = '540px';
        previewBox.style.maxHeight = '320px';
      } else if (targetAspect <= 0.8) {
        previewBox.style.maxWidth = '300px';
        previewBox.style.maxHeight = '420px';
      } else {
        previewBox.style.maxWidth = '420px';
        previewBox.style.maxHeight = '360px';
      }
    }

    // Configura metadati nell'HUD
    const lbl = el.getAttribute('data-cb-label') || 'Foto';
    const hudTitle = $('#cbHudTitle');
    const hudDim = $('#cbHudDimensions');
    if (hudTitle) hudTitle.textContent = lbl;
    if (hudDim) hudDim.textContent = `${targetWidth} × ${targetHeight} px`;

    // Evidenzia l'elemento sulla pagina
    el.classList.add('cb-crop-active-target');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    applyCrop(parsed.x, parsed.y, currentCropScale);

    // Mostra l'HUD di centratura dal vivo a schermo intero
    const hud = $('#cbCropHud');
    if (hud) hud.hidden = false;
  }

  function closeCropModal(save = false) {
    const modal = $('#cbCropModal');
    if (modal) modal.hidden = true;
    const hud = $('#cbCropHud');
    if (hud) hud.hidden = true;

    if (cropTargetEl) {
      cropTargetEl.classList.remove('cb-crop-active-target');
      if (!save) {
        const parsed = parsePos(cropInitialPos);
        applyCrop(parsed.x, parsed.y, parsed.scale || 1);
      }
    }
    cropTargetEl = null;
  }

  function saveCrop() {
    if (!cropTargetEl || !cropPosPath) {
      closeCropModal(true);
      return;
    }
    const finalVal = currentCropScale > 1.01
      ? `${currentCropX}% ${currentCropY}% / ${currentCropScale}`
      : `${currentCropX}% ${currentCropY}%`;
    cropTargetEl.setAttribute('data-cb-pos', cropPosPath);
    C.set(data, cropPosPath, finalVal);
    markDirty(cropPosPath);
    toast(`Inquadratura salvata (${finalVal})`, 'ok');
    closeCropModal(true);
  }

  function initCropEvents() {
    // Trascinamento diretto sia sulla pagina reale sia sull'anteprima
    function startDrag(e) {
      if (!cropTargetEl) return;
      const isTarget = e.target === cropTargetEl || cropTargetEl.contains(e.target);
      const isPreview = e.target && e.target.closest('#cbCropPreview');
      if (!isTarget && !isPreview) return;

      isDraggingCrop = true;
      dragStartPointer = { x: e.clientX, y: e.clientY };
      dragStartCoords = { x: currentCropX, y: currentCropY };
      e.preventDefault();
    }

    function moveDrag(e) {
      if (!isDraggingCrop || !cropTargetEl) return;
      const dx = e.clientX - dragStartPointer.x;
      const dy = e.clientY - dragStartPointer.y;
      const rect = cropTargetEl.getBoundingClientRect();
      const w = rect.width || 400;
      const h = rect.height || 400;
      // Trascinando verso destra la foto scorre a destra (diminuisce X%)
      // Trascinando verso il basso la foto scorre in basso (diminuisce Y%)
      const speed = 100 / (currentCropScale || 1);
      const nx = dragStartCoords.x - (dx / w) * speed;
      const ny = dragStartCoords.y - (dy / h) * speed;
      applyCrop(nx, ny, currentCropScale);
    }

    function stopDrag() {
      isDraggingCrop = false;
    }

    window.addEventListener('mousedown', startDrag, true);
    window.addEventListener('mousemove', moveDrag, { passive: true });
    window.addEventListener('mouseup', stopDrag);

    // Zoom con rotella del mouse quando sopra l'elemento o HUD
    window.addEventListener('wheel', (e) => {
      if (!cropTargetEl) return;
      const isTarget = e.target === cropTargetEl || cropTargetEl.contains(e.target);
      const isPreview = e.target && e.target.closest('#cbCropPreview, #cbCropHud');
      if (isTarget || isPreview) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        applyCrop(currentCropX, currentCropY, currentCropScale + delta);
      }
    }, { passive: false });

    // Slider orizzontale e verticale (modal)
    const rx = $('#cbCropRangeX');
    const ry = $('#cbCropRangeY');
    if (rx) rx.addEventListener('input', () => applyCrop(parseFloat(rx.value), currentCropY));
    if (ry) ry.addEventListener('input', () => applyCrop(currentCropX, parseFloat(ry.value)));

    // Slider Zoom (HUD e Modal)
    const rZoom = $('#cbCropZoomRange');
    const rModalZoom = $('#cbCropRangeZoom');
    if (rZoom) rZoom.addEventListener('input', () => applyCrop(currentCropX, currentCropY, parseFloat(rZoom.value) / 100));
    if (rModalZoom) rModalZoom.addEventListener('input', () => applyCrop(currentCropX, currentCropY, parseFloat(rModalZoom.value) / 100));

    const zMinus = $('#cbZoomMinus');
    const zPlus = $('#cbZoomPlus');
    if (zMinus) zMinus.addEventListener('click', () => applyCrop(currentCropX, currentCropY, currentCropScale - 0.1));
    if (zPlus) zPlus.addEventListener('click', () => applyCrop(currentCropX, currentCropY, currentCropScale + 0.1));

    // Spostamento a frecce (nudge)
    document.querySelectorAll('.cb-nudge-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const dx = parseFloat(b.getAttribute('data-dx') || '0');
        const dy = parseFloat(b.getAttribute('data-dy') || '0');
        applyCrop(currentCropX + dx, currentCropY + dy, currentCropScale);
      });
    });

    // Preset posizioni rapide
    document.querySelectorAll('.cb-preset-btn, .cb-hud-preset-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const x = parseFloat(b.getAttribute('data-x'));
        const y = parseFloat(b.getAttribute('data-y'));
        applyCrop(x, y, currentCropScale);
      });
    });

    // Toggle modale / lente
    const toggleModal = $('#cbCropModalToggle');
    if (toggleModal) {
      toggleModal.addEventListener('click', () => {
        const modal = $('#cbCropModal');
        if (modal) modal.hidden = !modal.hidden;
      });
    }

    // Pulsanti Salva / Annulla
    const btnSave = $('#cbCropSave');
    const btnCancel = $('#cbCropCancel');
    const btnClose = $('#cbCropClose');
    const backdrop = $('#cbCropBackdrop');
    const hudSave = $('#cbHudSave');
    const hudCancel = $('#cbHudCancel');

    if (btnSave) btnSave.addEventListener('click', saveCrop);
    if (hudSave) hudSave.addEventListener('click', saveCrop);
    if (btnCancel) btnCancel.addEventListener('click', () => closeCropModal(false));
    if (hudCancel) hudCancel.addEventListener('click', () => closeCropModal(false));
    if (btnClose) btnClose.addEventListener('click', () => closeCropModal(false));
    if (backdrop) backdrop.addEventListener('click', () => closeCropModal(false));

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && cropTargetEl) {
        closeCropModal(false);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Anteprima, aiuto, avvio
  // ---------------------------------------------------------------------------
  function setPreview(on) {
    preview = on;
    document.documentElement.classList.toggle('cb-preview', on);
    const btn = $('#cbBtnPreview');
    btn.innerHTML = on ? '<i class="fa-solid fa-pen"></i><span>Torna a modificare</span>' : '<i class="fa-solid fa-eye"></i><span>Anteprima</span>';
    btn.classList.toggle('cb-btn-gold', on);
    if (imgBar) imgBar.hidden = true;
    if (itemBar) itemBar.hidden = true;
    closePop(); closePanel(); closeCropModal(false);
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
      const res = await fetch('/api/ping', { cache: 'no-store' });
      serverOnline = res.ok && (await res.json()).ok;
    } catch (e) { serverOnline = false; }
    $('#cbOffline').hidden = serverOnline;
    setStatus(serverOnline ? 'Tutto salvato' : 'Server spento', serverOnline ? 'ok' : 'error');
    decorate();
    initPageSwitcher();
    initCropEvents();
    let seen = false;
    try { seen = localStorage.getItem('colbel_editor_help') === '1'; } catch (e) {}
    if (!seen) showHelp();
  })();

  window.ColBelEditor = { save: saveDirty, rerender, setPreview };
})();
