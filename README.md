# ColBel Vineyards & Winery — Sito

Sito di **ColBel Wine** (Solighetto, Treviso — Colline del Conegliano Valdobbiadene Prosecco Superiore DOCG).

## Pagine

| File | Contenuto |
|---|---|
| `index.html` | Home: apertura, la storia in breve, il territorio, la bottiglia che ruota (scrollytelling) e gli ingressi alle pagine |
| `storia.html` | La Cantina: la storia della famiglia, i numeri, il territorio |
| `vini.html` | Tutti i vini, uno dopo l'altro con la bottiglia grande, con ordine via WhatsApp |
| `esperienze.html` | Degustazioni e tour |
| `agriturismo.html` | La cucina di Lissa e il rullino fotografico |
| `contatti.html` | Persone, indirizzo e modulo (WhatsApp / email) |

Header, footer, finestra d'ordine e barra rapida per telefono sono uguali in tutte le pagine: se cambi una voce del menu, cambiala in tutti i file `.html`.

## Regole di stile

Tutto il sito usa un solo linguaggio visivo (vedi `assets/css/style.css`):

- **Solo tema scuro, un unico fondo continuo** (nero caldo con una grana leggerissima): non ci sono "stacchi" tra una sezione e l'altra.
- **Foto grandi dentro l'impaginazione, non come carta da parati.** Ogni foto tocca almeno un bordo della pagina (`bleed-left`, `bleed-right`, `bleed-full`) e sul lato interno si scioglie nel fondo (`fade-l`, `fade-r`, `fade-t`, `fade-b`).
- **Il testo si sovrappone alla foto solo in parte**, sul lato sfumato (`copy-left`, `copy-right-wide`…). Griglia a 12 colonne a tutta larghezza (`.grid`).
- **Stesso trattamento colore per tutte le foto** (variabile `--grade`), così foto a colori e in bianco e nero stanno bene insieme.
- **Due font:** Cormorant Garamond per i titoli, Plus Jakarta Sans per il testo. **Due azioni:** il bottone dorato `.btn` e il link con linea `.link`.
- Niente schede, box, bordi arrotondati o ombre.

## Animazioni (GSAP + ScrollTrigger + Lenis)

- **Scorrimento morbido** (Lenis, in `assets/js/vendor/`): la rotella "scivola", e tutte le animazioni legate allo scroll diventano fluide.
- **Sipario tra le pagine:** cliccando un link interno la pagina si chiude dal basso e la nuova si apre verso l'alto.
- **Aperture:** la foto si apre come una tenda dal bordo della pagina, i titoli salgono riga per riga; scorrendo la foto rallenta e il testo sfuma via. La foto segue appena il movimento del mouse.
- **Foto nel racconto:** si aprono dal bordo della pagina man mano che scorri (non di colpo) e poi scorrono più lente del testo.
- **Due momenti fermi in home:** il territorio (la foto si allontana e il titolo sale) e la bottiglia del Giusto che ruota mentre i capitoli compaiono a destra e a sinistra.
- **Nastri di parole** che scorrono con lo scroll; contatori sui numeri; bottiglie che salgono e si inclinano nella pagina Vini; indice in fondo alla home con la foto che cambia.
- Le animazioni restano attive anche se nel computer sono disattivati gli "effetti di animazione" di sistema. In modalità modifica le animazioni d'ingresso e lo scorrimento morbido sono spenti, per lasciare i testi cliccabili.

## Video della bottiglia

Oggi la home usa il PNG trasparente (`assets/images/bottiglie/giusto.png`) con una rotazione 3D simulata e un riflesso di luce.
Quando avrai il video della bottiglia che ruota **già senza sfondo**:

1. Esporta i fotogrammi in WebP trasparente nella cartella `assets/bottiglia/`, con nomi numerati a 4 cifre. Con ffmpeg, da un video con canale alfa (es. ProRes 4444 o WebM VP9):
   ```
   ffmpeg -i bottiglia.mov -vf "fps=30,scale=-2:1400" -c:v libwebp -lossless 0 -q:v 80 assets/bottiglia/giusto-%04d.webp
   ```
   Tra 90 e 150 fotogrammi bastano per una rotazione fluida (una rotazione completa di 4–5 secondi a 30 fps).
2. In `index.html`, nel blocco `<div class="bottle-stage" id="bottleStage" …>`, imposta `data-frames` con il numero di fotogrammi (es. `data-frames="120"`).

Lo scroll a quel punto "sfoglia" i fotogrammi su un canvas: la bottiglia gira esattamente quanto scorri, avanti e indietro.

## Immagini

- `assets/images/web/` — copie leggere (max 2200 px) delle foto usate come sfondi fissi.
- `assets/images/bottiglie/` — le sei bottiglie ritagliate tutte alla stessa altezza, così hanno la stessa scala in pagina (prima due PNG pesavano 13–15 MB l'uno).

## Tecnologie

HTML + CSS + JavaScript senza build. GSAP 3 e ScrollTrigger in `assets/js/vendor/`, icone FontAwesome 6.5, font Google.

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
- In modifica si può passare da una pagina all'altra dal menu in alto: la modalità modifica resta attiva.
