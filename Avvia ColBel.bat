@echo off
title ColBel Server Locale + Dashboard
cd /d "%~dp0"

:: Pulisci PATH da eventuali virgolette sporche di sistema e aggiungi WindowsApps
set "PATH=%PATH:"=%"
set "PATH=%PATH%;%LOCALAPPDATA%\Microsoft\WindowsApps"

set "PYTHON_EXE="

:: 1. Verifica percorso diretto WindowsApps (Python Microsoft Store)
if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe" (
    "%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe" --version >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set "PYTHON_EXE=%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"
    )
)

:: 2. Verifica comando python nel PATH
if not defined PYTHON_EXE (
    python --version >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set "PYTHON_EXE=python"
    )
)

:: 3. Verifica launcher py
if not defined PYTHON_EXE (
    py --version >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set "PYTHON_EXE=py"
    )
)

:: 4. Verifica installazioni standard Python 3
if not defined PYTHON_EXE (
    for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*") do (
        if exist "%%D\python.exe" set "PYTHON_EXE=%%D\python.exe"
    )
)
if not defined PYTHON_EXE (
    for /d %%D in ("%ProgramFiles%\Python3*") do (
        if exist "%%D\python.exe" set "PYTHON_EXE=%%D\python.exe"
    )
)

:: Se non trovato, mostra istruzioni
if not defined PYTHON_EXE (
    echo.
    echo ==============================================================
    echo [ERRORE] Python non e' stato trovato nel sistema.
    echo.
    echo Per avviare il server locale e la dashboard e' necessario Python.
    echo Scaricalo gratuitamente da: https://www.python.org/downloads/
    echo oppure installalo dal Microsoft Store cercando "Python 3.11".
    echo ==============================================================
    echo.
    pause
    exit /b 1
)

echo ==============================================================
echo   ColBel - Server Locale + Dashboard
echo   Interprete: %PYTHON_EXE%
echo ==============================================================
echo.

"%PYTHON_EXE%" server.py %*

echo.
echo Server terminato.
pause
