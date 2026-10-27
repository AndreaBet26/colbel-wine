/**
 * ColBel Vineyards and Winery - Interactive Luxury Scripts
 * Features: Bilingual toggle (ITA/ENG), Sticky Header, Mobile Drawer Navigation,
 * GSAP ScrollTrigger Scrollytelling (Anatomia di un Millesimato),
 * Horizontal Sliders (Wines, Experiences, Photo Filmstrip),
 * Wine Order Modal with Touch Steppers & WhatsApp / Email dispatch.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Sticky Navigation Header & Back to Top ---
  const header = document.querySelector('.site-header');
  const backToTopBtn = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    if (backToTopBtn) {
      if (scrollY > 350) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }
  });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- 2. Mobile Drawer Navigation & Backdrop ---
  const mobileToggle = document.getElementById('mobileNavToggle');
  const mainNav = document.getElementById('mainNav');
  const navOverlay = document.getElementById('navOverlay');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');

  function openMobileNav() {
    if (mobileToggle) mobileToggle.classList.add('open');
    if (mainNav) mainNav.classList.add('open');
    if (navOverlay) navOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    if (mobileToggle) mobileToggle.classList.remove('open');
    if (mainNav) mainNav.classList.remove('open');
    if (navOverlay) navOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      if (mainNav && mainNav.classList.contains('open')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeMobileNav);
  }

  if (navOverlay) {
    navOverlay.addEventListener('click', closeMobileNav);
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  // --- 3. Active Nav Link on Scroll ---
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPosition = window.scrollY + 180;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPosition >= top && scrollPosition < top + height) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // --- 4. GSAP ScrollTrigger: Scrollytelling Interactive Experience ---
  function initScrollytelling() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP or ScrollTrigger not loaded, fallback mode active.');
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const scrollyContainer = document.querySelector('.scrolly-container');
    const stickyStage = document.querySelector('.scrolly-sticky-stage');
    const bottleImg = document.getElementById('scrollyBottle');
    const glowOrb = document.querySelector('.scrolly-glow-orb');
    const scrollHint = document.querySelector('.scrolly-scroll-hint');
    const chapters = [
      document.getElementById('scrollyStep1'),
      document.getElementById('scrollyStep2'),
      document.getElementById('scrollyStep3'),
      document.getElementById('scrollyStep4')
    ];
    const dots = document.querySelectorAll('.scrolly-dot');

    if (!scrollyContainer || !stickyStage || !bottleImg) return;

    // Master ScrollTrigger with explicit pinning of the stage
    const getPinDistance = () => (window.innerWidth <= 1024 ? 1600 : 2400);

    const st = ScrollTrigger.create({
      trigger: scrollyContainer,
      pin: stickyStage,
      start: "top top",
      end: () => `+=${getPinDistance()}`,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress; // 0.0 to 1.0

        // Determine active step with smooth distribution
        let activeIndex = 0;
        if (p < 0.25) activeIndex = 0;
        else if (p < 0.50) activeIndex = 1;
        else if (p < 0.75) activeIndex = 2;
        else activeIndex = 3;

        // Toggle chapter visibility
        chapters.forEach((ch, idx) => {
          if (ch) ch.classList.toggle('active', idx === activeIndex);
        });

        // Toggle dots
        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === activeIndex);
        });

        // Bottle 3D rotation & subtle scale
        const rotY = (p - 0.5) * 32; // -16deg to +16deg
        const rotZ = (p - 0.5) * -3;
        const scale = 1 + Math.sin(p * Math.PI) * 0.05;
        bottleImg.style.transform = `rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`;

        // Ambient glow shift
        if (glowOrb) {
          const orbShiftX = (p - 0.5) * 110;
          glowOrb.style.transform = `translate(calc(-50% + ${orbShiftX}px), -50%) scale(${1 + p * 0.12})`;
        }

        // Fade out hint as user begins scrolling
        if (scrollHint) {
          scrollHint.style.opacity = p > 0.08 ? '0' : '0.75';
          scrollHint.style.pointerEvents = p > 0.08 ? 'none' : 'auto';
        }
      }
    });

    // Click on step dots to smoothly scroll to corresponding point
    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        const step = parseInt(dot.getAttribute('data-step')) || 1;
        const progressTarget = (step - 1) / 3;
        const targetScroll = st.start + (st.end - st.start) * progressTarget + 4;
        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      });
    });
  }

  initScrollytelling();

  // --- 5. Horizontal Sliders Helper (Arrows & Mouse Drag for Mobile/Tablet) ---
  function setupHorizontalSlider(viewportId, prevBtnId, nextBtnId) {
    const viewport = document.getElementById(viewportId);
    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);

    if (!viewport) return;

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const scrollAmount = viewport.clientWidth * 0.8;
        viewport.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const scrollAmount = viewport.clientWidth * 0.8;
        viewport.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      });
    }

    // Mouse drag-to-scroll functionality
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || e.target.closest('a')) return;
      isDown = true;
      startX = e.pageX - viewport.offsetLeft;
      scrollLeft = viewport.scrollLeft;
    });

    viewport.addEventListener('mouseleave', () => { isDown = false; });
    viewport.addEventListener('mouseup', () => { isDown = false; });

    viewport.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - viewport.offsetLeft;
      const walk = (x - startX) * 1.5;
      viewport.scrollLeft = scrollLeft - walk;
    });
  }

  setupHorizontalSlider('expViewport', 'expSliderPrev', 'expSliderNext');
  setupHorizontalSlider('galleryViewport', 'gallerySliderPrev', 'gallerySliderNext');

  // --- 6. Wine Section: Runway & Stage Interactive Showcase ---
  function initWineShowcase() {
    const viewRunwayBtn = document.getElementById('viewRunwayBtn');
    const viewStageBtn = document.getElementById('viewStageBtn');
    const runwayContainer = document.getElementById('winesRunwayView');
    const stageContainer = document.getElementById('winesStageView');

    // 1. Toggle between Runway & Stage
    if (viewRunwayBtn && viewStageBtn && runwayContainer && stageContainer) {
      viewRunwayBtn.addEventListener('click', () => {
        viewRunwayBtn.classList.add('active');
        viewStageBtn.classList.remove('active');
        runwayContainer.style.display = 'flex';
        stageContainer.style.display = 'none';
        if (typeof ScrollTrigger !== 'undefined') {
          setTimeout(() => ScrollTrigger.refresh(), 60);
        }
      });

      viewStageBtn.addEventListener('click', () => {
        viewStageBtn.classList.add('active');
        viewRunwayBtn.classList.remove('active');
        stageContainer.style.display = 'flex';
        runwayContainer.style.display = 'none';
        animateStageSlide(currentStageIndex, 0);
      });
    }

    // 2. GSAP ScrollTrigger Animations for Runway Mode
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      const strips = document.querySelectorAll('.wine-runway-strip');
      strips.forEach((strip) => {
        const isRightAligned = strip.classList.contains('align-right');
        const bottleStage = strip.querySelector('.runway-bottle-stage');
        const infoCol = strip.querySelector('.runway-info-col');

        if (!bottleStage || !infoCol) return;

        // Bottle glides in from extreme left or extreme right
        const bottleFromX = isRightAligned ? 220 : -220;
        const bottleRotateY = isRightAligned ? -18 : 18;
        const infoFromX = isRightAligned ? -90 : 90;

        gsap.fromTo(bottleStage,
          { x: bottleFromX, opacity: 0, rotateY: bottleRotateY },
          {
            x: 0,
            opacity: 1,
            rotateY: 0,
            duration: 1.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: strip,
              start: "top 78%",
              toggleActions: "play none none reverse"
            }
          }
        );

        // Text elements glide in from opposite side with smooth stagger
        gsap.fromTo(infoCol.children,
          { x: infoFromX, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: {
              trigger: strip,
              start: "top 75%",
              toggleActions: "play none none reverse"
            }
          }
        );
      });
    }

    // 3. Stage Mode (Palcoscenico) Logic & Transitions
    const stageTabs = document.querySelectorAll('.stage-tab-btn');
    const stageSlides = document.querySelectorAll('.stage-wine-slide');
    const stagePrevBtn = document.getElementById('stagePrevBtn');
    const stageNextBtn = document.getElementById('stageNextBtn');
    let currentStageIndex = 0;
    let isTransitioning = false;

    function animateStageSlide(targetIndex, direction = 1) {
      if (isTransitioning || targetIndex < 0 || targetIndex >= stageSlides.length) return;
      isTransitioning = true;

      const currentSlide = stageSlides[currentStageIndex];
      const nextSlide = stageSlides[targetIndex];

      // Update tabs
      stageTabs.forEach((tab, idx) => {
        tab.classList.toggle('active', idx === targetIndex);
      });

      if (currentStageIndex === targetIndex && currentSlide && currentSlide.classList.contains('active')) {
        isTransitioning = false;
        return;
      }

      if (typeof gsap !== 'undefined') {
        const exitX = direction >= 0 ? -220 : 220;
        const enterX = direction >= 0 ? 220 : -220;

        const currentBottle = currentSlide ? currentSlide.querySelector('.stage-bottle-stage') : null;
        const currentInfo = currentSlide ? currentSlide.querySelector('.stage-info-col') : null;

        const tl = gsap.timeline({
          onComplete: () => {
            stageSlides.forEach((s, idx) => s.classList.toggle('active', idx === targetIndex));
            currentStageIndex = targetIndex;

            const nextBottle = nextSlide.querySelector('.stage-bottle-stage');
            const nextInfo = nextSlide.querySelector('.stage-info-col');

            gsap.fromTo(nextBottle,
              { x: enterX, opacity: 0, rotateY: direction >= 0 ? 15 : -15 },
              { x: 0, opacity: 1, rotateY: 0, duration: 0.65, ease: "power3.out" }
            );

            gsap.fromTo(nextInfo.children,
              { y: 22, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                stagger: 0.06,
                duration: 0.55,
                ease: "power2.out",
                onComplete: () => { isTransitioning = false; }
              }
            );
          }
        });

        if (currentBottle && currentInfo) {
          tl.to(currentBottle, { x: exitX, opacity: 0, duration: 0.35, ease: "power2.in" })
            .to(currentInfo, { opacity: 0, duration: 0.25, ease: "power2.in" }, 0);
        } else {
          tl.call(() => {});
        }
      } else {
        stageSlides.forEach((s, idx) => s.classList.toggle('active', idx === targetIndex));
        currentStageIndex = targetIndex;
        isTransitioning = false;
      }
    }

    stageTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const idx = parseInt(tab.getAttribute('data-index')) || 0;
        const dir = idx >= currentStageIndex ? 1 : -1;
        animateStageSlide(idx, dir);
      });
    });

    if (stagePrevBtn) {
      stagePrevBtn.addEventListener('click', () => {
        const nextIdx = (currentStageIndex - 1 + stageSlides.length) % stageSlides.length;
        animateStageSlide(nextIdx, -1);
      });
    }

    if (stageNextBtn) {
      stageNextBtn.addEventListener('click', () => {
        const nextIdx = (currentStageIndex + 1) % stageSlides.length;
        animateStageSlide(nextIdx, 1);
      });
    }
  }

  initWineShowcase();

  // --- 7. Bilingual Dictionaries (ITA / ENG) ---
  const translations = {
    ita: {
      nav_home: "Home",
      nav_about: "Chi Siamo",
      nav_territory: "Territorio",
      nav_wines: "Vini & Prodotti",
      nav_experiences: "Esperienze",
      nav_agriturismo: "Agriturismo",
      nav_contacts: "Contatti",
      nav_order_now: "Ordina Vini",

      hero_title: "Una Tradizione, Un'Emozione",
      hero_sub: "Coltiviamo la passione per il Conegliano Valdobbiadene Prosecco Superiore DOCG sulle storiche colline di Solighetto.",
      hero_btn_wines: "Scopri i Vini",
      hero_btn_exp: "Prenota Esperienza",
      hero_scroll: "Scorri per esplorare",

      about_label: "La Nostra Storia",
      about_title: "Radici Venete, Visione Globale",
      about_lead: "«Col Bel» in dialetto veneto significa «bel colle». Il Colbel sorge a Solighetto, nel comune di Pieve di Soligo, e su di esso è sito il vigneto da cui, da generazioni, la famiglia di Gianni Teo produce prosecco.",
      about_p1: "Crescendo fra le colline del prosecco, Gianni sviluppa una profonda passione per l'enologia, laureandosi all'Università di Padova. Durante un percorso di ricerca avanzata a Davis, in California, incontra Lissa, biologa texana.",
      about_p2: "Il loro legame sboccia in amore autentico e nella scelta di costruire il loro futuro in Italia: nel 2004 nasce l'Azienda Agricola ColBel. Oggi, affiancando la produzione di bollicine d'eccellenza, ColBel accoglie gli ospiti nella nuova sala degustazione con i sapori genuini dell'agriturismo.",
      about_quote: "«Un calice sincero che racchiude il rispetto per la terra, il calore della famiglia e la poesia delle nostre colline.»",
      stat_founded: "Anno di fondazione",
      stat_altitude: "Altitudine collinare",
      stat_heritage: "Tradizione di famiglia",

      panorama_label: "Patrimonio Unesco",
      panorama_title: "Le Colline del Prosecco DOCG",
      panorama_quote: "«I vigneti si arrampicano sulle prime colline e creano un cuscinetto tra la fertile pianura trevigiana e le superfici boscate a monte.»",
      panorama_desc: "Dal nostro agriturismo, nelle giornate terse, lo sguardo spazia fino alla romantica Laguna Veneta. Nelle ore serali, una brezza gentile risale la pianura donando alle nostre uve Glera un'acidità vibrante e aromi inconfondibili.",

      // Scrollytelling translations
      scrolly_step1_badge: "01 / Le Origini",
      scrolly_step1_title: "Omaggio a Nonno Giusto",
      scrolly_step1_text: "Giusto era il nonno che per primo lavorò i vigneti che oggi danno vita a questo vino. Il suo nome onora una storia di famiglia iniziata su queste colline.",
      scrolly_step2_badge: "02 / Il Terroir",
      scrolly_step2_title: "Colline Eroiche di Solighetto",
      scrolly_step2_text: "Pendenze scoscese baciate dal sole e rinfrescate dalla brezza serale che sale dalla Laguna Veneta, donando alle uve Glera acidità e sapidità uniche.",
      scrolly_step3_badge: "03 / I Sentori",
      scrolly_step3_title: "Perlage Fine & Minerale",
      scrolly_step3_text: "Bollicina sottile e persistente. Al naso profuma di mela cotogna, pera croccante e fiori di glicine. Asciutto, elegante e straordinariamente armonioso.",
      scrolly_step4_badge: "04 / Nel Bicchiere",
      scrolly_step4_title: "11,90 € / Bottiglia",
      scrolly_step4_text: "Perfetto dall'aperitivo a tutto pasto, accompagnato dal nostro pane cotto a legna e dalla soppressa della cantina seicentesca.",
      scrolly_btn_order: "Ordina questa Bottiglia",

      wines_label: "La Cantina ColBel",
      wines_title: "I Nostri Vini & Spumanti",
      wines_sub: "Spedizioni dirette dalla cantina a casa vostra in tutta Italia • IVA inclusa • Minimo 6 bottiglie",
      btn_order: "Ordina",
      filter_all: "Tutti (6)",
      filter_docg: "DOCG",
      filter_frizz: "Frizzanti",

      exp_label: "Ospitalità & Degustazioni",
      exp_title: "Vivi il ColBel dal Vivo",
      exp_intro: "Dalla visita tra i filari al brindisi conviviale: scegli l'esperienza su misura per te a Solighetto.",
      
      exp1_badge: "01 / Degustazione Essenziale",
      exp1_title: "Degustazione Classico",
      exp1_desc: "Assaggio di 3 calici dei nostri vini (tra cui 2 Conegliano Valdobbiadene Prosecco Superiore DOCG), accompagnati da un piatto di sopressa nostrana e cestino di pane fragrante di nostra produzione.",
      exp1_price: "15 € a persona",

      exp2_badge: "02 / Esperienza Gastronomica",
      exp2_title: "Degustazione Buon Gustaio",
      exp2_desc: "3 calici di vini con ricco tagliere di affettati artigianali di nostra produzione, verdure in agrodolce dell'orto, selezione di formaggi di piccoli casari locali con miele e confetture, pane caldo con farina antica 'Giorgione'.",
      exp2_price: "20 € a persona",

      exp3_badge: "03 / Tour Completo in Cantina",
      exp3_title: "Dal Vigneto a Tavola",
      exp3_desc: "Passeggiata guidata tra i filari alla scoperta della vite e della vendemmia, visita ai locali di vinificazione in cantina e infine degustazione di 4 calici con tagliere completo di specialità del Colbel. (Lun-Ven, min 4 persone).",
      exp3_price: "25 € a persona",

      per_person: "/ persona",
      btn_book_gianni: "Prenota con Gianni",
      btn_book_lissa: "Prenota con Lissa",
      btn_book_tour: "Richiedi Tour",
      btn_book_exp: "Prenota con Gianni",

      agri_label: "La Terra e la Cucina",
      agri_title: "L'Agriturismo & La Cucina di Lissa",
      agri_desc: "Nella cucina di Lissa i frutti della terra diventano conserve, composte e verdure in agrodolce. I salumi stagionano nell'antica cantina seicentesca di Casa Teo rinfrescata dai gelsi secolari, e il pane è sfornato caldo con farina di grano antico 'Giorgione'. Nel weekend è aperta la spuntineria su prenotazione.",
      mosaic_1: "Pane a legna con farina di grano antico 'Giorgione'",
      mosaic_2: "Soppressa & salumi stagionati nella cantina seicentesca",
      mosaic_3: "Verdure in agrodolce e conserve dell'orto di Lissa",
      mosaic_4: "I vigneti affacciati sul Quartier del Piave",
      mosaic_5: "Momenti in famiglia e brindisi al tramonto",

      contact_label: "Contatti Diretti",
      contact_title: "Vieni a Trovarci o Ordina",
      contact_sub: "Siamo sempre felici di accoglierti in cantina o spedirti le nostre bottiglie comodamente a casa in tutta Italia.",
      contact_address_label: "Sede Azienda Agricola",
      contact_address_val: "Via Drio Cisa, 2, Loc. Solighetto – 31053 Pieve di Soligo (TV)",
      form_title: "Richiedi Informazioni o Ordine",
      form_desc: "Scrivici per prenotare un tavolo, un tour o richiedere la spedizione dei nostri vini:",
      form_name: "Nome e Cognome",
      form_email: "La tua Email",
      form_phone: "Telefono / WhatsApp",
      form_msg: "Messaggio o Dettagli Ordine",
      form_send_wa: "Invia via WhatsApp",
      form_send_mail: "Invia via Email",

      mob_call: "Chiama",
      mob_order: "Ordina Vini",

      footer_tagline: "Una tradizione, un'emozione.",
      footer_rights: "© 2026 Azienda Agricola ColBel di Teo Gianni. Tutti i diritti riservati."
    },
    eng: {
      nav_home: "Home",
      nav_about: "About Us",
      nav_territory: "Territory",
      nav_wines: "Wines & Products",
      nav_experiences: "Experiences",
      nav_agriturismo: "Agriturismo",
      nav_contacts: "Contact Us",
      nav_order_now: "Order Wine",

      hero_title: "A Tradition, An Emotion",
      hero_sub: "Cultivating genuine passion for Conegliano Valdobbiadene Prosecco Superiore DOCG across the historical hills of Solighetto.",
      hero_btn_wines: "Explore Wines",
      hero_btn_exp: "Book Experience",
      hero_scroll: "Scroll to explore",

      about_label: "Our Heritage",
      about_title: "Venetian Roots, International Soul",
      about_lead: "«Col Bel» in Venetian dialect translates to «beautiful hill». Colbel rises in Solighetto, in the heart of Pieve di Soligo, where the Teo family has cultivated vines for generations.",
      about_p1: "Growing up among rolling prosecco hills, Gianni developed an enduring devotion to viticulture, studying oenology at the University of Padua. While completing research at UC Davis in California, he met Lissa, a Texas-born biologist.",
      about_p2: "Their bond quickly blossomed into love and a shared vision in Italy: in 2004, Azienda Agricola ColBel was founded. Today, alongside award-winning sparkling wines, ColBel welcomes travelers to their warm tasting room with farm-grown delicacies.",
      about_quote: "«A sincere glass of wine that captures our respect for nature, family warmth, and the poetry of our hills.»",
      stat_founded: "Founded in",
      stat_altitude: "Hillside Elevation",
      stat_heritage: "Family Winemaking",

      panorama_label: "UNESCO World Heritage",
      panorama_title: "Conegliano Valdobbiadene DOCG",
      panorama_quote: "«Our vineyards climb the first gentle hills, creating an amphitheater between the fertile Treviso plains and the alpine woodlands above.»",
      panorama_desc: "From our farmhouse on clear afternoons, one can glimpse the shimmering Venetian lagoon. In the twilight hours, a refreshing sea breeze sweeps across the vines, imparting our Glera grapes with vibrant minerality and distinctive aromas.",

      // Scrollytelling translations
      scrolly_step1_badge: "01 / The Heritage",
      scrolly_step1_title: "Tribute to Nonno Giusto",
      scrolly_step1_text: "Giusto was the grandfather who first cultivated the steep vineyard parcels producing this wine. His name honors our family history carved into these hills.",
      scrolly_step2_badge: "02 / The Terroir",
      scrolly_step2_title: "Heroic Hills of Solighetto",
      scrolly_step2_text: "Steep slopes bathed in sunlight and cooled by evening breezes drifting from the Venetian Lagoon, endowing our Glera with distinctive minerality.",
      scrolly_step3_badge: "03 / The Aromas",
      scrolly_step3_title: "Fine Perlage & Vibrant Fruit",
      scrolly_step3_text: "Delicate, persistent bubbles with clear aromas of golden apple, crisp pear, and wisteria blossom. Dry, structured, and profoundly balanced.",
      scrolly_step4_badge: "04 / In The Glass",
      scrolly_step4_title: "11.90 € / Bottle",
      scrolly_step4_text: "Superb as an aperitif or pairing seamlessly through meals alongside our wood-fired sourdough bread and artisan cured sopressa.",
      scrolly_btn_order: "Order This Bottle",

      wines_label: "ColBel Cellar",
      wines_title: "Our Handcrafted Wines",
      wines_sub: "Direct winery door-to-door delivery across Italy • VAT included • Min. 6 bottles",
      btn_order: "Order",
      filter_all: "All (6)",
      filter_docg: "DOCG",
      filter_frizz: "Sparkling",

      exp_label: "Hospitality & Tastings",
      exp_title: "Experience ColBel Firsthand",
      exp_intro: "From panoramic vineyard strolls to cheerful farmstead tastings: choose your bespoke visit in Solighetto.",
      
      exp1_badge: "01 / Classic Tasting",
      exp1_title: "Classic Wine Tasting",
      exp1_desc: "A tasting flight of 3 estate wines (including 2 Conegliano Valdobbiadene Prosecco Superiore DOCG), paired with artisanal sopressa salami and freshly baked country bread.",
      exp1_price: "15 € per person",

      exp2_badge: "02 / Gourmet Tasting",
      exp2_title: "Buon Gustaio Tasting",
      exp2_desc: "3 select wines served with a rich board of house-cured meats, sweet-and-sour garden vegetables, local farmstead cheeses with honey and fruit preserves, and stone-baked bread.",
      exp2_price: "20 € per person",

      exp3_badge: "03 / Complete Estate Tour",
      exp3_title: "From Vineyard to Table",
      exp3_desc: "Guided walk among the vines explaining our farming philosophy and harvest, followed by an intimate cellar tour and a seated 4-glass tasting with full local gastronomic pairings. (Mon-Fri, min 4 guests).",
      exp3_price: "25 € per person",

      per_person: "/ person",
      btn_book_gianni: "Book with Gianni",
      btn_book_lissa: "Book with Lissa",
      btn_book_tour: "Inquire Tour",
      btn_book_exp: "Book with Gianni",

      agri_label: "The Land & Kitchen",
      agri_title: "Farmstay & Lissa's Kitchen",
      agri_desc: "In Lissa's kitchen, garden harvest transforms into artisan pickles and preserves. Salumi age patiently in the 17th-century cellar of Casa Teo cooled by ancient mulberries, while heirloom 'Giorgione' bread is baked in the wood oven. Open weekends by reservation.",
      mosaic_1: "Wood-fired bread with heirloom 'Giorgione' wheat",
      mosaic_2: "Artisanal sopressa aged in the 17th-century cellar",
      mosaic_3: "Sweet-and-sour garden harvest & fruit preserves",
      mosaic_4: "Panoramic vineyards overlooking Quartier del Piave",
      mosaic_5: "Cherished family moments & sunset toasts",

      contact_label: "Direct Inquiries",
      contact_title: "Visit Us or Order Bottles",
      contact_sub: "We are delighted to welcome you to the winery or deliver our bottles straight to your door across Italy.",
      contact_address_label: "Estate Address",
      contact_address_val: "Via Drio Cisa, 2, Loc. Solighetto – 31053 Pieve di Soligo (Treviso, Italy)",
      form_title: "Inquire or Place an Order",
      form_desc: "Send us a message to book a tasting table, schedule a tour, or order wine delivery:",
      form_name: "Full Name",
      form_email: "Email Address",
      form_phone: "Phone / WhatsApp",
      form_msg: "Message or Order Details",
      form_send_wa: "Send via WhatsApp",
      form_send_mail: "Send via Email",

      mob_call: "Call",
      mob_order: "Order Wine",

      footer_tagline: "A tradition, an emotion.",
      footer_rights: "© 2026 Azienda Agricola ColBel di Teo Gianni. All rights reserved."
    }
  };

  let currentLang = 'ita';

  function applyLanguage(lang) {
    currentLang = lang;
    const dict = translations[lang];
    if (!dict) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    document.documentElement.lang = lang === 'ita' ? 'it' : 'en';
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyLanguage(btn.getAttribute('data-lang'));
    });
  });

  // --- 8. Quick Wine Order Modal with Touch Steppers ---
  const modalBackdrop = document.getElementById('orderModal');
  const modalCloseBtn = document.querySelector('.modal-close-btn');
  const modalWineTitle = document.getElementById('modalWineTitle');
  const modalWinePrice = document.getElementById('modalWinePrice');
  const bottleQtyInput = document.getElementById('bottleQty');
  const totalCalcEl = document.getElementById('modalTotalCalc');
  const btnWaGianni = document.getElementById('btnWaGianni');
  const btnWaLissa = document.getElementById('btnWaLissa');
  const btnEmailOrder = document.getElementById('btnEmailOrder');
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const presetPills = document.querySelectorAll('.preset-pill');

  let activeWine = { name: "Prosecco DOCG", price: 11.90 };

  window.openOrderModal = function(name, price) {
    activeWine = { name, price: parseFloat(price) };
    if (modalWineTitle) modalWineTitle.textContent = name;
    if (modalWinePrice) modalWinePrice.textContent = `${price.toFixed(2)} € / bottiglia`;
    if (bottleQtyInput) bottleQtyInput.value = 6;
    setActivePreset(6);
    updateModalTotal();
    if (modalBackdrop) {
      modalBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  function closeOrderModal() {
    if (modalBackdrop) {
      modalBackdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function setActivePreset(qty) {
    presetPills.forEach(p => {
      if (parseInt(p.getAttribute('data-qty')) === qty) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  function updateModalTotal() {
    if (!bottleQtyInput || !totalCalcEl) return;
    const qty = Math.max(6, parseInt(bottleQtyInput.value) || 6);
    bottleQtyInput.value = qty;
    const total = (qty * activeWine.price).toFixed(2);
    totalCalcEl.textContent = `Totale indicativo: ${total} € (IVA incl.)`;

    const msgIta = `Buongiorno! Vorrei ordinare ${qty} bottiglie di "${activeWine.name}" (totale stimato: ${total} €). Potete darmi maggiori informazioni per la spedizione? Grazie!`;
    const msgEng = `Hello! I would like to order ${qty} bottles of "${activeWine.name}" (estimated total: ${total} €). Could you please provide shipping details? Thank you!`;
    const message = currentLang === 'ita' ? msgIta : msgEng;

    if (btnWaGianni) {
      btnWaGianni.href = `https://wa.me/393462443607?text=${encodeURIComponent(message)}`;
    }
    if (btnWaLissa) {
      btnWaLissa.href = `https://wa.me/393494356778?text=${encodeURIComponent(message)}`;
    }
    if (btnEmailOrder) {
      btnEmailOrder.href = `mailto:colbelwine@gmail.com?subject=${encodeURIComponent("Richiesta Ordine: " + activeWine.name)}&body=${encodeURIComponent(message)}`;
    }
  }

  if (qtyMinus) {
    qtyMinus.addEventListener('click', () => {
      let currentVal = parseInt(bottleQtyInput.value) || 6;
      if (currentVal > 6) {
        currentVal -= 6;
        bottleQtyInput.value = currentVal;
        setActivePreset(currentVal);
        updateModalTotal();
      }
    });
  }

  if (qtyPlus) {
    qtyPlus.addEventListener('click', () => {
      let currentVal = parseInt(bottleQtyInput.value) || 6;
      currentVal += 6;
      bottleQtyInput.value = currentVal;
      setActivePreset(currentVal);
      updateModalTotal();
    });
  }

  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const qty = parseInt(pill.getAttribute('data-qty')) || 6;
      bottleQtyInput.value = qty;
      setActivePreset(qty);
      updateModalTotal();
    });
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeOrderModal);
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        closeOrderModal();
      }
    });
  }

  // --- 9. Quick Direct Contact Form Actions ---
  const sendFormWa = document.getElementById('sendFormWa');
  const sendFormMail = document.getElementById('sendFormMail');

  function getFormData() {
    const name = document.getElementById('c_name')?.value || '';
    const email = document.getElementById('c_email')?.value || '';
    const phone = document.getElementById('c_phone')?.value || '';
    const msg = document.getElementById('c_msg')?.value || '';

    const text = `Richiesta dal sito ColBel:\nNome: ${name}\nEmail: ${email}\nTel: ${phone}\nMessaggio: ${msg}`;
    return { name, email, phone, msg, text };
  }

  if (sendFormWa) {
    sendFormWa.addEventListener('click', (e) => {
      e.preventDefault();
      const data = getFormData();
      const url = `https://wa.me/393462443607?text=${encodeURIComponent(data.text)}`;
      window.open(url, '_blank');
    });
  }

  if (sendFormMail) {
    sendFormMail.addEventListener('click', (e) => {
      e.preventDefault();
      const data = getFormData();
      const mailUrl = `mailto:colbelwine@gmail.com?subject=Richiesta ColBel da ${encodeURIComponent(data.name || 'Cliente')}&body=${encodeURIComponent(data.text)}`;
      window.location.href = mailUrl;
    });
  }

  // --- 10. Luxury Theme Switcher (Chiaro / Scuro) ---
  function initThemeSwitcher() {
    const desktopToggle = document.getElementById('themeToggleBtn');
    const mobileToggle = document.getElementById('mobileThemeToggleBtn');
    const htmlEl = document.documentElement;

    function applyTheme(theme) {
      htmlEl.setAttribute('data-theme', theme);
      localStorage.setItem('colbel_theme', theme);

      const isLight = theme === 'light';
      const iconClass = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
      const labelText = isLight ? 'Scuro' : 'Chiaro';
      const mobileText = isLight ? 'Tema Scuro' : 'Tema Chiaro';

      if (desktopToggle) {
        desktopToggle.innerHTML = `<i class="${iconClass}"></i> <span class="theme-label">${labelText}</span>`;
      }
      if (mobileToggle) {
        mobileToggle.innerHTML = `<i class="${iconClass}"></i> <span class="theme-label">${mobileText}</span>`;
      }

      if (typeof ScrollTrigger !== 'undefined') {
        setTimeout(() => ScrollTrigger.refresh(), 80);
      }
    }

    // Default to Light theme as requested by user
    const savedTheme = localStorage.getItem('colbel_theme') || 'light';
    applyTheme(savedTheme);

    [desktopToggle, mobileToggle].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const current = htmlEl.getAttribute('data-theme') || 'light';
          const next = current === 'light' ? 'dark' : 'light';
          applyTheme(next);
        });
      }
    });
  }

  initThemeSwitcher();
});
