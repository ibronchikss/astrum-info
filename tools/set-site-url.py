#!/usr/bin/env python3
"""Прописывает адрес сайта в тегах превью ссылки (og:url, og:image, twitter:image) во всех .html.

Запуск из корня репозитория:
    python3 tools/set-site-url.py https://ibronchikss.github.io/astrum/
Адрес — тот, по которому сайт открывается на GitHub Pages (со слэшем на конце).
"""
import glob
import re
import sys

if len(sys.argv) != 2 or not sys.argv[1].startswith("https://"):
    sys.exit("Укажите адрес сайта, например: python3 tools/set-site-url.py https://ibronchikss.github.io/astrum/")

base = sys.argv[1] if sys.argv[1].endswith("/") else sys.argv[1] + "/"

for path in sorted(glob.glob("*.html")):
    text = open(path, encoding="utf-8").read()
    page = "" if path == "index.html" else path
    text = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + base + page + m.group(2), text)
    text = re.sub(r'(<meta property="og:image(?::secure_url)?" content=")[^"]*(")', lambda m: m.group(1) + base + "assets/images/og-image.png" + m.group(2), text)
    text = re.sub(r'(<meta name="twitter:image" content=")[^"]*(")', lambda m: m.group(1) + base + "assets/images/og-image.png" + m.group(2), text)
    open(path, "w", encoding="utf-8").write(text)
    print("обновлено:", path)
