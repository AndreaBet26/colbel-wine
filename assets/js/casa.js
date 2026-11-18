/**
 * ColBel — Interazioni e animazioni per la proposta "D-finale" (casa.js)
 *
 * · Header dinamico (sfondo su scroll, scomparsa/ricomparsa)
 * · Menu a schermo intero su telefono
 * · Lingua ITA / ENG per testi fissi di navigazione
 * · Modale d'ordine (quantità, calcolo totale, link WhatsApp/Email)
 * · Animazioni GSAP:
 *   - Pagina "I vini": la bottiglia ruota mentre si scorre e le scritte compaiono e rimangono visibili
 *   - Scrollytelling bottiglia in home (se presente)
 *   - Rivelazione elementi morbida da terra
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (window.colbelContentReady) {
      await window.colbelContentReady;
    }
  } catch (e) {
    // Continua con i contenuti statici
  }

  const C = window.ColBel || {};
  const EDIT = !!C.EDIT;
  const DATA = window.COLBEL_DATA || {};
  const contatti = DATA.contatti || {};
  const waGianni = String((contatti.gianni && contatti.gianni.wa_numero) || '393462443607').replace(/\D/g, '');
  const waLissa = String((contatti.lissa && contatti.lissa.wa_numero) || '393494356778').replace(/\D/g, '');
  const mailCantina = (contatti.azienda && contatti.azienda.email) || 'lissa@colbelwine.com';

  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // ---------------------------------------------------------------------------
  // 1. Header: sfondo e comparsa/scomparsa su scroll
  // ---------------------------------------------------------------------------
  const header = document.querySelector('.site-header');
  let lastY = window.scrollY;
  const menuOverlay = document.getElementById('menuOverlay');
  const menuToggle = document.getElementById('mobileNavToggle');

  function onScroll() {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('scrolled', y > 40);
      document.body.classList.toggle('has-scrolled', y > 40);

      const menuOpen = menuOverlay && menuOverlay.classList.contains('open');
      const hidden = header.classList.contains('is-hidden');
      if (y < 120 || menuOpen) {
        header.classList.remove('is-hidden');
        lastY = y;
      } else if (hidden) {
        if (y < lastY - 10) {
          header.classList.remove('is-hidden');
          lastY = y;
        } else {
          lastY = Math.max(lastY, y);
        }
      } else {
        if (y > lastY + 10) {
          header.classList.add('is-hidden');
          lastY = y;
        } else {
          lastY = Math.min(lastY, y);
        }
      }
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Preserva ?modifica sui link interni per la dashboard
  if (EDIT) {
    document.querySelectorAll('a[href$=".html"], a[href="index.html"]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!/^https?:/.test(href) && !href.includes('?')) {
        a.setAttribute('href', href + '?modifica');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Menu a schermo intero (mobile)
  // ---------------------------------------------------------------------------
  function setMenu(open) {
    if (!menuOverlay || !menuToggle) return;
    menuOverlay.classList.toggle('open', open);
    menuToggle.classList.toggle('open', open);
    menuOverlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';

    if (open && hasGsap) {
      gsap.fromTo(
        menuOverlay.querySelectorAll('nav a'),
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.1 }
      );
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', () => setMenu(!menuOverlay.classList.contains('open')));
  }
  if (menuOverlay) {
    menuOverlay.querySelectorAll('nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setMenu(false);
      closeOrderModal();
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Lingua (testi fissi)
  // ---------------------------------------------------------------------------
  const translations = {
    ita: {
      nav_home: 'Home',
      nav_about: 'Chi siamo',
      nav_territory: 'Territorio',
      nav_wines: 'I nostri vini',
      nav_experiences: 'Esperienze',
      nav_agriturismo: 'Agriturismo',
      nav_contacts: 'Contatti',
      cb_where: 'Dove siamo',
      cb_directions: 'Indicazioni stradali',
      exp_weekend: 'Ogni weekend, su prenotazione',
      exp_agri_title: 'Pranzo o cena in agriturismo',
      exp_agri_btn: "Scopri l'agriturismo",
      agri_menu_title: 'A tavola',
      agri_menu_btn: 'Vedi il menù',
      modal_label: 'Ordine diretto dalla cantina',
      modal_qty: 'Quantità (minimo 6 bottiglie)',
      modal_hint: 'Scegli come inviarci la richiesta: ti rispondiamo con le istruzioni per pagamento e spedizione.',
      modal_wa_gianni: 'Invia a Gianni',
      modal_wa_lissa: 'Invia a Lissa',
      modal_email: 'Oppure via email',
      mob_call: 'Chiama',
      mob_order: 'Ordina'
    },
    eng: {
      nav_home: 'Home',
      nav_about: 'About us',
      nav_territory: 'Territory',
      nav_wines: 'Our wines',
      nav_experiences: 'Experiences',
      nav_agriturismo: 'Farmhouse',
      nav_contacts: 'Contacts',
      cb_where: 'Where we are',
      cb_directions: 'Get directions',
      exp_weekend: 'Every weekend, by reservation',
      exp_agri_title: 'Lunch or dinner at the farmhouse',
      exp_agri_btn: 'Discover the farmhouse',
      agri_menu_title: 'At the table',
      agri_menu_btn: 'View the menu',
      modal_label: 'Direct winery order',
      modal_qty: 'Quantity (minimum 6 bottles)',
      modal_hint: 'Send us your request: we will reply with payment and shipping details.',
      modal_wa_gianni: 'Send to Gianni',
      modal_wa_lissa: 'Send to Lissa',
      modal_email: 'Or via email',
      mob_call: 'Call',
      mob_order: 'Order'
    }
  };

  let currentLang = 'ita';
  function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    const t = translations[lang];

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) el.textContent = t[key];
    });

    const label = document.getElementById('langCurrentLabel');
    if (label) label.textContent = lang.toUpperCase();

    document.querySelectorAll('.lang-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
  }

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const l = btn.getAttribute('data-lang');
      if (l) setLanguage(l);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Modale d'ordine
  // ---------------------------------------------------------------------------
  const modal = document.getElementById('orderModal');
  const modalClose = modal ? modal.querySelector('.modal-close-btn') : null;
  const wineTitleEl = document.getElementById('modalWineTitle');
  const winePriceEl = document.getElementById('modalWinePrice');
  const totalCalcEl = document.getElementById('modalTotalCalc');
  const qtyInput = document.getElementById('bottleQty');
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const btnWaGianni = document.getElementById('btnWaGianni');
  const btnWaLissa = document.getElementById('btnWaLissa');
  const btnEmailOrder = document.getElementById('btnEmailOrder');

  let activeWine = { name: 'Giusto – Prosecco Superiore DOCG Millesimato Brut', price: 11.90 };

  const eur = (n) => (typeof n === 'number' ? n.toFixed(2).replace('.', ',') : n);

  function updateModalTotal() {
    const qty = parseInt((qtyInput && qtyInput.value) || '6', 10);
    const total = qty * activeWine.price;
    if (totalCalcEl) {
      totalCalcEl.textContent = `Totale indicativo: ${eur(total)} € (IVA incl.)`;
    }

    const msg = `Buongiorno ColBel! Vorrei ordinare ${qty} bottiglie di "${activeWine.name}" (totale stimato: ${eur(total)} €). Potete darmi le informazioni per la spedizione? Grazie!`;
    const encoded = encodeURIComponent(msg);

    if (btnWaGianni) btnWaGianni.href = `https://wa.me/${waGianni}?text=${encoded}`;
    if (btnWaLissa) btnWaLissa.href = `https://wa.me/${waLissa}?text=${encoded}`;
    if (btnEmailOrder) {
      btnEmailOrder.href = `mailto:${mailCantina}?subject=${encodeURIComponent('Ordine vino: ' + activeWine.name)}&body=${encoded}`;
    }
  }

  window.openOrderModal = function (name, price) {
    if (!modal) return;
    if (name) activeWine.name = name;
    if (price != null && !isNaN(parseFloat(price))) activeWine.price = parseFloat(price);

    if (wineTitleEl) wineTitleEl.textContent = activeWine.name;
    if (winePriceEl) winePriceEl.textContent = `${eur(activeWine.price)} € / bottiglia`;
    if (qtyInput) qtyInput.value = '6';

    document.querySelectorAll('.preset-pill').forEach((p) => {
      p.classList.toggle('active', p.getAttribute('data-qty') === '6');
    });

    updateModalTotal();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  window.closeOrderModal = function () {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (modalClose) modalClose.addEventListener('click', closeOrderModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeOrderModal();
    });
  }

  if (qtyMinus) {
    qtyMinus.addEventListener('click', () => {
      const q = parseInt(qtyInput.value || '6', 10);
      if (q > 6) {
        qtyInput.value = q - 6;
        updateModalTotal();
      }
    });
  }

  if (qtyPlus) {
    qtyPlus.addEventListener('click', () => {
      const q = parseInt(qtyInput.value || '6', 10);
      qtyInput.value = q + 6;
      updateModalTotal();
    });
  }

  document.querySelectorAll('.preset-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.preset-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      if (qtyInput) {
        qtyInput.value = pill.getAttribute('data-qty');
        updateModalTotal();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Pagina "I vini": rotazione bottiglia e testi che non spariscono
  // ---------------------------------------------------------------------------
  function initWineRows() {
    const rows = document.querySelectorAll('.wine-row');
    if (!rows.length) return;

    rows.forEach((row) => {
      const bottle = row.querySelector('.wine-bottle img');
      const info = row.querySelector('.wine-info');
      const isLeft = row.classList.contains('is-left');
      const dir = isLeft ? -1 : 1;

      // Assicura subito visibilità completa nei CSS e stili
      if (info) {
        info.style.opacity = '1';
        info.style.visibility = 'visible';
        Array.from(info.children).forEach((child) => {
          child.style.opacity = '1';
          child.style.visibility = 'visible';
        });
      }

      if (hasGsap && bottle) {
        // La bottiglia ruota mentre si scorre verso la riga
        gsap.fromTo(
          bottle,
          { rotate: dir * 18, x: dir * 40, opacity: 0.8 },
          {
            rotate: 0,
            x: 0,
            opacity: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: row,
              start: 'top 85%',
              end: 'top 30%',
              scrub: 0.6
            }
          }
        );

        // Il testo entra morbidamente una volta sola e RIMANE VISIBILE
        if (info) {
          gsap.from(info.children, {
            y: 24,
            opacity: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: row,
              start: 'top 75%',
              once: true
            }
          });
        }
      }
    });
  }
  initWineRows();

  // ---------------------------------------------------------------------------
  // 6. Home: Scrollytelling bottiglia (index.html)
  // ---------------------------------------------------------------------------
  function initHomeBottle() {
    const story = document.getElementById('bottiglia');
    if (!story) return;

    const img = story.querySelector('.bottle-img');
    const steps = story.querySelectorAll('.story-step');

    if (hasGsap && img) {
      // Rotazione continua e morbida della bottiglia mentre si scorre la sezione
      gsap.fromTo(
        img,
        { rotateY: -30, rotateZ: -2 },
        {
          rotateY: 30,
          rotateZ: 2,
          ease: 'none',
          scrollTrigger: {
            trigger: story,
            start: 'top 80%',
            end: 'bottom 20%',
            scrub: 0.8
          }
        }
      );

      // Gli step rimangono tutti visibili e accessibili
      steps.forEach((step) => {
        gsap.from(step, {
          y: 20,
          opacity: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: step,
            start: 'top 85%',
            once: true
          }
        });
      });
    }
  }
  initHomeBottle();

  // ---------------------------------------------------------------------------
  // 7. Rivelazione generale elementi [data-reveal]
  // ---------------------------------------------------------------------------
  if (hasGsap) {
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      // Assicura che non restino invisibili se JS si blocca
      gsap.from(el, {
        y: 20,
        opacity: 0,
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true
        }
      });
    });
  }
});
