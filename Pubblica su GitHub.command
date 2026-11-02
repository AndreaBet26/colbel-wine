#!/bin/bash
# Doppio clic: salva tutte le modifiche del sito e le manda su GitHub.
cd "$(dirname "$0")" || exit 1

pausa() { echo; read -n 1 -s -r -p "Premi un tasto per chiudere..."; echo; }

echo "=== Pubblica il sito ColBel su GitHub ==="
echo

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Questa cartella non è un progetto git."; pausa; exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "File modificati:"
  git status --short
  echo
  read -r -p "Descrivi le modifiche (oppure premi Invio): " msg
  [ -z "$msg" ] && msg="Aggiornamento sito $(date '+%d/%m/%Y %H:%M')"
  git add -A && git commit -q -m "$msg" || { echo "Errore durante il salvataggio (commit)."; pausa; exit 1; }
  echo "Modifiche salvate: $msg"
else
  echo "Nessuna modifica nuova da salvare."
fi

echo
echo "Scarico eventuali aggiornamenti fatti dall'altro computer..."
if ! git pull --rebase --autostash -q origin main; then
  echo
  echo "ATTENZIONE: ci sono modifiche in conflitto tra questo computer e GitHub."
  echo "Non ho pubblicato nulla. Chiedi a Claude di risolvere il conflitto."
  git rebase --abort >/dev/null 2>&1
  pausa; exit 1
fi

echo "Invio su GitHub..."
if git push -q origin HEAD:main; then
  echo
  echo "Fatto! Il sito su GitHub è aggiornato ($(git log -1 --format='%h %s'))."
else
  echo
  echo "Invio non riuscito: controlla la connessione o l'accesso a GitHub."
fi
pausa
