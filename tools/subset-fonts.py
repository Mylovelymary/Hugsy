#!/usr/bin/env python3
"""Пересборка латинских сабсетов шрифтов под реальный текст сайта.

Зачем: кириллические файлы содержат только буквы — ни цифр, ни точек с запятыми.
Поэтому inter-latin и manrope-latin скачиваются на каждой странице целиком,
хотя из всей латиницы нам нужны цифры, знаки препинания и редкие слова вроде Zigmund.

Что делает: собирает все символы, которые реально встречаются в файлах сайта,
выбрасывает кириллицу (она в своих файлах) и пересобирает латинские woff2
только под нужные глифы. Оригиналы кладёт в source/fonts-backup.

Запуск разовый, в сборку проекта не входит:
    python3 tools/subset-fonts.py
"""

import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, 'assets', 'fonts')
BACKUP = os.path.join(ROOT, 'source', 'fonts-backup')
TARGETS = ['inter-latin.woff2', 'manrope-latin.woff2']

# Файлы, из которых берём тексты интерфейса
SCAN_EXT = ('.html', '.js', '.css', '.webmanifest')
SKIP_DIRS = {'.git', 'assets/fonts', 'source', 'docs', '.claude'}

# Базовый набор, который нужен всегда, даже если прямо сейчас в текстах не встретился
BASE = set(chr(c) for c in range(0x20, 0x7F))          # печатаемый ASCII
BASE |= set(' «»—–…•·×°№₽←→↑↓“”‘’„')               # типографика, которой мы пользуемся


def collect_chars():
    chars = set()
    for dirpath, dirnames, filenames in os.walk(ROOT):
        rel = os.path.relpath(dirpath, ROOT).replace(os.sep, '/')
        if any(rel == d or rel.startswith(d + '/') for d in SKIP_DIRS):
            dirnames[:] = []
            continue
        dirnames[:] = [d for d in dirnames if d not in ('.git', 'node_modules')]
        for name in filenames:
            if not name.endswith(SCAN_EXT):
                continue
            with open(os.path.join(dirpath, name), encoding='utf-8', errors='ignore') as fh:
                chars |= set(fh.read())
    return chars


def main():
    try:
        from fontTools import subset  # noqa: F401
        import brotli  # noqa: F401
    except ImportError as e:
        sys.exit('Нет нужных модулей (%s).\n'
                 'Поставь: sudo dnf install python3-fonttools python3-brotli' % e)

    from fontTools.subset import main as subset_main

    found = collect_chars()
    # Кириллица лежит в своих файлах, латинскому сабсету она не нужна
    keep = {c for c in (found | BASE)
            if c.isprintable() and not re.match(r'[Ѐ-ӿ́]', c)}
    keep = sorted(keep)
    unicodes = ','.join('U+%04X' % ord(c) for c in keep)

    os.makedirs(BACKUP, exist_ok=True)
    total_before = total_after = 0

    for name in TARGETS:
        src = os.path.join(FONTS, name)
        if not os.path.exists(src):
            print('пропускаю, нет файла:', name)
            continue
        backup = os.path.join(BACKUP, name)
        if not os.path.exists(backup):
            shutil.copy2(src, backup)
        before = os.path.getsize(backup)
        out = src + '.new'
        subset_main([
            backup,
            '--unicodes=' + unicodes,
            '--layout-features=*',
            '--flavor=woff2',
            '--output-file=' + out,
        ])
        after = os.path.getsize(out)
        os.replace(out, src)
        total_before += before
        total_after += after
        print('%-22s %6.1f КБ -> %6.1f КБ' % (name, before / 1024, after / 1024))

    print('-' * 46)
    print('всего: %.1f КБ -> %.1f КБ (минус %.1f КБ на каждую страницу)'
          % (total_before / 1024, total_after / 1024, (total_before - total_after) / 1024))
    print('символов в сабсете:', len(keep))
    print()
    print('Строка для unicode-range в style.css (латинские @font-face):')
    print(unicodes)


if __name__ == '__main__':
    main()
