---
name: colbel-design-rules
description: Linee guida estetiche e principi di design per il sito ColBel Wine. Definisce la regola zero schede, l'utilizzo della larghezza totale 100% full-bleed, immagini a tutto schermo e distinzione desktop/mobile.
---

# ColBel Wine - Luxury Full-Bleed Design System

Questo documento contiene le direttive estetiche imperative per lo sviluppo del sito ColBel Wine.

## Principi Fondamentali

### 1. No Cards / Zero Schede
- È espressamente vietato racchiudere contenuti in schede, riquadri isolati con bordi e angoli arrotondati, o box dentro altri box.
- Il design deve apparire editoriale, organico e continuo, come una rivista di alta moda o architettura di lusso.

### 2. Sfruttamento della Larghezza Totale (100% Full-Bleed)
- Le sezioni visive devono estendersi da bordo a bordo (`width: 100%`, `margin: 0`), senza barre o colonne vuote ai lati.
- Le sezioni fotografiche devono dominare lo schermo e riempire lo spazio.

### 3. Immagini come Ambiente Immersivo
- Le immagini non sono elementi grafici accessori o thumbnail, ma l'ambiente stesso in cui galleggiano i testi.
- I testi risiedono sopra le fotografie, protetti da gradienti a sfumatura scura cinematografica o vetro satinato continuo.

### 4. Responsiveness Differenziata
- **Desktop**: Esperienza a tutta larghezza con colonne continue senza gap, split-screen edge-to-edge e scrollytelling interattivo.
- **Mobile**: Slider orizzontali a pieno schermo senza bordi (`scroll-snap`), navigazione veloce con dock inferiore.
