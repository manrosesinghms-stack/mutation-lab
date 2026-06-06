"""Threaded static dev server that disables caching, so every reload serves the
latest files. The stock `python -m http.server` is single-threaded (hangs on
HTTP/1.1 keep-alive) and lets the browser cache JS modules (serving stale code).
Usage: python tools/devserver.py [port]"""
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8137


class NoCacheHandler(SimpleHTTPRequestHandler):
    # strip conditional headers so we always send a fresh 200 (never a 304)
    def send_head(self):
        for h in ("If-Modified-Since", "If-None-Match"):
            if h in self.headers:
                del self.headers[h]
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    ThreadingHTTPServer.allow_reuse_address = True
    httpd = ThreadingHTTPServer(("", PORT), NoCacheHandler)
    print(f"Mutation Lab dev server on http://localhost:{PORT} (threaded, no-cache)")
    httpd.serve_forever()
