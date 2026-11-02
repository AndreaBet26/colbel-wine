@echo off
chcp 65001 >nul
rem Doppio clic: salva tutte le modifiche del sito e le manda su GitHub.
cd /d "%~dp0"
echo === Pubblica il sito ColBel su GitHub ===
echo.
git rev-parse --is-inside-work-tree >nul 2>&1 || (echo Questa cartella non e' un progetto git. & pause & exit /b 1)
set "CHANGES="
for /f "delims=" %%i in ('git status --porcelain') do set CHANGES=1
if defined CHANGES (
  echo File modificati:
  git status --short
  echo.
  set "MSG="
  set /p "MSG=Descrivi le modifiche (oppure premi Invio): "
)
if defined CHANGES (
  if not defined MSG set "MSG=Aggiornamento sito %date% %time:~0,5%"
)
if defined CHANGES (
  git add -A
  git commit -q -m "%MSG%" || (echo Errore durante il salvataggio. & pause & exit /b 1)
  echo Modifiche salvate.
) else (
  echo Nessuna modifica nuova da salvare.
)
echo.
echo Scarico eventuali aggiornamenti fatti dall'altro computer...
git pull --rebase --autostash -q origin main
if errorlevel 1 (
  echo.
  echo ATTENZIONE: ci sono modifiche in conflitto tra questo computer e GitHub.
  echo Non ho pubblicato nulla. Chiedi a Claude di risolvere il conflitto.
  git rebase --abort >nul 2>&1
  pause
  exit /b 1
)
echo Invio su GitHub...
git push -q origin HEAD:main
if errorlevel 1 (
  echo Invio non riuscito: controlla la connessione o l'accesso a GitHub.
) else (
  echo.
  echo Fatto! Il sito su GitHub e' aggiornato.
)
pause
