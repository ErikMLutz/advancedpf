#!/usr/bin/env python3
"""Local dev server: serves web/ as the document root at localhost:8000,
while mounting the top-level data/ directory at /realdata/.
"""
import http.server
import os
import posixpath
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(ROOT, 'web')
DATA_DIR = os.path.join(ROOT, 'data')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def translate_path(self, path):
        parsed = path.split('?', 1)[0].split('#', 1)[0]
        parsed = urllib.parse.unquote(parsed)
        normalized = posixpath.normpath(parsed)
        parts = [p for p in normalized.split('/') if p and p not in (os.curdir, os.pardir)]

        if parts[:1] == ['realdata']:
            base = DATA_DIR
            parts = parts[1:]
        else:
            base = WEB_DIR

        result = base
        for part in parts:
            result = os.path.join(result, part)
        if parsed.endswith('/'):
            result += '/'
        return result


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = http.server.ThreadingHTTPServer(('', port), Handler)
    print(f"Serving web/ at http://localhost:{port}/  (data/ mounted at /realdata/)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
