#!/usr/bin/env python3
"""
ColBel – Server locale per sito + dashboard (compatibile con macOS e Windows).

Avvio:
  - macOS:   Doppio clic su "Avvia ColBel.command" (oppure: python3 server.py)
  - Windows: Doppio clic su "Avvia ColBel.bat"     (oppure: python server.py)

Sito:   http://localhost:8080/
Admin:  http://localhost:8080/admin/

Serve i file statici della cartella e mette a disposizione due API usate
dalla dashboard per salvare le modifiche direttamente nei file del progetto:

  POST /api/save    {"file": "vini", "data": [...]}      -> data/vini.json
  POST /api/upload  {"name": "foto.jpg", "data": "<base64>"} -> assets/images/uploads/foto.jpg
  GET  /api/ping

Solo libreria standard Python, nessuna installazione richiesta.
Ascolta solo su 127.0.0.1: non è raggiungibile da altri computer.
"""

import base64
import json
import os
import re
import shutil
import socket
import sys
import threading
import urllib.request
import webbrowser
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Assicura flush immediato dei messaggi nel terminale
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
BACKUP_DIR = os.path.join(DATA_DIR, "_backup")
UPLOAD_DIR = os.path.join(ROOT, "assets", "images", "uploads")
PORT = int(os.environ.get("COLBEL_PORT", "8080"))

# Unici file che la dashboard può scrivere
ALLOWED_FILES = {
    "vini", "esperienze", "agriturismo", "chi-siamo",
    "territorio", "scrollytelling", "contatti", "impostazioni",
}
ALLOWED_IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024


class ColBelHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # I file del sito e le API non devono mai essere memorizzati in cache durante lo sviluppo
    def end_headers(self):
        clean_path = self.path.split("?")[0]
        if clean_path.endswith((".json", ".js", ".css", ".html", "/")) or self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            sys.stderr.write("[ColBel API] %s\n" % (fmt % args))

    # --- helpers ---
    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self, limit):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > limit:
            raise ValueError("Richiesta vuota o troppo grande")
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except UnicodeDecodeError:
            return json.loads(raw.decode("latin-1"))

    def _same_origin(self):
        origin = self.headers.get("Origin")
        if not origin:
            return True
        return re.match(r"^http://(localhost|127\.0\.0\.1)(:\d+)?$", origin) is not None

    # --- routes ---
    def do_GET(self):
        if self.path.split("?")[0] == "/api/ping":
            return self._json(200, {"ok": True, "server": "colbel-local"})
        return super().do_GET()

    def do_POST(self):
        route = self.path.split("?")[0]
        if not self._same_origin():
            return self._json(403, {"ok": False, "error": "Origine non consentita"})
        try:
            if route == "/api/save":
                return self._save()
            if route == "/api/upload":
                return self._upload()
            return self._json(404, {"ok": False, "error": "API sconosciuta"})
        except Exception as exc:  # risposta leggibile in dashboard
            return self._json(400, {"ok": False, "error": str(exc)})

    def _save(self):
        payload = self._read_body(5 * 1024 * 1024)
        name = str(payload.get("file", ""))
        if name not in ALLOWED_FILES:
            raise ValueError("File non consentito: %s" % name)
        if "data" not in payload:
            raise ValueError("Dati mancanti")

        target = os.path.join(DATA_DIR, name + ".json")
        os.makedirs(BACKUP_DIR, exist_ok=True)
        if os.path.exists(target):
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            shutil.copy2(target, os.path.join(BACKUP_DIR, "%s.%s.json" % (name, stamp)))
            self._prune_backups(name)

        tmp = target + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(payload["data"], fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        os.replace(tmp, target)
        return self._json(200, {"ok": True, "file": "data/%s.json" % name})

    def _prune_backups(self, name, keep=20):
        files = sorted(f for f in os.listdir(BACKUP_DIR) if f.startswith(name + "."))
        for old in files[:-keep]:
            try:
                os.remove(os.path.join(BACKUP_DIR, old))
            except OSError:
                pass

    def _upload(self):
        payload = self._read_body(int(MAX_UPLOAD_BYTES * 1.4))
        raw_name = os.path.basename(str(payload.get("name", "")))
        stem, ext = os.path.splitext(raw_name)
        ext = ext.lower()
        if ext not in ALLOWED_IMG_EXT:
            raise ValueError("Formato immagine non supportato (usa JPG, PNG, WEBP)")
        stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", stem).strip("-").lower() or "foto"
        data = payload.get("data", "")
        if "," in data[:100]:
            data = data.split(",", 1)[1]
        blob = base64.b64decode(data)
        if len(blob) > MAX_UPLOAD_BYTES:
            raise ValueError("Immagine troppo grande (max 15 MB)")

        os.makedirs(UPLOAD_DIR, exist_ok=True)
        filename = stem + ext
        n = 2
        while os.path.exists(os.path.join(UPLOAD_DIR, filename)):
            filename = "%s-%d%s" % (stem, n, ext)
            n += 1
        with open(os.path.join(UPLOAD_DIR, filename), "wb") as fh:
            fh.write(blob)
        return self._json(200, {"ok": True, "path": "assets/images/uploads/" + filename})


def is_port_busy(port):
    """Verifica se una porta e' attualmente in ascolto."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0


def check_existing_colbel(port):
    """Verifica se un'istanza di ColBel e' gia' in esecuzione su quella porta."""
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/api/ping")
        with urllib.request.urlopen(req, timeout=0.6) as resp:
            if resp.status == 200:
                payload = json.loads(resp.read().decode("utf-8"))
                return payload.get("server") == "colbel-local"
    except Exception:
        return False
    return False


def main():
    # 1. Se il server ColBel è già in esecuzione, apriamo direttamente il browser
    if is_port_busy(PORT) and check_existing_colbel(PORT):
        url = f"http://localhost:{PORT}/"
        print("")
        print("  =======================================================")
        print("  ColBel - Il server locale e' gia' attivo!")
        print(f"  Sito pubblico : {url}")
        print(f"  Dashboard     : {url}admin/")
        print("  =======================================================")
        print("")
        if "--no-browser" not in sys.argv:
            webbrowser.open(url + "admin/")
        return

    # 2. Cerca una porta disponibile partendo da PORT
    server = None
    active_port = PORT
    for p in range(PORT, PORT + 10):
        if is_port_busy(p):
            if check_existing_colbel(p):
                url = f"http://localhost:{p}/"
                print("")
                print("  =======================================================")
                print("  ColBel - Il server locale e' gia' attivo!")
                print(f"  Sito pubblico : {url}")
                print(f"  Dashboard     : {url}admin/")
                print("  =======================================================")
                print("")
                if "--no-browser" not in sys.argv:
                    webbrowser.open(url + "admin/")
                return
            continue

        try:
            # allow_reuse_address solo su Unix per evitare socket-hijack su Windows
            if sys.platform != "win32":
                ThreadingHTTPServer.allow_reuse_address = True
            server = ThreadingHTTPServer(("127.0.0.1", p), ColBelHandler)
            active_port = p
            break
        except OSError:
            continue

    if server is None:
        sys.stderr.write(f"\n[ERRORE] Impossibile avviare il server: tutte le porte da {PORT} a {PORT+9} sono occupate.\n")
        sys.exit(1)

    url = f"http://localhost:{active_port}/"
    print("")
    print("  =======================================================")
    print("  ColBel - Server Locale Attivo")
    print(f"  Sito pubblico : {url}")
    print(f"  Dashboard     : {url}admin/")
    print("  (premi Ctrl+C per fermare il server)")
    print("  =======================================================")
    print("")

    if "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url + "admin/")).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer fermato.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
