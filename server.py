#!/usr/bin/env python3
"""
ColBel – Server locale per sito + dashboard.

Avvio:  python3 server.py        (oppure doppio clic su "Avvia ColBel.command")
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
import sys
import threading
import webbrowser
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

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

    # I JSON non devono mai essere presi dalla cache del browser
    def end_headers(self):
        if self.path.split("?")[0].endswith(".json") or self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            sys.stderr.write("[ColBel] %s\n" % (fmt % args))

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
        return json.loads(self.rfile.read(length).decode("utf-8"))

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


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), ColBelHandler)
    url = "http://localhost:%d/" % PORT
    print("")
    print("  ColBel – server locale attivo")
    print("  Sito pubblico : %s" % url)
    print("  Dashboard     : %sadmin/" % url)
    print("  (chiudi questa finestra o premi Ctrl+C per fermarlo)")
    print("")
    if "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url + "admin/")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer fermato.")


if __name__ == "__main__":
    main()
