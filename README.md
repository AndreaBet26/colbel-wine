# ColBel Vineyards & Winery — Redesign Ufficiale

Redesign moderno, immersivo e ad altissima fedeltà estetica per **ColBel Wine** (Solighetto, Treviso — Colline del Conegliano Valdobbiadene Prosecco Superiore DOCG).

---

## Caratteristiche del Progetto

- **Design Philosophy "Zero Schede" & 100% Full-Bleed**:
  - Nessuna "tessera" o box chiuso in stile template AI.
  - Sfruttamento totale della larghezza dello schermo (100% edge-to-edge).
  - Fotografie panoramiche ad alta risoluzione come ambiente visivo immersivo con testi e sfumature cinematografiche sovrapposte.

- **Scrollytelling Interattivo ("Anatomia di un Millesimato")**:
  - Rotazione 3D e scrub fluido sincronizzati con GSAP ScrollTrigger per la bottiglia *Giusto Millesimato*.
  - Transizioni sincronizzate dei 4 capitoli (Origini, Terroir, Sentori, Nel Bicchiere / Ordine).

- **Doppia Modalità Vini & Prodotti**:
  - **Sfilata Alternata (Runway)**: Ciascun vino occupa una striscia panoramica a tutta larghezza con ingresso dinamico da estrema sinistra ed estrema destra delle bottiglie trasparenti e testi animati allo scroll.
  - **Palcoscenico Unico (Stage)**: Vetrina dinamica con selettore rapido dei 6 vini, con scivolamento laterale delle bottiglie e ricomposizione tipografica.

- **Vivi il ColBel dal Vivo (Murales Architettonico a 3 Pilastri)**:
  - Tre maestosi pilastri visivi continui da 86vh senza bordi né gap.
  - Espansione fluida al passaggio del mouse su desktop (fino al 52% della larghezza).
  - Swipe a pieno schermo su mobile.

- **Doppio Tema: Chiaro & Scuro**:
  - **Luxury Light Theme** (predefinito): Alabastro caldo, travertino calcareo e oro antico veneto ad alto contrasto.
  - **Luxury Dark Theme**: Nero profondo, texture calde e bagliore dorato d'atmosfera.
  - Switch istantaneo con persistenza in `localStorage`.

- **Mobile First & Bottom Quick Dock**:
  - Dock inferiore ergonomica per il pollice (Chiamata rapida, WhatsApp, Ordini).
  - Drawer menu a comparsa laterale completo di selettore lingua e contatti diretti per Gianni e Lissa Teo.

- **Integrazione Completa WhatsApp & Ordini**:
  - Modale d'ordine con calcolo prezzi dinamico e generazione messaggi WhatsApp precompilati.
  - Supporto bilingue completo (Italiano / Inglese).

---

## Tecnologie Utilizzate

- **HTML5 Semantico** & **CSS3 Moderno** (Flexbox, CSS Grid, Custom Properties, Backdrop Filter, Viewport units).
- **JavaScript Moderno ES6+** (Bilingual i18n, Steppers, WhatsApp deep links, LocalStorage theme).
- **GSAP 3.12.5 & ScrollTrigger** (animazioni allo scroll e pinning della bottiglia).
- **Font Google Luxury**: `Cinzel`, `Cormorant Garamond`, `Plus Jakarta Sans`.
- **FontAwesome 6.5**: Iconografia vettoriale di supporto.

---

## Struttura delle Cartelle

```
.
├── assets/
│   ├── css/
│   │   └── style.css            # Foglio di stile master responsive (Dark & Light)
│   ├── js/
│   │   ├── main.js              # Logica interattiva, GSAP, bilingue, switcher
│   │   └── vendor/              # GSAP e ScrollTrigger locali
│   └── images/                  # Fotografie autentiche e bottiglie PNG trasparenti
├── .agents/skills/              # Skill di design system codificate
├── GEMINI.md                    # Regole di design permanenti
├── index.html                   # Pagina principale del sito
├── .gitignore
└── README.md
```

---

© 2026 Azienda Agricola ColBel di Teo Gianni — Solighetto (TV).

---

## Gestione dei contenuti (modifica direttamente sul sito)

1. Fai **doppio clic su `Avvia ColBel.command`** (oppure, da Terminale nella cartella del sito: `python3 server.py`).
2. Si apre il browser sul sito in **modalità modifica** (`http://localhost:8080/admin/` → `http://localhost:8080/?modifica`).
3. Si modifica direttamente la pagina:
   - **Testi:** passa sopra un testo (compare un bordo tratteggiato), clicca e scrivi. Invio per confermare.
   - **Foto:** passa sopra una foto e clicca *Cambia foto*.
   - **Vini, esperienze, foto del rullino, numeri chiave:** passandoci sopra compare una barra per spostarli, nasconderli ai visitatori, eliminarli o cambiare i *Dettagli* che non si vedono in pagina (es. a chi arriva la prenotazione WhatsApp).
   - **Aggiungere:** pulsanti *+ Aggiungi* sotto ogni elenco.
   - **Contatti & avvisi** (barra in basso): numeri di telefono/WhatsApp, email, Google Maps, social, barra avvisi.
   - **Anteprima:** mostra il sito esattamente come lo vedono i visitatori.
4. Ogni modifica viene **salvata automaticamente** nei file `data/*.json` (lo stato è nella barra in basso).
5. Il sito per i visitatori è `http://localhost:8080/`. Per fermare il server chiudi la finestra del Terminale.

Esiste anche una **vista a elenco** con tutti i campi in forma di modulo: `http://localhost:8080/admin/elenco.html`.

Note:
- Le foto caricate finiscono in `assets/images/uploads/`.
- Prima di ogni salvataggio viene fatta una copia del file precedente in `data/_backup/` (ultime 20 versioni per file).
- Aprire `index.html` con doppio clic (senza server) mostra solo i contenuti statici di riserva scritti nell'HTML.
- Il pulsante ENG traduce solo i testi fissi dell'interfaccia: i contenuti gestiti dalla dashboard restano in italiano.
