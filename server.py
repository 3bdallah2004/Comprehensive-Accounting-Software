import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
WEB_DIR = ROOT / "www"
DATA_FILE = ROOT / "data.json"
DEFAULT_FILE = ROOT / "portable_default_data.json"
PORT = int(os.environ.get("PORT", "5173"))
MAX_DATA_SIZE = 10 * 1024 * 1024


class PortableHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def send_json(self, value, status=200):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlparse(self.path).path == "/api/data":
            source = DATA_FILE if DATA_FILE.exists() else DEFAULT_FILE
            try:
                with source.open("r", encoding="utf-8") as data_file:
                    self.send_json(json.load(data_file))
            except (OSError, json.JSONDecodeError) as error:
                self.send_json({"error": f"Unable to load data: {error}"}, 500)
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/data":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_DATA_SIZE:
                self.send_json({"error": "Invalid data size"}, 413)
                return
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                self.send_json({"error": "Data must be a JSON object"}, 400)
                return
            temporary_file = DATA_FILE.with_suffix(".json.tmp")
            with temporary_file.open("w", encoding="utf-8") as data_file:
                json.dump(payload, data_file, ensure_ascii=False, indent=2)
                data_file.flush()
                os.fsync(data_file.fileno())
            os.replace(temporary_file, DATA_FILE)
            self.send_json({"ok": True})
        except (ValueError, UnicodeDecodeError, OSError) as error:
            self.send_json({"error": f"Unable to save data: {error}"}, 400)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), PortableHandler)
    print(f"Portable server running on http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
