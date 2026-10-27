#!/bin/bash
# Doppio clic per avviare sito + dashboard ColBel in locale (macOS)
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 non trovato. Installalo da https://www.python.org/downloads/ e riprova."
  read -n 1 -s -r -p "Premi un tasto per chiudere..."
  exit 1
fi
python3 server.py
