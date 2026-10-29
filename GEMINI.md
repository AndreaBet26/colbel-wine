# ColBel Wine - Regole di Design e Linee Guida Estetiche

## 1. REGOLA FONDAMENTALE: ZERO SCHEDE / NO CARDS
- **NON creare mai schede ("cards")**, riquadri chiusi, bordi arrotondati galleggianti o box annidati ("schede dentro schede").
- Il contenuto non deve mai sembrare una serie di tessere Bootstrap o widget chiusi in se stessi.
- L'intera pagina deve essere trattata come una tela visiva continua (*cinematic canvas*).

## 2. LARGHEZZA TOTALE (100% FULL-BLEED)
- Utilizzare sempre l'intera larghezza del monitor (`width: 100%` da bordo a bordo, `margin: 0`, `padding` esterni a zero dove visivamente appropriato).
- Nessun contenitore stretto al centro con margini laterali vuoti a meno che non si tratti del corpo di lettura di un singolo paragrafo editoriale.
- Le immagini devono occupare l'intero spazio visivo (*full-bleed*, a tutta parete o a tutto schermo).

## 3. IMMAGINI GRANDI NEL LAYOUT (NON CARTA DA PARATI)
- Fondo scuro unico e continuo per tutto il sito: niente sezioni con una foto diversa a tutto schermo una dopo l'altra.
- Le foto sono grandi, toccano almeno un bordo della pagina e sul lato interno sfumano nel fondo; il testo si sovrappone solo in parte, sul lato sfumato.
- Stesso trattamento colore per tutte le foto (`--grade`), così combaciano.
- Scorrimento fluido; l'unico momento in cui la pagina si ferma è la bottiglia che ruota in home.
- Tipografia: solo `Cormorant Garamond` (titoli) e `Plus Jakarta Sans` (testo). Testo avorio `#f2ebdf`, oro `#d4af37` solo per piccoli accenti. Solo tema scuro. Un bottone pieno (`.btn`) e un link con linea (`.link`).
## 4. DESKTOP VS MOBILE
- **Desktop (>= 901px)**: foto che sbordano a destra o a sinistra, testo affiancato che entra sulla sfumatura, scrollytelling della bottiglia.
- **Mobile (<= 900px)**: foto a tutta larghezza con sfumatura in basso, il testo sale sulla sfumatura. Menu a schermo intero e barra rapida in basso (Chiama, WhatsApp, Ordina).

## 5. STRUTTURA
- Home (`index.html`) con le informazioni generali; una pagina dedicata per ogni categoria: `storia.html`, `vini.html`, `esperienze.html`, `agriturismo.html`, `contatti.html`.
- In home dei vini compare solo la bottiglia del Giusto che ruota con i testi; tutte le altre bottiglie stanno in `vini.html`.
