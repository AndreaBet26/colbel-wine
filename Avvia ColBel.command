#!/bin/bash
# ==============================================================
# ColBel - Avvio Server Locale + Dashboard (macOS)
# Doppio clic per avviare il sito e l'editor di contenuti
# ==============================================================

cd "$(dirname "$0")"

# Imposta il titolo della finestra del Terminale
printf "\e]2;ColBel Server Locale + Dashboard\a"

# Assicura che i percorsi standard di Python su Mac (Homebrew Apple Silicon / Intel, Framework ufficiale) siano nel PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:/Library/Frameworks/Python.framework/Versions/Current/bin:$PATH"

PYTHON_BIN=""

if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
fi

if [ -z "$PYTHON_BIN" ]; then
    echo ""
    echo "=============================================================="
    echo " [ERRORE] Python non e' stato trovato sul tuo Mac."
    echo ""
    echo " Per avviare il server locale e la dashboard e' necessario Python."
    echo " Scaricalo gratuitamente da: https://www.python.org/downloads/"
    echo " oppure installalo con Homebrew: brew install python"
    echo "=============================================================="
    echo ""
    read -n 1 -s -r -p "Premi un tasto per chiudere..."
    echo ""
    exit 1
fi

echo "=============================================================="
echo "  ColBel - Server Locale + Dashboard"
echo "  Interprete: $($PYTHON_BIN --version 2>&1) ($PYTHON_BIN)"
echo "=============================================================="
echo ""

$PYTHON_BIN server.py "$@"

echo ""
echo "Server terminato."
read -n 1 -s -r -p "Premi un tasto per chiudere la finestra..."
echo ""
