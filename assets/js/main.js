/**
 * ColBel — interazioni e animazioni
 *
 * · header che si nasconde scorrendo, menu a schermo intero su telefono
 * · lingua ITA / ENG per i testi fissi
 * · modale d'ordine (WhatsApp / email) e modulo contatti
 * · animazioni GSAP: zoom lento e parallasse degli sfondi, titoli che emergono,
 *   sfumature che si intensificano, contatori, scrollytelling della bottiglia
 *
 * I contenuti arrivano da content.js (data/*.json): qui si aspetta che siano pronti.
 */
document.addEventListener('DOMContentLoaded', async () => {
  try { await window.colbelContentReady; } catch (e) { /* restano i contenuti statici */ }

  const C = window.ColBel || {};
  const EDIT = !!C.EDIT;
  const DATA = window.COLBEL_DATA || {};
  const contatti = DATA.contatti || {};
  const waGianni = String((contatti.gianni && contatti.gianni.wa_numero) || '393462443607').replace(/\D/g, '');
  const waLissa = String((contatti.lissa && contatti.lissa.wa_numero) || '393494356778').replace(/\D/g, '');
  const mailCantina = (contatti.azienda && contatti.azienda.email) || 'colbelwine@gmail.com';

  // Le animazioni fanno parte del racconto: restano attive anche se Windows/macOS hanno
  // "effetti di animazione" disattivati (prima questo le spegneva tutte).
  const reduceMotion = false;
  const isMobile = () => window.innerWidth <= 900;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // ---------------------------------------------------------------------------
  // 1. Header: sfondo sfumato dopo l'apertura, si nasconde scendendo
  // ---------------------------------------------------------------------------
  const header = document.querySelector('.site-header');
  let lastY = window.scrollY;
  const menuOverlay = document.getElementById('menuOverlay');
  const menuToggle = document.getElementById('mobileNavToggle');

  function onScroll() {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('scrolled', y > 40);
      const menuOpen = menuOverlay && menuOverlay.classList.contains('open');
      // Con lo scorrimento morbido ogni scatto arriva a piccoli passi: si decide la direzione
      // solo dopo 12px nello stesso verso (prima l'header lampeggiava e poi restava nascosto).
      const hidden = header.classList.contains('is-hidden');
      if (y < 300 || menuOpen) {
        header.classList.remove('is-hidden'); lastY = y;
      } else if (hidden) {
        if (y < lastY - 12) { header.classList.remove('is-hidden'); lastY = y; } else lastY = Math.max(lastY, y);
      } else {
        if (y > lastY + 12) { header.classList.add('is-hidden'); lastY = y; } else lastY = Math.min(lastY, y);
      }
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // In modifica i link fra le pagine mantengono ?modifica
  if (EDIT) {
    document.querySelectorAll('a[href$=".html"], a[href="index.html"]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!/^https?:/.test(href) && !href.includes('?')) a.setAttribute('href', href + '?modifica');
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Menu a schermo intero (telefono)
  // ---------------------------------------------------------------------------
  function setMenu(open) {
    if (!menuOverlay || !menuToggle) return;
    menuOverlay.classList.toggle('open', open);
    menuToggle.classList.toggle('open', open);
    menuOverlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && hasGsap && !reduceMotion) {
      gsap.fromTo(menuOverlay.querySelectorAll('nav a'), { yPercent: 60, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: 'expo.out', delay: 0.15 });
    }
  }
  if (menuToggle) menuToggle.addEventListener('click', () => setMenu(!menuOverlay.classList.contains('open')));
  if (menuOverlay) menuOverlay.querySelectorAll('nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setMenu(false); closeOrderModal(); } });

  // ---------------------------------------------------------------------------
  // 3. Lingua (solo testi fissi: i contenuti della dashboard restano in italiano)
  // ---------------------------------------------------------------------------
  const translations = {
    ita: {
      ab_1_big: 'Radici', ab_1_label: 'Solighetto', ab_1_text: 'Sul Colbel, il «bel colle» di Solighetto, la famiglia Teo coltiva la vite da generazioni: qui nasce il nostro prosecco.', ab_2_big: 'Davis', ab_2_label: "L'incontro", ab_3_label: 'Nasce ColBel',
      cta_wines: 'I nostri vini', cta_wines_label: 'Giusto, Angelo, Casa Nova, ColFondo',
      nav_home: 'Home', nav_about: 'Chi siamo', nav_territory: 'Territorio', footer_wines: 'Prodotti',
      nav_story: 'Chi siamo', nav_wines: 'Prodotti', nav_experiences: 'Esperienze', nav_agriturismo: 'Agriturismo',
      nav_contacts: 'Contatti', nav_order_now: 'Ordina vini',
      hero_btn_wines: 'Scopri i vini', hero_btn_exp: "Prenota un'esperienza", hero_scroll: 'Scorri',
      more_story: 'La nostra storia', scrolly_all_wines: 'Scopri i nostri vini',
      door_wines: 'Scopri tutti i vini', door_exp: 'Scegli la tua esperienza', door_agri: 'Entra in cucina',
      door_agri_text: "Pane a legna, salumi della cantina seicentesca e le conserve dell'orto. Nel weekend su prenotazione.",
      stats_label: 'ColBel in numeri', wine_order: 'Ordina',
      order_label: 'Come ordinare', order_title: 'Dalla nostra cantina alla tua tavola',
      order_lead: 'Scegli i vini, scrivici su WhatsApp o via email: ti rispondiamo noi con le istruzioni per pagamento e spedizione.',
      order_text: 'Spediamo in tutta Italia a partire da 6 bottiglie, anche miste. Prezzi IVA inclusa. Puoi anche passare a ritirarle in cantina a Solighetto, su appuntamento.',
      order_btn: 'Scrivi a Gianni', agri_btn: 'Prenota con Lissa', agri_hours_label: 'Quando venire', agri_hours_title: 'La spuntineria del weekend',
      form_label: 'Scrivici', form_name: 'Nome e cognome', form_name_ph: 'Mario Rossi', form_phone: 'Telefono', form_msg: 'Messaggio',
      form_msg_ph: 'Vorrei prenotare una degustazione per…', form_wa: 'Invia su WhatsApp', form_mail: 'Invia via email',
      footer_label: 'Solighetto · Treviso', footer_title: 'Vieni a trovarci sul bel colle', footer_explore: 'Esplora',
      modal_label: 'Ordine diretto dalla cantina', modal_qty: 'Quantità (minimo 6 bottiglie)',
      modal_hint: 'Scegli come inviarci la richiesta: ti rispondiamo con le istruzioni per pagamento e spedizione.',
      modal_wa_gianni: 'Invia a Gianni', modal_wa_lissa: 'Invia a Lissa', modal_email: 'Oppure via email',
      mob_call: 'Chiama', mob_order: 'Ordina',
      mark_story: 'Chi siamo', mark_territory: 'Territorio', mark_bottle: 'Giusto', mark_discover: 'ColBel Vineyards and Winery',
      mark_wines: 'Prodotti', mark_order: 'Contatti', mark_exp: 'Esperienze', mark_visit: 'Menù spuntineria',
      mark_gallery: 'La cucina di Lissa', st_ch2: 'Un enologo e una biologa', st_ch3: 'Nasce ColBel',
      gal_label: 'Dalla cucina di Lissa', gal_title: 'Sapori fatti in casa', gal_text: "Scorri: il pane, i salumi, l'orto e la sala degustazione.",
      exp_book_title: 'Scrivici, ti aspettiamo in cantina',
      idx_wines: 'Prosecco Superiore DOCG, Frizzanti e ColFondo, spediti dalla cantina.', idx_exp: 'Degustazioni, taglieri e passeggiate tra i filari.',
      idx_agri: 'Pane a legna, salumi e conserve della cucina di Lissa.', idx_story: 'La famiglia Teo e il bel colle di Solighetto.'
    },
    eng: {
      ab_1_big: 'Roots', ab_1_label: 'Solighetto', ab_1_text: 'On the Colbel, the “beautiful hill” of Solighetto, the Teo family has grown vines for generations: this is where our prosecco is born.', ab_2_big: 'Davis', ab_2_label: 'The meeting', ab_3_label: 'ColBel is born',
      cta_wines: 'Our wines', cta_wines_label: 'Giusto, Angelo, Casa Nova, ColFondo',
      nav_home: 'Home', nav_about: 'About us', nav_territory: 'Territory', footer_wines: 'Products',
      nav_story: 'About us', nav_wines: 'Products', nav_experiences: 'Experiences', nav_agriturismo: 'Agriturismo',
      nav_contacts: 'Contact us', nav_order_now: 'Order wine',
      hero_btn_wines: 'Discover the wines', hero_btn_exp: 'Book an experience', hero_scroll: 'Scroll',
      more_story: 'Our story', scrolly_all_wines: 'Discover our wines',
      door_wines: 'Discover all wines', door_exp: 'Choose your experience', door_agri: 'Step into the kitchen',
      door_agri_text: 'Wood-fired bread, cured meats from the 17th-century cellar and preserves from the garden. Weekends, by reservation.',
      stats_label: 'ColBel in numbers', wine_order: 'Order',
      order_label: 'How to order', order_title: 'From our cellar to your table',
      order_lead: 'Choose your wines and message us on WhatsApp or by email: we will reply with payment and shipping details.',
      order_text: 'We ship across Italy from 6 bottles, mixed cases welcome. Prices include VAT. You can also pick them up at the winery in Solighetto, by appointment.',
      order_btn: 'Message Gianni', agri_btn: 'Book with Lissa', agri_hours_label: 'When to visit', agri_hours_title: 'Weekend farm kitchen',
      form_label: 'Write to us', form_name: 'Full name', form_name_ph: 'John Smith', form_phone: 'Phone', form_msg: 'Message',
      form_msg_ph: 'I would like to book a tasting for…', form_wa: 'Send on WhatsApp', form_mail: 'Send by email',
      footer_label: 'Solighetto · Treviso', footer_title: 'Come visit us on the beautiful hill', footer_explore: 'Explore',
      modal_label: 'Order direct from the winery', modal_qty: 'Quantity (minimum 6 bottles)',
      modal_hint: 'Choose how to send your request: we will reply with payment and shipping details.',
      modal_wa_gianni: 'Send to Gianni', modal_wa_lissa: 'Send to Lissa', modal_email: 'Or by email',
      mob_call: 'Call', mob_order: 'Order',
      mark_story: 'About us', mark_territory: 'Territory', mark_bottle: 'Giusto', mark_discover: 'ColBel Vineyards and Winery',
      mark_wines: 'Products', mark_order: 'Contact us', mark_exp: 'Experiences', mark_visit: 'Menù spuntineria',
      mark_gallery: 'Lissa’s kitchen', st_ch2: 'A winemaker and a biologist', st_ch3: 'ColBel is born',
      gal_label: "From Lissa's kitchen", gal_title: 'Homemade flavours', gal_text: 'Scroll: bread, cured meats, the garden and the tasting room.',
      exp_book_title: 'Write to us, we will welcome you at the winery',
      idx_wines: 'Prosecco Superiore DOCG, sparkling wines and ColFondo, shipped from the winery.', idx_exp: 'Tastings, platters and walks among the vines.',
      idx_agri: "Wood-fired bread, cured meats and preserves from Lissa's kitchen.", idx_story: 'The Teo family and the beautiful hill of Solighetto.'
    }
  };
  let currentLang = 'ita';
  try { currentLang = localStorage.getItem('colbel_lang') || 'ita'; } catch (e) {}

  function applyLanguage(lang) {
    const dict = translations[lang];
    if (!dict) return;
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { const k = el.getAttribute('data-i18n'); if (dict[k]) el.textContent = dict[k]; });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { const k = el.getAttribute('data-i18n-placeholder'); if (dict[k]) el.setAttribute('placeholder', dict[k]); });
    document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-lang') === lang));
    const ll = document.getElementById('langCurrentLabel'); if (ll) ll.textContent = lang.toUpperCase();
    document.documentElement.lang = lang === 'ita' ? 'it' : 'en';
    try { localStorage.setItem('colbel_lang', lang); } catch (e) {}
    if (typeof updateModalTotal === 'function') updateModalTotal();
  }
  document.querySelectorAll('.lang-btn').forEach((b) => b.addEventListener('click', () => { applyLanguage(b.getAttribute('data-lang')); closeLangMenu(); }));
  // menu a tendina delle lingue (pronto per aggiungerne altre: basta un altro <button class="lang-btn" data-lang="…">)
  const langMenu = document.getElementById('langMenu');
  const langCurrent = document.getElementById('langCurrent');
  function closeLangMenu() { if (langMenu) { langMenu.classList.remove('open'); langCurrent && langCurrent.setAttribute('aria-expanded', 'false'); } }
  if (langMenu && langCurrent) {
    langCurrent.addEventListener('click', (e) => { e.stopPropagation(); const o = langMenu.classList.toggle('open'); langCurrent.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    document.addEventListener('click', (e) => { if (!langMenu.contains(e.target)) closeLangMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLangMenu(); });
  }

  // ---------------------------------------------------------------------------
  // 4. Modale d'ordine
  // ---------------------------------------------------------------------------
  const modal = document.getElementById('orderModal');
  const qtyInput = document.getElementById('bottleQty');
  const presets = document.querySelectorAll('.preset-pill');
  let activeWine = { name: 'Prosecco DOCG', price: 11.9 };
  const eur = (n) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  window.openOrderModal = function (name, price) {
    activeWine = { name, price: parseFloat(price) || 0 };
    document.getElementById('modalWineTitle').textContent = name;
    document.getElementById('modalWinePrice').textContent = `${eur(activeWine.price)} € / bottiglia`;
    if (qtyInput) qtyInput.value = 6;
    setPreset(6);
    updateModalTotal();
    if (modal) { modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  };
  function closeOrderModal() {
    if (!modal || !modal.classList.contains('active')) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function setPreset(q) { presets.forEach((p) => p.classList.toggle('active', parseInt(p.dataset.qty, 10) === q)); }
  function updateModalTotal() {
    if (!qtyInput) return;
    const qty = Math.max(6, parseInt(qtyInput.value, 10) || 6);
    qtyInput.value = qty;
    const total = qty * activeWine.price;
    const totEl = document.getElementById('modalTotalCalc');
    if (totEl) totEl.textContent = (currentLang === 'ita' ? 'Totale indicativo: ' : 'Estimated total: ') + eur(total) + ' € (IVA incl.)';
    const msg = currentLang === 'ita'
      ? `Buongiorno! Vorrei ordinare ${qty} bottiglie di "${activeWine.name}" (totale stimato: ${eur(total)} €). Potete darmi informazioni per la spedizione? Grazie!`
      : `Hello! I would like to order ${qty} bottles of "${activeWine.name}" (estimated total: ${eur(total)} €). Could you send me the shipping details? Thank you!`;
    const g = document.getElementById('btnWaGianni');
    const l = document.getElementById('btnWaLissa');
    const m = document.getElementById('btnEmailOrder');
    if (g) g.href = `https://wa.me/${waGianni}?text=${encodeURIComponent(msg)}`;
    if (l) l.href = `https://wa.me/${waLissa}?text=${encodeURIComponent(msg)}`;
    if (m) m.href = `mailto:${mailCantina}?subject=${encodeURIComponent('Richiesta ordine: ' + activeWine.name)}&body=${encodeURIComponent(msg)}`;
  }
  const step = (d) => { const v = Math.max(6, (parseInt(qtyInput.value, 10) || 6) + d); qtyInput.value = v; setPreset(v); updateModalTotal(); };
  const qm = document.getElementById('qtyMinus');
  const qp = document.getElementById('qtyPlus');
  if (qm) qm.addEventListener('click', () => step(-6));
  if (qp) qp.addEventListener('click', () => step(6));
  presets.forEach((p) => p.addEventListener('click', () => { const q = parseInt(p.dataset.qty, 10); qtyInput.value = q; setPreset(q); updateModalTotal(); }));
  const closeBtn = document.querySelector('.modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeOrderModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeOrderModal(); });

  // ---------------------------------------------------------------------------
  // 5. Modulo contatti
  // ---------------------------------------------------------------------------
  const val = (id) => (document.getElementById(id) || {}).value || '';
  const formText = () => `Richiesta dal sito ColBel:\nNome: ${val('c_name')}\nEmail: ${val('c_email')}\nTel: ${val('c_phone')}\nMessaggio: ${val('c_msg')}`;
  const sendWa = document.getElementById('sendFormWa');
  const sendMail = document.getElementById('sendFormMail');
  if (sendWa) sendWa.addEventListener('click', (e) => { e.preventDefault(); window.open(`https://wa.me/${waGianni}?text=${encodeURIComponent(formText())}`, '_blank'); });
  if (sendMail) sendMail.addEventListener('click', (e) => { e.preventDefault(); location.href = `mailto:${mailCantina}?subject=${encodeURIComponent('Richiesta ColBel da ' + (val('c_name') || 'Cliente'))}&body=${encodeURIComponent(formText())}`; });

  applyLanguage(currentLang);

  // Titoli dei vini su una sola riga: se non ci stanno, il carattere si riduce quanto basta
  function fitWineTitles() {
    document.querySelectorAll('.wine-info .h2').forEach((t) => {
      t.style.fontSize = '';
      const box = t.parentElement.clientWidth;
      let size = parseFloat(getComputedStyle(t).fontSize);
      while (t.scrollWidth > box && size > 22) { size -= 1; t.style.fontSize = size + 'px'; }
    });
  }
  // Titoli a tutta larghezza: il carattere si adatta per riempire esattamente la riga
  function fitLines() {
    document.querySelectorAll('.fit-line').forEach((t) => {
      t.classList.remove('is-wrap');
      if (window.innerWidth <= 900) { t.style.fontSize = ''; t.classList.add('is-wrap'); return; }
      t.style.fontSize = '100px';
      const cs = getComputedStyle(t.parentElement);
      const avail = t.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const w = t.getBoundingClientRect().width || 1;
      let size = Math.min(230, 100 * avail / w) * 0.99;
      if (size < 34) { t.classList.add('is-wrap'); size = 40; }
      t.style.fontSize = size + 'px';
    });
  }
  fitLines();
  window.addEventListener('resize', fitLines);
  document.addEventListener('colbel:rendered', fitLines);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLines);
  fitWineTitles();
  window.addEventListener('resize', fitWineTitles);
  document.addEventListener('colbel:rendered', fitWineTitles);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWineTitles);

  // ---------------------------------------------------------------------------
  // 6. Animazioni
  // ---------------------------------------------------------------------------
  if (!hasGsap) return;
  const desktop = () => window.innerWidth > 900;
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // --- 6a. Scorrimento morbido (Lenis) sincronizzato con ScrollTrigger ---
  let lenis = null;
  if (window.Lenis && !EDIT) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // menu e finestra d'ordine aperti: la pagina sotto resta ferma
    const watch = (el) => el && new MutationObserver(() => {
      const open = (modal && modal.classList.contains('active')) || (menuOverlay && menuOverlay.classList.contains('open'));
      if (open) lenis.stop(); else lenis.start();
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
    watch(modal); watch(menuOverlay);
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1 && document.querySelector(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -20, duration: 1.6 }); }
    }));
  }

  // --- 6b. Sipario tra una pagina e l'altra ---
  if (!EDIT) {
    const curtain = document.createElement('div');
    curtain.className = 'page-curtain';
    curtain.innerHTML = '<img src="assets/images/logo.png" alt="" />';
    document.body.appendChild(curtain);
    gsap.set(curtain, { yPercent: 0 });
    gsap.to(curtain, { yPercent: -100, duration: 1.1, ease: 'expo.inOut', delay: 0.05 });
    gsap.fromTo(curtain.querySelector('img'), { opacity: 1 }, { opacity: 0, duration: 0.4 });
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const href = a.getAttribute('href');
      if (!/^[\w-]+\.html(#.*)?$/.test(href) && href !== 'index.html') return;
      const [file, hash] = href.split('#');
      const here = (location.pathname.split('/').pop() || 'index.html');
      if (hash && file === here && document.getElementById(hash)) {
        e.preventDefault();
        if (lenis) lenis.scrollTo('#' + hash, { offset: -20, duration: 1.6 }); else document.getElementById(hash).scrollIntoView({ behavior: 'smooth' });
        return;
      }
      e.preventDefault();
      gsap.fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: 0.75, ease: 'expo.in', onComplete: () => { location.href = href; } });
      gsap.fromTo(curtain.querySelector('img'), { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.5 });
    });
    window.addEventListener('pageshow', (ev) => { if (ev.persisted) gsap.set(curtain, { yPercent: -100 }); });
  }

  // Divide un titolo in righe (per farle emergere una alla volta)
  function splitLines(el) {
    if (!el || EDIT) return null;
    if (el.dataset.split || el.isContentEditable || el.children.length) return el.dataset.split ? el.querySelectorAll('.line-inner') : null;
    const words = el.textContent.trim().split(/\s+/);
    if (!words.length || !words[0]) return null;
    el.innerHTML = words.map((w) => `<span class="w" style="display:inline-block">${esc(w)}</span>`).join(' ');
    const spans = Array.from(el.querySelectorAll('.w'));
    const lines = [];
    let top = null;
    spans.forEach((s) => {
      if (top === null || Math.abs(s.offsetTop - top) > 4) { lines.push([]); top = s.offsetTop; }
      lines[lines.length - 1].push(s.textContent);
    });
    el.innerHTML = lines.map((l) => `<span class="reveal-line"><span class="line-inner">${esc(l.join(' '))}</span></span>`).join('');
    el.dataset.split = '1';
    return el.querySelectorAll('.line-inner');
  }

  const sideOf = (fig) => (fig.classList.contains('fade-l') ? 'right' : fig.classList.contains('fade-r') ? 'left' : 'center');
  const clipFrom = { right: 'inset(0% 0% 0% 72%)', left: 'inset(0% 72% 0% 0%)', center: 'inset(18% 22% 18% 22%)' };

  // --- 6c. Apertura: la foto si apre come un sipario e poi accompagna lo scroll ---
  function initHero() {
    document.querySelectorAll('.hero, .page-hero').forEach((hero) => {
      const fig = hero.querySelector('[data-photo]');
      const img = fig && fig.querySelector('img');
      const copy = hero.querySelector('.copy');
      const tl = gsap.timeline({ delay: EDIT ? 0 : 0.55 });
      if (fig && !EDIT) {
        tl.fromTo(fig, { clipPath: clipFrom[sideOf(fig)] }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: 'expo.inOut' }, 0);
        tl.fromTo(img, { scale: 1.4 }, { scale: 1, duration: 2.6, ease: 'expo.out' }, 0.2);
      }
      if (copy && !EDIT) {
        const titles = copy.querySelectorAll('.h1, .display');
        titles.forEach((t) => { const l = splitLines(t); if (l) tl.from(l, { yPercent: 110, duration: 1.4, stagger: 0.1, ease: 'expo.out' }, 0.7); });
        const rest = copy.querySelectorAll('.hero-logo, .hero-claim, .eyebrow, .lead, .text, .actions');
        tl.from(rest, { y: 40, opacity: 0, duration: 1.3, stagger: 0.08, ease: 'expo.out' }, 0.8);
      }
      if (img) {
        gsap.to(img, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      }
      if (copy && !EDIT) {
        gsap.to(copy, { y: -140, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '25% top', end: 'bottom top', scrub: true } });
      }
      // la foto segue appena il mouse
      if (img && desktop()) {
        const xTo = gsap.quickTo(img, 'x', { duration: 1.2, ease: 'power3' });
        const rTo = gsap.quickTo(img, 'rotation', { duration: 1.2, ease: 'power3' });
        hero.addEventListener('mousemove', (e) => {
          const nx = e.clientX / window.innerWidth - 0.5;
          xTo(nx * -30); rTo(nx * 0.6);
        });
      }
    });
  }

  // --- 6d. Foto nel racconto: si aprono dal bordo della pagina mentre scorri ---
  function initPhotos() {
    document.querySelectorAll('[data-photo]').forEach((fig) => {
      if (fig.closest('.hero, .page-hero, .band, .index-photos, .story, .h-gallery, .wide-hero')) return;
      const img = fig.querySelector('img');
      if (!img) return;
      if (!EDIT) {
        gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 98%', end: 'top 30%', scrub: 0.8 } })
          .fromTo(fig, { clipPath: clipFrom[sideOf(fig)] }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out' }, 0)
          .fromTo(img, { scale: 1.4 }, { scale: 1, ease: 'power2.out' }, 0);
      }
      gsap.fromTo(img, { yPercent: -9 }, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  // --- 6e. Il secondo momento fermo: il territorio si "allontana" e il titolo sale ---
  function initBands() {
    document.querySelectorAll('.band').forEach((band) => {
      const stage = band.querySelector('.grid');
      const fig = stage.querySelector('[data-photo]');
      const img = fig && fig.querySelector('img');
      const title = stage.querySelector('.display');
      const eyebrow = stage.querySelector('.eyebrow');
      const lines = title && !EDIT ? splitLines(title) : null;
      if (EDIT || !img) return;
      if (desktop()) {
        const tl = gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top top', end: '+=110%', pin: true, scrub: 0.8, anticipatePin: 1 } });
        tl.fromTo(img, { scale: 1.55 }, { scale: 1, ease: 'none', duration: 1 }, 0);
        if (lines) tl.fromTo(lines, { yPercent: 115 }, { yPercent: 0, stagger: 0.12, duration: 0.5, ease: 'power3.out' }, 0.35);
        if (eyebrow) tl.fromTo(eyebrow, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.4 }, 0.3);
        if (title) tl.to(title, { x: '-3vw', duration: 1, ease: 'none' }, 0);
      } else {
        gsap.fromTo(img, { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
        if (lines) gsap.from(lines, { yPercent: 110, stagger: 0.1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: title, start: 'top 90%', once: true } });
      }
    });
  }

  // --- 6f. Nastro di parole che scorre con lo scroll ---
  function initMarquees() {
    // scorrono sempre piano da sole; quando scorri la pagina accelerano nella direzione dello scroll
    const items = Array.from(document.querySelectorAll('.marquee')).map((m) => ({
      track: m.querySelector('.marquee-track'), dir: m.dataset.dir === 'right' ? 1 : -1, x: 0, half: 0
    })).filter((o) => o.track);
    if (!items.length) return;
    const measure = () => items.forEach((o) => { o.half = o.track.scrollWidth / 2; });
    measure(); window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    let lastY = window.scrollY, boost = 0;
    gsap.ticker.add((time, dt) => {
      const y = window.scrollY, dy = y - lastY; lastY = y;
      boost += (Math.min(60, Math.abs(dy)) * 9 - boost) * 0.08;
      const v = (34 + boost) * (dt / 1000);
      items.forEach((o) => {
        if (!o.half) return;
        o.x += o.dir * v;
        if (o.x <= -o.half) o.x += o.half;
        if (o.x > 0) o.x -= o.half;
        o.track.style.transform = 'translate3d(' + o.x.toFixed(2) + 'px,0,0)';
      });
    });
  }

  // --- 6g. Testi che emergono ---
  function initReveals() {
    const blocks = Array.from(document.querySelectorAll('[data-reveal], .exp-row .col, .photo-row .copy, .footer-top'))
      .filter((b) => !b.closest('.hero, .page-hero, .story, .h-gallery') && !b.closest('.band > .grid:first-child'));
    blocks.forEach((box) => {
      const titles = Array.from(box.querySelectorAll('.display, .h1, .h2, .quote, .caption'));
      const rest = Array.from(box.querySelectorAll('.eyebrow, .lead, .text, .stats, .actions, .exp-price, .feature-list > span, .field, .contact-freestyle-item, .small, .tipo, .denominazione, .price-row, .photo-num, .index-item, .footer-col ul, .footer-social'))
        .filter((el) => !titles.some((t) => t.contains(el)));
      const tl = gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 86%', once: true } });
      titles.forEach((t) => {
        const lines = splitLines(t);
        if (lines) tl.from(lines, { yPercent: 115, rotate: 2, duration: 1.4, stagger: 0.1, ease: 'expo.out' }, 0);
        else tl.from(t, { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0);
      });
      if (rest.length) tl.from(rest, { y: 36, opacity: 0, duration: 1.2, stagger: 0.07, ease: 'expo.out' }, 0.18);
    });
    // la linea delle etichette si disegna
    document.querySelectorAll('.eyebrow').forEach((e) => {
      if (e.closest('.hero, .page-hero')) return;
      gsap.fromTo(e, { '--line': 0 }, { '--line': 1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: e, start: 'top 90%', once: true } });
    });
  }

  // --- 6h. Contatori dei numeri chiave ---
  function initCounters() {
    document.querySelectorAll('.stat-num').forEach((el) => {
      if (el.closest('.story')) return;
      const target = el.querySelector('[data-cb]') || el;
      const m = target.textContent.trim().match(/^(\d+)(.*)$/);
      if (!m) return;
      const end = parseInt(m[1], 10);
      const suffix = m[2];
      const o = { v: end > 1900 ? end - 60 : 0 };
      gsap.to(o, {
        v: end, duration: 2.4, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: () => { target.textContent = Math.round(o.v) + suffix; }
      });
    });
  }

  // --- 6i. Vini: le bottiglie salgono, si inclinano e il numero scorre dietro ---
  function initWines() {
    // sfilata alternata: la bottiglia entra dal bordo estremo del suo lato, il testo dal lato opposto
    document.querySelectorAll('.wine-row').forEach((row) => {
      const img = row.querySelector('.wine-bottle img');
      const halo = row.querySelector('.wine-halo');
      const info = row.querySelector('.wine-info');
      const s = row.classList.contains('is-left') ? -1 : 1;
      const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 20%', scrub: 0.8 } });
      if (img) tl.fromTo(img, { x: () => s * window.innerWidth * 0.45, rotate: 14 * s, opacity: 0 }, { x: 0, rotate: 0, opacity: 1, ease: 'power3.out' }, 0);
      if (halo) tl.fromTo(halo, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, ease: 'power2.out' }, 0.1);
      if (info) tl.fromTo(info.children, { x: () => -s * 120, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.08, ease: 'power3.out' }, 0.1);
      // poi la bottiglia galleggia appena mentre la riga esce
      if (img) gsap.fromTo(img, { yPercent: 0 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: row, start: 'top top', end: 'bottom top', scrub: true } });
    });
  }

  // --- 6j. Indice della home ---
  function initIndex() {
    const items = document.querySelectorAll('.index-item');
    const photos = document.querySelectorAll('.index-photos .photo');
    const show = (i) => {
      items.forEach((x) => x.classList.toggle('active', x.dataset.index === i));
      photos.forEach((ph) => {
        const on = ph.dataset.index === i;
        ph.classList.toggle('active', on);
        if (on) gsap.fromTo(ph.querySelector('img'), { scale: 1.18 }, { scale: 1, duration: 1.6, ease: 'expo.out' });
      });
    };
    items.forEach((it) => it.addEventListener('mouseenter', () => show(it.dataset.index)));
    const box = document.querySelector('.index-photos');
    if (box && !EDIT) {
      gsap.fromTo(box, { clipPath: 'inset(0% 0% 0% 72%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', scrollTrigger: { trigger: box, start: 'top 95%', end: 'top 35%', scrub: 0.8 } });
    }
  }

  // --- 6k. Scrollytelling della bottiglia ---
  function initBottleStory() {
    const story = document.getElementById('bottiglia');
    if (!story) return;
    const stage = document.getElementById('bottleStage');
    const img = stage.querySelector('.bottle-img');
    const sheen = stage.querySelector('.bottle-sheen');
    const steps = Array.from(story.querySelectorAll('.story-step'));
    const bars = Array.from(story.querySelectorAll('.story-progress i'));
    const word = story.querySelector('.story-word');
    const N = steps.length;

    const setMask = () => { const u = `url("${img.currentSrc || img.src}")`; sheen.style.webkitMaskImage = u; sheen.style.maskImage = u; };
    if (img.complete) setMask(); else img.addEventListener('load', setMask, { once: true });

    // Sequenza di fotogrammi (video della bottiglia senza sfondo), se presente
    const frameCount = parseInt(stage.dataset.frames || '0', 10);
    let drawFrame = null;
    if (frameCount > 1) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      stage.insertBefore(canvas, img);
      stage.classList.add('has-frames');
      const pad = parseInt(stage.dataset.framesPad || '4', 10);
      const src = (i) => stage.dataset.framesSrc.replace('{n}', String(i + 1).padStart(pad, '0'));
      const frames = [];
      let current = -1;
      const render = (i) => {
        const f = frames[i];
        if (!f || !f.complete || !f.naturalWidth) return;
        if (canvas.width !== f.naturalWidth) { canvas.width = f.naturalWidth; canvas.height = f.naturalHeight; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(f, 0, 0);
        current = i;
      };
      for (let i = 0; i < frameCount; i++) {
        const im = new Image();
        im.src = src(i);
        if (i === 0) im.onload = () => render(0);
        frames.push(im);
      }
      drawFrame = (p) => { const i = Math.min(frameCount - 1, Math.round(p * (frameCount - 1))); if (i !== current) render(i); };
    }

    // Suddivisione in parole per animazione fluida parola per parola
    function prepareStepTokens(step) {
      const els = step.querySelectorAll('h3, p');
      const tokens = [];
      els.forEach((el) => {
        let spans = el.querySelectorAll('.story-word-token');
        if (!spans.length) {
          const raw = el.textContent.trim();
          if (!raw) return;
          const words = raw.split(/\s+/);
          el.innerHTML = words.map((w) => `<span class="story-word-token">${w}</span>`).join(' ');
          spans = el.querySelectorAll('.story-word-token');
        }
        tokens.push(...Array.from(spans));
      });
      return tokens;
    }
    const stepTokens = steps.map((s) => prepareStepTokens(s));

    // prima di fermarsi: la bottiglia sale dal basso
    gsap.fromTo(stage, { y: '35vh', scale: 0.8, opacity: 0.2 }, {
      y: 0, scale: 1, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: story, start: 'top bottom', end: 'top top', scrub: 0.6 }
    });
    if (word) gsap.fromTo(word, { xPercent: -20 }, { xPercent: -50, ease: 'none', scrollTrigger: { trigger: story, start: 'top bottom', end: 'top top', scrub: true } });

    // Step 0 visibile con parole inizialmente soffuse; gli altri step partono trasparenti
    gsap.set(steps[0], { autoAlpha: 1, y: 0, opacity: 1 });
    if (stepTokens[0]) gsap.set(stepTokens[0], { opacity: 0.22, y: 6 });
    steps.slice(1).forEach((s, idx) => {
      gsap.set(s, { autoAlpha: 0, y: 22, opacity: 1 });
      if (stepTokens[idx + 1]) gsap.set(stepTokens[idx + 1], { opacity: 0.22, y: 6 });
    });

    // La sezione resta ferma con position: sticky (CSS) - scorrimento serrato senza tempi morti
    story.style.setProperty('--bottle-steps', N);
    const totalDuration = 3.0;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: story,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.55,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (drawFrame) drawFrame(self.progress);
          bars.forEach((b, i) => gsap.set(b, { scaleX: Math.min(1, Math.max(0, self.progress * N - i)) }));
        }
      }
    });

    if (!drawFrame) {
      // Rotazione simulata della bottiglia a sinistra
      tl.fromTo(img, { rotateY: -35, rotateZ: -3 }, { rotateY: 35, rotateZ: 3, duration: totalDuration / 2, ease: 'sine.inOut' }, 0);
      tl.to(img, { rotateY: -15, rotateZ: -1 }, { rotateY: 0, rotateZ: 0, duration: totalDuration / 2, ease: 'sine.inOut' }, totalDuration / 2);
      tl.fromTo(sheen, { backgroundPosition: '110% 0' }, { backgroundPosition: '-60% 0', duration: totalDuration / 2 }, 0);
      tl.fromTo(sheen, { backgroundPosition: '110% 0' }, { backgroundPosition: '-60% 0', duration: totalDuration / 2, immediateRender: false }, totalDuration / 2);
    }
    tl.fromTo(stage, { scale: 1 }, { scale: 1.05, duration: totalDuration }, 0);
    if (word) tl.fromTo(word, { xPercent: -20 }, { xPercent: -45, duration: totalDuration }, 0);

    // Animazione fluida parola per parola e transizione immediata tra le frasi
    // Step 0: le parole si accendono in sequenza all'inizio dello scroll
    if (stepTokens[0] && stepTokens[0].length) {
      tl.to(stepTokens[0], { opacity: 1, y: 0, stagger: 0.045, duration: 0.3, ease: 'power1.out' }, 0.04);
    }

    // Step 1: entra subito dopo Step 0 senza tempi morti (a t = 0.92)
    if (steps[1]) {
      tl.to(steps[0], { opacity: 0.42, duration: 0.28, ease: 'power1.out' }, 0.90);
      tl.fromTo(steps[1], { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.92);
      if (stepTokens[1] && stepTokens[1].length) {
        tl.to(stepTokens[1], { opacity: 1, y: 0, stagger: 0.025, duration: 0.26, ease: 'power1.out' }, 0.98);
      }
    }

    // Step 2: entra subito dopo Step 1 (a t = 1.88)
    if (steps[2]) {
      tl.to(steps[1], { opacity: 0.42, duration: 0.28, ease: 'power1.out' }, 1.84);
      tl.fromTo(steps[2], { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 1.88);
      if (stepTokens[2] && stepTokens[2].length) {
        tl.to(stepTokens[2], { opacity: 1, y: 0, stagger: 0.025, duration: 0.26, ease: 'power1.out' }, 1.94);
      }
      const cta = steps[2].querySelector('.actions');
      if (cta) {
        tl.fromTo(cta, { autoAlpha: 0, y: 15 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out' }, 2.65);
      }
    }

    // Piccolo margine finale prima dell'uscita
    tl.to({}, { duration: 0.2 }, totalDuration);
  }


  // --- 6l. Segnacapitolo: la linea si disegna e il numero entra ---
  function initMarks() {
    document.querySelectorAll('[data-mark]').forEach((m) => {
      const line = m.querySelector('.cm-line');
      gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: m, start: 'top 92%', end: 'top 55%', scrub: 0.6 } });
      gsap.from(m.querySelectorAll('.cm-num, .cm-label'), { y: 24, opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: m, start: 'top 90%', once: true } });
    });
  }

  // --- 6m. Blocchi di scrollytelling: la foto resta ferma, i capitoli scorrono ---
  function initStories() {
    document.querySelectorAll('[data-story]').forEach((story) => {
      const pin = story.querySelector('.story-pin');
      const media = Array.from(story.querySelectorAll('.story-track > .photo'));
      const texts = Array.from(story.querySelectorAll('.story-texts > .story-chapter'));
      const N = texts.length;
      const dotsBox = story.querySelector('.story-dots');
      const count = story.querySelector('.story-count');
      if (dotsBox) dotsBox.innerHTML = texts.map(() => '<span><i></i></span>').join('');
      if (count) count.textContent = `01 / ${pad(N)}`;
      if (EDIT || N < 1) { story.classList.add('is-static'); return; }
      const bars = Array.from(story.querySelectorAll('.story-dots i'));
      const mediaBox = story.querySelector('.story-media');
      const track = story.querySelector('.story-track');
      gsap.set(texts.slice(1), { autoAlpha: 0 });

      // posizione della colonna: la foto i-esima al centro della sua area
      const step = () => (media[1] ? media[1].offsetTop - media[0].offsetTop : 0);
      const startY = () => (media[0] ? (mediaBox.clientHeight - media[0].offsetHeight) / 2 : 0);
      if (track) gsap.set(track, { y: startY() });

      // ingresso: la colonna sale dal basso e il primo capitolo emerge
      if (mediaBox) gsap.fromTo(mediaBox, { yPercent: 35, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: story, start: 'top 95%', end: 'top top', scrub: 0.6 } });
      const first = texts[0];
      const ft = gsap.timeline({ scrollTrigger: { trigger: story, start: 'top 60%', once: true } });
      first.querySelectorAll('.h1, .h2').forEach((t) => { const l = splitLines(t); if (l) ft.from(l, { yPercent: 115, duration: 1.3, stagger: 0.1, ease: 'expo.out' }, 0); });
      ft.from(Array.from(first.children).filter((c) => !c.matches('.h1, .h2')), { y: 30, opacity: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out' }, 0.15);

      const M = Math.max(N, media.length);
      let last = -1;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: story.querySelector('.story-pin'), start: 'top top', end: () => '+=' + window.innerHeight * (M - 0.3),
          pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress * N;
            bars.forEach((b, i) => gsap.set(b, { scaleX: Math.min(1, Math.max(0, p - i)) }));
            const cur = Math.min(N - 1, Math.floor(self.progress * N * 0.999 + 0.3));
            if (count && cur !== last) { count.textContent = `${pad(cur + 1)} / ${pad(N)}`; last = cur; }
          }
        }
      });
      // la colonna di foto scorre di continuo: ogni foto passa al centro quando arriva il suo capitolo
      if (track && media.length > 1) {
        tl.fromTo(track, { y: () => startY() }, { y: () => startY() - step() * (media.length - 1), duration: media.length - 1 }, 0);
      }
      media.forEach((m, i) => {
        const img = m.querySelector('img');
        if (img) tl.fromTo(img, { yPercent: i === 0 ? 0 : 9 }, { yPercent: -9, duration: i === 0 ? 1 : 2 }, Math.max(0, i - 1));
        if (i > 0) tl.fromTo(m, { opacity: 0.35 }, { opacity: 1, duration: 0.5 }, i - 0.6);
        if (i < media.length - 1) tl.to(m, { opacity: 0.35, duration: 0.5 }, i + 0.4);
      });
      texts.forEach((t, i) => {
        const titles = Array.from(t.querySelectorAll('.h1, .h2'));
        const lines = i > 0 ? titles.map((x) => splitLines(x)).filter(Boolean) : [];
        if (i === 0) return;
        const at = i - 0.55;
        tl.to(texts[i - 1], { autoAlpha: 0, y: -60, duration: 0.3 }, at);
        tl.fromTo(t, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.35 }, at + 0.25);
        lines.forEach((l) => tl.fromTo(l, { yPercent: 115 }, { yPercent: 0, stagger: 0.06, duration: 0.35 }, at + 0.28));
      });
      tl.to({}, { duration: 0.4 });
    });
  }
  const pad = (n) => String(n).padStart(2, '0');

  // --- 6n. Rullino orizzontale: scorrendo in giù le foto passano di lato ---
  function initHGallery() {
    const g = document.querySelector('.h-gallery');
    if (!g) return;
    if (EDIT) { g.classList.add('is-static'); return; }
    if (!desktop()) return; // su telefono si sfoglia col dito
    const inner = g.querySelector('.h-inner');
    const dist = () => Math.max(0, inner.scrollWidth - window.innerWidth);
    const tween = gsap.to(inner, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: g, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true }
    });
    g.querySelectorAll('.photo-row').forEach((row) => {
      const img = row.querySelector('img');
      const cap = row.querySelector('.copy');
      if (img) gsap.fromTo(img, { xPercent: -6, scale: 1.15 }, { xPercent: 6, scale: 1, ease: 'none', scrollTrigger: { trigger: row, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      if (cap) gsap.from(cap, { y: 50, opacity: 0, ease: 'none', scrollTrigger: { trigger: row, containerAnimation: tween, start: 'left 85%', end: 'left 40%', scrub: true } });
    });
  }


  // --- Apertura della home: la foto si avvicina e si allontana piano, di continuo ---
  function initHeroFull() {
    const hero = document.querySelector('.hero-full');
    if (!hero) return;
    const bg = hero.querySelector('.hero-full__bg');
    const img = bg.querySelector('img');
    const logo = hero.querySelector('.hero-logo');
    const shade = hero.querySelector('.hero-full__shade');
    // respiro continuo (come nell'originale, ma più morbido)
    gsap.fromTo(img, { scale: 1.22 }, {
      scale: 1, duration: 3.2, ease: 'expo.out', delay: EDIT ? 0 : 0.3,
      onComplete: () => gsap.to(img, { scale: 1.12, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    });
    if (!EDIT && logo) gsap.from(logo, { y: 40, opacity: 0, scale: 0.94, duration: 1.8, ease: 'expo.out', delay: 0.9 });
    // scorrendo: la foto scende più lenta, il logo sale e sfuma, l'ombra si chiude
    gsap.to(bg, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    // il logo resta visibile: sale piano e sfuma solo quando l'apertura sta uscendo dallo schermo
    // (fromTo esplicito: prima partiva dall'opacità 0 dell'animazione d'ingresso e spariva al primo scatto)
    if (logo && !EDIT) gsap.fromTo(logo.parentElement, { y: 0, opacity: 1 }, { y: -90, opacity: 0, ease: 'power1.in', immediateRender: false, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    if (shade) gsap.fromTo(shade, { opacity: 1 }, { opacity: 1, backgroundColor: 'rgba(13,12,10,0.55)', ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    if (desktop()) {
      const xTo = gsap.quickTo(bg, 'x', { duration: 1.4, ease: 'power3' });
      hero.addEventListener('mousemove', (e) => xTo((e.clientX / window.innerWidth - 0.5) * -24));
    }
  }


  // --- Bollicine dorate: salgono di continuo solo nella zona delle bottiglie ---
  //     nascono in fondo all'elenco dei vini e svaniscono piano arrivando alla riga "01 — Le bottiglie";
  //     quando giri la rotella ne escono di più e salgono più veloci
  function initBubbles() {
    const host = document.querySelector('main[data-bubbles]');
    const list = document.getElementById('winesRunwayView');
    if (!host || !list) return;
    const topEl = list.previousElementSibling && list.previousElementSibling.matches('.chapter-mark') ? list.previousElementSibling : list;
    const cv = document.createElement('canvas');
    cv.className = 'bubbles-canvas';
    cv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(cv, host);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const resize = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); addEventListener('resize', resize);
    const FADE_TOP = 260, FADE_BOTTOM = 160;
    const MAX = innerWidth < 900 ? 90 : 200;
    const B = []; // posizioni nella pagina (non nello schermo): le bollicine "abitano" la zona dei vini
    const zone = () => {
      const t = topEl.getBoundingClientRect().top + scrollY + topEl.offsetHeight * 0.5;
      const bt = list.getBoundingClientRect().bottom + scrollY;
      return [t, bt];
    };
    const make = (y) => {
      const r = Math.random() < 0.8 ? 1.2 + Math.random() * 3 : 4 + Math.random() * 5;
      return { x: Math.random() * W, y, r, vy: 0.35 + Math.random() * 0.9 + (5 - Math.min(r, 5)) * 0.08,
               w: Math.random() * Math.PI * 2, ws: 0.01 + Math.random() * 0.025, wa: 0.3 + Math.random() * 0.9,
               a: 0, max: 0.35 + Math.random() * 0.5 };
    };
    // nascono appena sotto il bordo dello schermo, ma mai oltre la fine dell'elenco dei vini
    const spawn = (n, spread) => {
      const [zt, zb] = zone();
      const view0 = scrollY, view1 = scrollY + H;
      if (zb < view0 || zt > view1) return;
      for (let i = 0; i < n && B.length < MAX; i++) {
        const base = Math.min(zb, view1 + 10);
        const y = spread ? Math.max(zt, view0) + Math.random() * (base - Math.max(zt, view0)) : base - Math.random() * 40;
        B.push(make(y));
      }
    };
    let lastY = scrollY, boost = 0;
    addEventListener('scroll', () => {
      const dy = scrollY - lastY; lastY = scrollY;
      const n = Math.min(10, Math.round(Math.abs(dy) / 14));
      if (n) spawn(n, true);
      boost = Math.min(4, boost + Math.abs(dy) / 120);
    }, { passive: true });
    spawn(30, true);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const [zt, zb] = zone();
      if (Math.random() < 0.12) spawn(1, false);
      for (let i = B.length - 1; i >= 0; i--) {
        const b = B[i];
        b.w += b.ws;
        b.y -= b.vy * (1 + boost);
        b.x += Math.sin(b.w) * b.wa * 0.4;
        b.a = Math.min(b.max, b.a + 0.02);
        if (b.y < zt || b.y > zb + 50) { B.splice(i, 1); continue; }
        const fTop = Math.min(1, (b.y - zt) / FADE_TOP);   // svaniscono avvicinandosi alla riga 01
        const fBot = Math.min(1, (zb - b.y) / FADE_BOTTOM); // e compaiono piano dal fondo dell'elenco
        const alpha = b.a * Math.max(0, fTop) * Math.max(0, fBot);
        const sy = b.y - scrollY;
        if (alpha <= 0.01 || sy < -20 || sy > H + 20) continue;
        ctx.beginPath();
        ctx.arc(b.x, sy, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(226, 199, 122, ${alpha})`;
        ctx.lineWidth = b.r > 3 ? 1.1 : 0.8;
        ctx.stroke();
        ctx.fillStyle = `rgba(212, 175, 55, ${alpha * 0.18})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.35, sy - b.r * 0.35, Math.max(0.5, b.r * 0.25), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 245, 215, ${alpha * 0.7})`;
        ctx.fill();
      }
      boost *= 0.94;
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }
  initBubbles();


  // --- Testate a tutta larghezza: la foto si allarga piano entrando e scorre più lenta ---
  function initWide() {
    document.querySelectorAll('.wide-hero').forEach((h) => {
      const img = h.querySelector('.wide-hero__photo img');
      if (!img) return;
      const top = h.classList.contains('wide-hero--top');
      if (top && !EDIT) gsap.fromTo(img, { scale: 1.2 }, { scale: 1, duration: 2.8, ease: 'expo.out', delay: 0.4 });
      else gsap.fromTo(img, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: h, start: 'top bottom', end: 'top 20%', scrub: true } });
      gsap.fromTo(img, { yPercent: top ? 0 : -6 }, { yPercent: top ? 12 : 6, ease: 'none', scrollTrigger: { trigger: h, start: top ? 'top top' : 'top bottom', end: 'bottom top', scrub: true } });
    });
  }


  // --- Chi siamo: le parole si accendono una dopo l'altra mentre scorri ---
  function initManifesto() {
    const sec = document.querySelector('[data-manifesto]');
    if (!sec) return;
    const pin = sec.querySelector('.manifesto-pin');
    const chapters = Array.from(sec.querySelectorAll('.mf-chapter'));
    const bgs = Array.from(sec.querySelectorAll('.mf-bg'));
    const N = chapters.length;
    const dots = sec.querySelector('.story-dots');
    const count = sec.querySelector('.story-count');
    if (dots) dots.innerHTML = chapters.map(() => '<span><i></i></span>').join('');
    if (count) count.textContent = `01 / ${String(N).padStart(2, '0')}`;
    if (EDIT) { sec.classList.add('is-static'); return; }
    const bars = Array.from(sec.querySelectorAll('.story-dots i'));
    // parole chiave che si accendono in oro
    const KEY = /^(«?col|bel»?|«?bel|colle»?\.?|solighetto,?|pieve|soligo,?|padova,?|davis,?|california,?|lissa,?|gianni,?|2004|colbel\.?|prosecco\.?|famiglia|colline\.?»?)$/i;
    const esc2 = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const split = (el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map((w) => `<span class="mf-w${KEY.test(w) ? ' is-key' : ''}">${esc2(w)}</span>`).join(' ');
      return Array.from(el.querySelectorAll('.mf-w'));
    };
    const groups = chapters.map((c) => { const t = c.querySelector('[data-mf-words]'); return t ? split(t) : []; });
    groups.forEach((g) => gsap.set(g, { opacity: 0.14 }));
    gsap.set(chapters.slice(1), { autoAlpha: 0 });

    let last = -1;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: pin, start: 'top top', end: () => '+=' + window.innerHeight * (N * 1.35),
        pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress * N;
          bars.forEach((b, i) => gsap.set(b, { scaleX: Math.min(1, Math.max(0, p - i)) }));
          const cur = Math.min(N - 1, Math.floor(self.progress * N * 0.999));
          if (count && cur !== last) { count.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`; last = cur; }
        }
      }
    });
    chapters.forEach((c, i) => {
      const t0 = i;
      if (i > 0) {
        tl.to(chapters[i - 1], { autoAlpha: 0, y: -40, duration: 0.12 }, t0 - 0.06);
        tl.fromTo(c, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.14 }, t0);
        if (bgs[i]) {
          tl.to(bgs[i - 1], { opacity: 0, duration: 0.3 }, t0 - 0.1);
          tl.fromTo(bgs[i], { opacity: 0, scale: 1.08 }, { opacity: 0.32, scale: 1, duration: 0.35 }, t0 - 0.05);
        }
      }
      const g = groups[i];
      if (g.length) tl.to(g, { opacity: 1, duration: 0.05, stagger: 0.7 / g.length }, t0 + 0.08); // le parole si accendono in sequenza
      const st = c.querySelector('.mf-stats');
      if (st) tl.fromTo(st.children, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.12, stagger: 0.05 }, t0 + 0.5);
      if (bgs[i]) tl.fromTo(bgs[i].querySelector('img'), { yPercent: -3 }, { yPercent: 3, duration: 1 }, t0);
    });
    tl.to({}, { duration: 0.15 });
  }


  // --- Chi siamo: la linea dorata si disegna e i tre momenti compaiono in sequenza ---
  function initAbout() {
    const sec = document.querySelector('[data-about]');
    if (!sec || EDIT) return;
    const line = sec.querySelector('.about-line span');
    const vertical = window.innerWidth <= 900;
    if (line) gsap.fromTo(line, vertical ? { scaleY: 0 } : { scaleX: 0 }, Object.assign(vertical ? { scaleY: 1 } : { scaleX: 1 }, { ease: 'none', scrollTrigger: { trigger: sec.querySelector('.about-moments'), start: 'top 85%', end: vertical ? 'bottom 60%' : 'top 35%', scrub: 0.6 } }));
    sec.querySelectorAll('.about-moment').forEach((m, i) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: vertical ? m : sec.querySelector('.about-moments'), start: 'top 85%', once: true } });
      const delay = vertical ? 0 : i * 0.25;
      tl.from(m.querySelector('.about-dot'), { scale: 0, duration: 0.6, ease: 'back.out(3)' }, delay)
        .from(m.querySelector('.about-big'), { yPercent: 60, opacity: 0, duration: 1.2, ease: 'expo.out' }, delay + 0.05)
        .from(m.querySelectorAll('.eyebrow, .text'), { y: 24, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out' }, delay + 0.15);
    });
  }

  // in ordine di pagina: prima i blocchi che si fermano più in alto
  initHeroFull();
  initHero();
  initManifesto();
  initAbout();
  initStories();
  initBands();
  initBottleStory();
  initHGallery();
  initWide();
  initMarks();
  initPhotos();
  initMarquees();
  initIndex();
  if (!EDIT) { initReveals(); initCounters(); initWines(); }

  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  // se l'altezza della pagina cambia (immagini o caratteri caricati dopo), ricalcola tutte le posizioni
  if ('ResizeObserver' in window) {
    let lastH = document.documentElement.scrollHeight, rt = null;
    new ResizeObserver(() => {
      const h = document.documentElement.scrollHeight;
      if (Math.abs(h - lastH) < 2) return;
      lastH = h; clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 150);
    }).observe(document.body);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
    if (location.hash && document.querySelector(location.hash)) {
      setTimeout(() => { if (lenis) lenis.scrollTo(location.hash, { immediate: true, offset: -20 }); else document.querySelector(location.hash).scrollIntoView(); }, 150);
    }
  });
  document.addEventListener('colbel:rendered', () => { applyLanguage(currentLang); ScrollTrigger.refresh(); });
});
