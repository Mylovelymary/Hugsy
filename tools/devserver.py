#!/usr/bin/env python3
"""Локальный сервер для разработки.

Обычный `python3 -m http.server` не присылает заголовков кеширования, и браузер
начинает отдавать старые CSS и JS из своего кеша — правки «не видны».
Здесь каждый ответ помечен no-store, поэтому обычной перезагрузки всегда достаточно.

Запуск:  python3 tools/devserver.py [порт]
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Тихо: интересны только ошибки
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print("Пингвинник: http://localhost:%d  (Ctrl+C — остановить)" % port)
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
