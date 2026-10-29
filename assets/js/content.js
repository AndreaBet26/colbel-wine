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
  function applyPos(el, pos) {
    if (!pos) return;
    const parts = String(pos).trim().split('/');
    const coords = (parts[0] || '').trim();
    const scale = parts[1] ? parseFloat(parts[1]) : 1;
    if (el.tagName === 'IMG') {
      if (coords) el.style.objectPosition = coords;
      if (scale && scale > 1.01) {
        el.style.transform = `scale(${scale})`;
        el.style.transformOrigin = coords || '50% 50%';
      } else {
        el.style.transform = '';
      }
    } else {
      if (coords) el.style.backgroundPosition = coords;
      if (scale && scale > 1.01) {
        el.style.backgroundSize = `${Math.round(scale * 100)}%`;
      }
    }
  }

  function bindSimple(data) {
    document.querySelectorAll('[data-cb]').forEach((el) => {
      if (el === document.activeElement) return; // non disturbare chi sta scrivendo
      const v = get(data, el.getAttribute('data-cb'));
      if (v !== undefined && v !== null) el.textContent = formatValue(el, v);
    });
    document.querySelectorAll('[data-cb-src]').forEach((el) => {
      const srcPath = el.getAttribute('data-cb-src');
      const v = get(data, srcPath);
      if (v) {
        el.setAttribute('src', v);
        if (srcPath === 'impostazioni.porte_prodotti_img') {
          const bottles = el.parentElement ? el.parentElement.querySelector('.door-bottles') : null;
          if (bottles) {
            const isBottleImg = /bottiglie\/giusto/i.test(v);
            bottles.style.display = isBottleImg ? '' : 'none';
            el.style.display = isBottleImg ? 'none' : 'block';
          }
        }
      }
      const posPath = el.getAttribute('data-cb-pos') || (srcPath + '_pos');
      const pos = get(data, posPath);
      if (pos) {
        applyPos(el, pos);
        el.setAttribute('data-cb-pos', posPath);
      }
    });
    document.querySelectorAll('[data-cb-bg]').forEach((el) => {
      const bgPath = el.getAttribute('data-cb-bg');
      const v = get(data, bgPath);
      if (v) el.style.backgroundImage = `url('${String(v).replace(/'/g, '%27')}')`;
      const posPath = el.getAttribute('data-cb-pos') || (bgPath + '_pos');
      const pos = get(data, posPath);
      if (pos) {
        applyPos(el, pos);
        el.setAttribute('data-cb-pos', posPath);
      }
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


  const photoFig = (src, fades, bind, label, alt, pos) => {
    const posAttr = bind ? ` data-cb-pos="${bind}_pos"` : '';
    const posStyle = pos ? ` style="object-position:${esc(pos)}"` : '';
    return `<figure class="photo ${fades}" data-photo><img src="${esc(src)}" alt="${esc(alt || '')}" loading="lazy"${bind ? ` data-cb-src="${bind}" data-cb-label="${label}"` : ''}${posAttr}${posStyle} /></figure>`;
  };

  function renderWines(vini) {
    const list = visibleList(vini);
    const P = (v) => 'vini#' + v.id;

    const box = document.getElementById('winesRunwayView');
    if (box) {
      box.innerHTML = list.map((v, i) => {
        const p = P(v);
        const left = i % 2 === 0;
        return `
      <article class="wine-row grid ${left ? 'is-left' : 'is-right'}${hiddenCls(v)}" id="vino-${esc(v.id)}" data-category="${esc(v.categoria)}" data-cb-item="${p}" data-cb-kind="vino">
        <div class="wine-bottle"><div class="wine-halo"></div><img src="${esc(v.immagine)}" alt="${esc(v.nome)}" loading="lazy" data-cb-src="${p}.immagine" data-cb-label="Bottiglia (PNG trasparente)" /></div>
        <div class="wine-info">
          <span class="eyebrow" data-cb="${p}.tag" data-cb-label="Etichetta">${esc(v.tag)}</span>
          <span class="denominazione" data-cb="${p}.denominazione" data-cb-label="Denominazione">${esc(v.denominazione)}</span>
          <h2 class="h2" data-cb="${p}.nome" data-cb-label="Nome del vino">${esc(v.nome)}</h2>
          <div class="tipo" data-cb="${p}.tipo" data-cb-label="Tipologia">${esc(v.tipo)}</div>
          <p class="text" data-cb="${p}.descrizione" data-cb-label="Descrizione">${esc(v.descrizione)}</p>
          <div class="price-row">
            <div>
              <span class="price"><span data-cb="${p}.prezzo" data-cb-type="price" data-cb-label="Prezzo a bottiglia">${fmtPrice(v.prezzo)}</span></span>
              <span class="price-note" data-cb="${p}.note_prezzo" data-cb-label="Nota sotto il prezzo">${esc(v.note_prezzo)}</span>
            </div>
          </div>
        </div>
      </article>`;
      }).join('');
    }

    const visible = list.filter((v) => v.attivo !== false);
    const fl = document.getElementById('footerWineList');
    if (fl) fl.innerHTML = visible.map((v) => `<li><a href="vini.html#vino-${esc(v.id)}">${esc(v.nome)}</a></li>`).join('');
    const dockOrder = document.getElementById('dockOrderBtn');
    if (dockOrder && visible[0]) dockOrder.setAttribute('onclick', wineOrderCall(visible[0]));
  }

  function renderExperiences(esperienze, contatti) {
    const track = document.getElementById('expTrack');
    const media = document.getElementById('expMedia');
    if (!track || !Array.isArray(esperienze)) return;
    const list = visibleList(esperienze);
    if (media) media.innerHTML = list.map((e) => photoFig(e.immagine, '', 'esperienze#' + e.id + '.immagine', 'Foto', e.titolo, e.immagine_pos)).join('');
    track.innerHTML = list.map((e, i) => {
      const p = 'esperienze#' + e.id;
      const refC = (contatti && e.referente && contatti[e.referente]) || {};
      const wa = waDigits(refC.wa_numero) || waDigits(e.referente_wa) || waDigits(contatti && contatti.gianni && contatti.gianni.wa_numero);
      const msg = e.messaggio_whatsapp || `Buongiorno, vorrei prenotare: ${e.titolo}`;
      const tags = (e.tags || []).map((t, ti) =>
        `<span><i class="${esc(t.icona || 'fa-solid fa-check')}"></i><b class="cb-tag-text" data-cb="${p}.tags.${ti}.testo" data-cb-label="Caratteristica">${esc(t.testo)}</b></span>`).join('');
      return `
          <div class="story-chapter${hiddenCls(e)}" id="esperienza-${esc(e.id)}" data-cb-item="${p}" data-cb-kind="esperienza">
            <span class="eyebrow"><span class="exp-num">${pad2(i + 1)}</span><span data-cb="${p}.badge" data-cb-label="Etichetta">${esc(e.badge)}</span></span>
            <h2 class="h1" data-cb="${p}.titolo" data-cb-label="Titolo">${esc(e.titolo)}</h2>
            <div class="exp-price"><span data-cb="${p}.prezzo" data-cb-type="price-short" data-cb-label="Prezzo">${fmtPriceShort(e.prezzo)}</span> <span class="unit" data-cb="${p}.unita_prezzo" data-cb-label="Unità di prezzo">${esc(e.unita_prezzo)}</span></div>
            <p class="text" data-cb="${p}.descrizione" data-cb-label="Descrizione">${esc(e.descrizione)}</p>
            <div class="feature-list">${tags}</div>
            <div class="actions">
              <a href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" class="btn" target="_blank" rel="noopener">
                <i class="fa-brands fa-whatsapp"></i> <span data-cb="${p}.testo_pulsante" data-cb-label="Testo del pulsante">${esc(e.testo_pulsante || ('Prenota con ' + (e.referente_nome || 'noi')))}</span>
              </a>
            </div>
          </div>`;
    }).join('');
  }

  function renderGallery(agri) {
    const track = document.getElementById('galleryTrack');
    if (!track || !agri || !Array.isArray(agri.galleria)) return;
    const items = agri.galleria.slice().sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
    track.innerHTML = items.map((f, i) => {
      const p = 'agriturismo.galleria#' + f.id;
      const left = i % 2 === 0;
      return `
        <div class="photo-row grid" data-cb-item="${p}" data-cb-kind="foto">
          ${photoFig(f.immagine, (left ? 'fade-r' : 'fade-l') + ' fade-t fade-b', p + '.immagine', 'Foto', f.didascalia, f.immagine_pos)}
          <div class="copy">
            <span class="photo-num">${pad2(i + 1)}</span>
            <p class="caption" data-cb="${p}.didascalia" data-cb-label="Didascalia">${esc(f.didascalia)}</p>
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
                <p>Cell. ${esc(p.nome)}: <strong data-cb="contatti.${key}.telefono" data-cb-label="Telefono">${esc(p.telefono)}</strong></p>${p.email ? `<p><a href="mailto:${esc(p.email)}" data-cb="contatti.${key}.email" data-cb-label="Email">${esc(p.email)}</a></p>` : ''}
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
                <h4>Azienda Agricola ColBel di Teo Gianni</h4>
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
