/**
 * ColBel – Caricamento contenuti dinamici da data/*.json
 *
 * Tutti i testi, prezzi, vini, esperienze, foto e contatti vengono letti da
 * data/*.json e inseriti nella pagina PRIMA che main.js avvii animazioni e
 * slider (main.js attende window.colbelContentReady).
 *
 * Ogni elemento collegato ai dati porta un attributo con il "percorso" del dato:
 *   data-cb="vini#giusto-docg.nome"          testo
 *   data-cb-src="chiSiamo.immagine"           <img src>
 *   data-cb-bg="territorio.immagine_sfondo"   background-image
 *   data-cb-item="vini#giusto-docg"           un elemento di una lista
 * "nome#id" indica l'elemento con quell'id dentro una lista.
 * Gli stessi attributi sono usati dall'editor visuale (assets/js/editor.js),
 * che si attiva aprendo il sito con ?modifica (vedi /admin/).
 *
 * Se i JSON non sono raggiungibili (pagina aperta con doppio clic, file://)
 * la pagina resta con i contenuti statici scritti nell'HTML.
 */
(function () {
  'use strict';

  const FILES = {
    impostazioni: 'data/impostazioni.json',
    chiSiamo: 'data/chi-siamo.json',
    territorio: 'data/territorio.json',
    scrollytelling: 'data/scrollytelling.json',
    vini: 'data/vini.json',
    esperienze: 'data/esperienze.json',
    agriturismo: 'data/agriturismo.json',
    contatti: 'data/contatti.json'
  };

  const EDIT = /[?&]modifica\b/.test(location.search) && location.protocol !== 'file:';

  // ---------- utilità ----------
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /** Risolve un percorso tipo "vini#id.tags.0.testo" → { parent, key, value } */
  function resolve(root, path) {
    const segs = String(path).split('.');
    let parent = null;
    let key = null;
    let cur = root;
    for (const seg of segs) {
      if (cur == null) return { parent: null, key: null, value: undefined };
      const hash = seg.indexOf('#');
      if (hash > -1) {
        const name = seg.slice(0, hash);
        const id = seg.slice(hash + 1);
        const list = cur[name];
        if (!Array.isArray(list)) return { parent: null, key: null, value: undefined };
        const idx = list.findIndex((x) => x && String(x.id) === id);
        parent = list; key = idx; cur = idx > -1 ? list[idx] : undefined;
      } else {
        parent = cur; key = seg; cur = cur[seg];
      }
    }
    return { parent, key, value: cur };
  }
  const get = (root, path) => resolve(root, path).value;
  function set(root, path, value) {
    const r = resolve(root, path);
    if (r.parent == null || r.key == null || r.key === -1) return false;
    r.parent[r.key] = value;
    return true;
  }

  const num = (n) => {
    const v = parseFloat(n);
    return isNaN(v) ? null : v;
  };
  const fmtPrice = (n) => { const v = num(n); return v == null ? '' : v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  const fmtPriceShort = (n) => { const v = num(n); return v == null ? '' : (Number.isInteger(v) ? String(v) : v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); };
  const formatValue = (el, v) => {
    const t = el.getAttribute('data-cb-type');
    if (t === 'price') return fmtPrice(v);
    if (t === 'price-short') return fmtPriceShort(v);
    return v == null ? '' : String(v);
  };
  const digits = (s) => String(s || '').replace(/[^\d+]/g, '');
  const waDigits = (s) => String(s || '').replace(/\D/g, '');
  const pad2 = (i) => String(i).padStart(2, '0');
  const jsStr = (s) => JSON.stringify(String(s == null ? '' : s));

  // In modifica si vedono anche gli elementi nascosti (segnalati dall'editor), non in anteprima
  const showHidden = () => EDIT && !document.documentElement.classList.contains('cb-preview');
  const visibleList = (list) => (Array.isArray(list) ? list : [])
    .filter((x) => x && (showHidden() || x.attivo !== false))
    .slice()
    .sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
  const hiddenCls = (x) => (x.attivo === false ? ' cb-is-hidden' : '');

  async function loadAll() {
    const entries = await Promise.all(Object.entries(FILES).map(async ([key, path]) => {
      try {
        const res = await fetch(path + '?v=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return [key, null];
        return [key, await res.json()];
      } catch (e) {
        return [key, null];
      }
    }));
    return Object.fromEntries(entries);
  }

  // ---------- binding semplici ----------
  function bindSimple(data) {
    document.querySelectorAll('[data-cb]').forEach((el) => {
      if (el === document.activeElement) return; // non disturbare chi sta scrivendo
      const v = get(data, el.getAttribute('data-cb'));
      if (v !== undefined && v !== null) el.textContent = formatValue(el, v);
    });
    document.querySelectorAll('[data-cb-src]').forEach((el) => {
      const v = get(data, el.getAttribute('data-cb-src'));
      if (v) el.setAttribute('src', v);
    });
    document.querySelectorAll('[data-cb-bg]').forEach((el) => {
      const v = get(data, el.getAttribute('data-cb-bg'));
      if (v) el.style.backgroundImage = `url('${String(v).replace(/'/g, '%27')}')`;
    });
  }

  // ---------- contatti: data-cb-tel / data-cb-wa / data-cb-mail ----------
  function bindContacts(c) {
    if (!c) return;
    const person = (k) => (c[k] || {});
    document.querySelectorAll('[data-cb-tel]').forEach((el) => {
      const p = person(el.getAttribute('data-cb-tel'));
      if (p.telefono) el.href = 'tel:' + digits(p.telefono);
    });
    document.querySelectorAll('[data-cb-wa]').forEach((el) => {
      const p = person(el.getAttribute('data-cb-wa'));
      if (!p.wa_numero) return;
      const msg = el.getAttribute('data-cb-wa-msg');
      el.href = 'https://wa.me/' + waDigits(p.wa_numero) + (msg ? '?text=' + encodeURIComponent(msg) : '');
    });
    const social = c.social || {};
    document.querySelectorAll('[data-cb-social]').forEach((el) => {
      const url = social[el.getAttribute('data-cb-social')];
      if (url) { el.href = url; el.style.display = ''; } else el.style.display = 'none';
    });
  }

  // ---------- sezioni ----------
  function renderBanner(imp) {
    const old = document.getElementById('colbelTopBanner');
    if (old) old.remove();
    document.body.classList.remove('has-top-banner');
    const b = imp && imp.banner_annuncio;
    if (!b || (!showHidden() && (!b.attivo || !b.testo))) return;

    const bar = document.createElement('div');
    bar.id = 'colbelTopBanner';
    bar.className = 'colbel-top-banner' + (b.attivo ? '' : ' cb-banner-off');
    bar.setAttribute('data-cb-item', 'impostazioni.banner_annuncio');
    bar.setAttribute('data-cb-kind', 'banner');
    bar.innerHTML = `<i class="fa-solid fa-bullhorn"></i> <span data-cb="impostazioni.banner_annuncio.testo" data-cb-label="Testo della barra avvisi">${esc(b.testo)}</span>` +
      (b.link ? ` <a href="${esc(b.link)}">Dettagli &rarr;</a>` : '');
    document.body.prepend(bar);
    document.body.classList.add('has-top-banner');
    const setH = () => document.documentElement.style.setProperty('--banner-h', bar.offsetHeight + 'px');
    setH();
    if (!renderBanner.bound) { window.addEventListener('resize', () => { const el = document.getElementById('colbelTopBanner'); if (el) document.documentElement.style.setProperty('--banner-h', el.offsetHeight + 'px'); }); renderBanner.bound = true; }
  }

  function renderStats(cs) {
    const box = document.getElementById('csStats');
    if (!box || !cs || !Array.isArray(cs.statistiche)) return;
    box.innerHTML = cs.statistiche.map((s, i) => `
      <div class="stat-item" data-cb-item="chiSiamo.statistiche.${i}" data-cb-kind="stat">
        <span class="stat-num"><span data-cb="chiSiamo.statistiche.${i}.valore" data-cb-label="Numero">${esc(s.valore)}</span>${s.unita ? ' <small>' + esc(s.unita) + '</small>' : ''}</span>
        <span class="stat-desc" data-cb="chiSiamo.statistiche.${i}.etichetta" data-cb-label="Descrizione del numero">${esc(s.etichetta)}</span>
      </div>`).join('');
  }

  function renderScrolly(sc) {
    if (!sc) return;
    const btn = document.getElementById('scrollyOrderBtn');
    if (btn && sc.ordine) {
      btn.setAttribute('onclick', `openOrderModal(${jsStr(sc.ordine.nome)}, ${num(sc.ordine.prezzo) || 0})`);
    }
  }

  function wineOrderCall(v) {
    return `openOrderModal(${jsStr(v.nome_ordine || v.nome)}, ${num(v.prezzo) || 0})`;
  }

  function renderWines(vini) {
    const list = visibleList(vini);
    const P = (v) => 'vini#' + v.id;

    const runway = document.getElementById('winesRunwayView');
    if (runway) {
      runway.innerHTML = list.map((v, i) => {
        const right = i % 2 === 1;
        const p = P(v);
        const bottle = `
            <div class="runway-bottle-stage">
              <div class="runway-bottle-aura"></div>
              <img src="${esc(v.immagine)}" alt="${esc(v.nome)}" class="runway-bottle-img" loading="lazy" data-cb-src="${p}.immagine" data-cb-label="Bottiglia (PNG trasparente)" />
              <div class="runway-bottle-shadow"></div>
            </div>`;
        const info = `
            <div class="runway-info-col">
              <span class="runway-tag-pill" data-cb="${p}.tag" data-cb-label="Etichetta">${esc(v.tag)}</span>
              <span class="runway-appellation" data-cb="${p}.denominazione" data-cb-label="Denominazione">${esc(v.denominazione)}</span>
              <h3 class="runway-wine-title" data-cb="${p}.nome" data-cb-label="Nome del vino">${esc(v.nome)}</h3>
              <div class="runway-wine-type" data-cb="${p}.tipo" data-cb-label="Tipologia">${esc(v.tipo)}</div>
              <p class="runway-wine-desc" data-cb="${p}.descrizione" data-cb-label="Descrizione">${esc(v.descrizione)}</p>
              <div class="runway-pricing-row">
                <div class="runway-price-group">
                  <span class="runway-price"><span data-cb="${p}.prezzo" data-cb-type="price" data-cb-label="Prezzo a bottiglia">${fmtPrice(v.prezzo)}</span> €</span>
                  <span class="runway-price-note" data-cb="${p}.note_prezzo" data-cb-label="Nota sotto il prezzo">${esc(v.note_prezzo)}</span>
                </div>
                <button class="btn-primary" onclick="${esc(wineOrderCall(v))}">
                  <span>Ordina Bottiglia</span>
                  <i class="fa-brands fa-whatsapp"></i>
                </button>
              </div>
            </div>`;
        return `
        <article class="wine-runway-strip ${right ? 'align-right' : 'align-left'}${hiddenCls(v)}" data-category="${esc(v.categoria)}" data-cb-item="${p}" data-cb-kind="vino">
          <div class="runway-ambient-halo"></div>
          <div class="runway-inner">${right ? info + bottle : bottle + info}
          </div>
        </article>`;
      }).join('');
    }

    // Palcoscenico unico (solo vini visibili: in modifica si usa la sfilata)
    const stageList = list.filter((v) => v.attivo !== false);
    const tabs = document.querySelector('.stage-tabs-nav');
    if (tabs) {
      tabs.innerHTML = stageList.map((v, i) =>
        `<button class="stage-tab-btn${i === 0 ? ' active' : ''}" data-index="${i}">${pad2(i + 1)} ${esc(v.nome_breve || v.nome)}</button>`
      ).join('');
    }
    const arena = document.querySelector('.stage-showcase-arena');
    if (arena) {
      arena.querySelectorAll('.stage-wine-slide').forEach((s) => s.remove());
      const next = document.getElementById('stageNextBtn');
      const html = stageList.map((v, i) => `
          <div class="stage-wine-slide${i === 0 ? ' active' : ''}" data-index="${i}">
            <div class="stage-bottle-stage">
              <div class="stage-bottle-halo"></div>
              <img src="${esc(v.immagine)}" alt="${esc(v.nome)}" class="stage-bottle-img" loading="lazy" />
            </div>
            <div class="stage-info-col">
              <span class="stage-badge">${esc(v.tag)}</span>
              <h3 class="stage-title">${esc(v.nome)}</h3>
              <div class="stage-appellation">${esc(v.denominazione)}</div>
              <p class="stage-desc">${esc(v.descrizione_breve || v.descrizione)}</p>
              <div class="stage-action-row">
                <span class="stage-price">${fmtPrice(v.prezzo)} € <small>IVA incl.</small></span>
                <button class="btn-primary" onclick="${esc(wineOrderCall(v))}">
                  <span>Ordina con WhatsApp</span>
                  <i class="fa-brands fa-whatsapp"></i>
                </button>
              </div>
            </div>
          </div>`).join('');
      if (next) next.insertAdjacentHTML('beforebegin', html);
      else arena.insertAdjacentHTML('beforeend', html);
    }

    const fl = document.getElementById('footerWineList');
    if (fl) {
      fl.innerHTML = stageList.map((v) => `<li><a href="#prodotti">${esc(v.nome)}</a></li>`).join('') +
        '<li><a href="#esperienze">Degustazioni & Tour</a></li>';
    }
    const dockOrder = document.getElementById('dockOrderBtn');
    if (dockOrder && stageList[0]) dockOrder.setAttribute('onclick', wineOrderCall(stageList[0]));
  }

  function renderExperiences(esperienze, contatti) {
    const track = document.getElementById('expTrack');
    if (!track || !Array.isArray(esperienze)) return;
    const list = visibleList(esperienze);
    track.innerHTML = list.map((e, i) => {
      const p = 'esperienze#' + e.id;
      const refC = (contatti && e.referente && contatti[e.referente]) || {};
      const wa = waDigits(refC.wa_numero) || waDigits(e.referente_wa) || waDigits(contatti && contatti.gianni && contatti.gianni.wa_numero);
      const msg = e.messaggio_whatsapp || `Buongiorno, vorrei prenotare: ${e.titolo}`;
      const tags = (e.tags || []).map((t, ti) =>
        `<span><i class="${esc(t.icona || 'fa-solid fa-check')}"></i> <b class="cb-tag-text" data-cb="${p}.tags.${ti}.testo" data-cb-label="Caratteristica">${esc(t.testo)}</b></span>`).join('');
      return `
          <article class="exp-mural-pillar${hiddenCls(e)}" data-exp="${i + 1}" data-cb-item="${p}" data-cb-kind="esperienza">
            <div class="exp-mural-bg" style="background-image: url('${esc(e.immagine)}');" data-cb-bg="${p}.immagine" data-cb-label="Foto di sfondo"></div>
            <div class="exp-mural-overlay"></div>
            <div class="exp-mural-top">
              <span class="exp-pill-badge" data-cb="${p}.badge" data-cb-label="Etichetta">${esc(e.badge)}</span>
              <span class="exp-card-number">${pad2(i + 1)}</span>
            </div>
            <div class="exp-mural-content">
              <div class="exp-price-hero">
                <span data-cb="${p}.prezzo" data-cb-type="price-short" data-cb-label="Prezzo">${fmtPriceShort(e.prezzo)}</span> €<span class="exp-price-unit" data-cb="${p}.unita_prezzo" data-cb-label="Unità di prezzo">${esc(e.unita_prezzo)}</span>
              </div>
              <h3 class="exp-slide-title" data-cb="${p}.titolo" data-cb-label="Titolo">${esc(e.titolo)}</h3>
              <p class="exp-slide-desc" data-cb="${p}.descrizione" data-cb-label="Descrizione">${esc(e.descrizione)}</p>
              <div class="exp-features-tags">${tags}</div>
              <div class="exp-mural-action">
                <a href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" class="btn-primary exp-btn" target="_blank" rel="noopener">
                  <span data-cb="${p}.testo_pulsante" data-cb-label="Testo del pulsante">${esc(e.testo_pulsante || ('Prenota con ' + (e.referente_nome || 'noi')))}</span>
                  <i class="fa-brands fa-whatsapp"></i>
                </a>
              </div>
            </div>
          </article>`;
    }).join('');
  }

  function renderGallery(agri) {
    const track = document.getElementById('galleryTrack');
    if (!track || !agri || !Array.isArray(agri.galleria)) return;
    const items = agri.galleria.slice().sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
    track.innerHTML = items.map((f) => {
      const p = 'agriturismo.galleria#' + f.id;
      return `
          <div class="filmstrip-item" data-cb-item="${p}" data-cb-kind="foto">
            <img src="${esc(f.immagine)}" alt="${esc(f.didascalia)}" loading="lazy" data-cb-src="${p}.immagine" data-cb-label="Foto" />
            <div class="filmstrip-overlay">
              <span class="filmstrip-caption" data-cb="${p}.didascalia" data-cb-label="Didascalia">${esc(f.didascalia)}</span>
            </div>
          </div>`;
    }).join('');
  }

  function renderContactSection(c) {
    if (!c) return;
    const list = document.getElementById('contactList');
    const az = c.azienda || {};
    if (list) {
      const person = (p, key) => !p ? '' : `
            <div class="contact-freestyle-item" data-cb-item="contatti.${key}" data-cb-kind="persona">
              <div class="contact-freestyle-meta">
                <h4 data-cb="contatti.${key}.nome" data-cb-label="Nome">${esc(p.nome)}</h4>
                <p><span data-cb="contatti.${key}.ruolo" data-cb-label="Ruolo">${esc(p.ruolo)}</span> • <strong data-cb="contatti.${key}.telefono" data-cb-label="Telefono">${esc(p.telefono)}</strong></p>
              </div>
              <div class="contact-actions-pair">
                ${p.telefono ? `<a href="tel:${esc(digits(p.telefono))}" class="btn-icon-action" title="Chiama ${esc(p.nome)}"><i class="fa-solid fa-phone"></i></a>` : ''}
                ${p.wa_numero ? `<a href="https://wa.me/${esc(waDigits(p.wa_numero))}" target="_blank" class="btn-icon-action wa" title="WhatsApp ${esc(p.nome)}"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
              </div>
            </div>`;
      const showOrari = az.orari || showHidden();
      list.innerHTML = person(c.gianni, 'gianni') + person(c.lissa, 'lissa') + `
            <div class="contact-freestyle-item" data-cb-item="contatti.azienda" data-cb-kind="sede">
              <div class="contact-freestyle-meta">
                <h4>Sede Azienda Agricola</h4>
                <p data-cb="contatti.azienda.indirizzo" data-cb-label="Indirizzo">${esc(az.indirizzo)}</p>
              </div>
              <div class="contact-actions-pair">
                ${az.mappa_url ? `<a href="${esc(az.mappa_url)}" target="_blank" class="btn-icon-action" title="Google Maps"><i class="fa-solid fa-map-location-dot"></i></a>` : ''}
              </div>
            </div>` + (showOrari ? `
            <div class="contact-freestyle-item">
              <div class="contact-freestyle-meta">
                <h4>Orari & Visite</h4>
                <p data-cb="contatti.azienda.orari" data-cb-label="Orari (lascia vuoto per nasconderli)">${esc(az.orari)}</p>
              </div>
            </div>` : '');
    }

    const fc = document.getElementById('footerContactList');
    if (fc) {
      const line = (p, key) => p && p.telefono ? `<li><span><span data-cb="contatti.${key}.nome">${esc(p.nome)}</span>: <span data-cb="contatti.${key}.telefono">${esc(p.telefono)}</span></span></li>` : '';
      fc.innerHTML = line(c.gianni, 'gianni') + line(c.lissa, 'lissa') +
        `<li><span data-cb="contatti.azienda.indirizzo_breve" data-cb-label="Indirizzo breve">${esc(az.indirizzo_breve || az.indirizzo)}</span></li>` +
        (az.email ? `<li><a href="mailto:${esc(az.email)}" data-cb="contatti.azienda.email" data-cb-label="Email">${esc(az.email)}</a></li>` : '');
    }
  }

  function render(data) {
    renderBanner(data.impostazioni);
    renderStats(data.chiSiamo);
    renderScrolly(data.scrollytelling);
    renderWines(data.vini);
    renderExperiences(data.esperienze, data.contatti);
    renderGallery(data.agriturismo);
    renderContactSection(data.contatti);
    bindSimple(data);
    bindContacts(data.contatti);
    document.dispatchEvent(new CustomEvent('colbel:rendered'));
  }

  window.ColBel = { EDIT, get, set, render: (d) => render(d || window.COLBEL_DATA), esc };
  window.COLBEL_DATA = {};

  function loadEditor() {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'assets/css/editor.css?v=' + Date.now();
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'assets/js/editor.js?v=' + Date.now();
    document.body.appendChild(s);
  }

  window.colbelContentReady = (async () => {
    if (location.protocol === 'file:') return window.COLBEL_DATA;
    if (EDIT) document.documentElement.classList.add('cb-edit-mode');
    const data = await loadAll();
    window.COLBEL_DATA = data;
    if (document.readyState === 'loading') {
      await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
    }
    try { render(data); } catch (e) { console.error('[ColBel] Errore nel rendering dei contenuti', e); }
    if (EDIT) loadEditor();
    return data;
  })();
})();
