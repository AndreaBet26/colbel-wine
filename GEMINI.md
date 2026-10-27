# ColBel Wine - Regole di Design e Linee Guida Estetiche

## 1. REGOLA FONDAMENTALE: ZERO SCHEDE / NO CARDS
- **NON creare mai schede ("cards")**, riquadri chiusi, bordi arrotondati galleggianti o box annidati ("schede dentro schede").
- Il contenuto non deve mai sembrare una serie di tessere Bootstrap o widget chiusi in se stessi.
- L'intera pagina deve essere trattata come una tela visiva continua (*cinematic canvas*).

## 2. LARGHEZZA TOTALE (100% FULL-BLEED)
- Utilizzare sempre l'intera larghezza del monitor (`width: 100%` da bordo a bordo, `margin: 0`, `padding` esterni a zero dove visivamente appropriato).
- Nessun contenitore stretto al centro con margini laterali vuoti a meno che non si tratti del corpo di lettura di un singolo paragrafo editoriale.
- Le immagini devono occupare l'intero spazio visivo (*full-bleed*, a tutta parete o a tutto schermo).

## 3. IMMAGINI IMMERSIVE & TIPOGRAFIA SOVRAPPOSTA
- Le immagini fotografiche ad alta risoluzione devono fare da sfondo/ambiente, non essere miniature intrappolate in cornici.
- I testi (titoli, descrizioni, prezzi) devono fluttuare direttamente sulle immagini a tutta larghezza.
- Per garantire una leggibilità perfetta, usare sfumature e gradienti cinematografici scuri (*vignette*) o fondali in vetro satinato a piena estensione, mai box opachi rettangolari chiusi.
- Tipografia: Serif di lusso (`Cinzel`, `Cormorant Garamond`) in bianco puro `#ffffff` con accenti dorati `#d4af37`.

## 4. DESKTOP VS MOBILE
- **Desktop (>= 1025px)**: Layout maestosi a tutta larghezza (murali fotografici a tutta parete, colonne architettoniche continue senza gap, sezioni a tutto schermo). Nessuna freccia di slider su desktop.
- **Mobile (<= 1024px)**: Slider orizzontali a scorrimento fluido da bordo a bordo (`scroll-snap`), dock di navigazione inferiore per il pollice, drawer laterale per il menu.
