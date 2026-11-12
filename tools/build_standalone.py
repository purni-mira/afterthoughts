#!/usr/bin/env python3
"""Build dist/afterthoughts.html: the whole app in ONE file.

Use it to drop Afterthoughts into any website builder that accepts a single HTML file,
to email it, or to open it straight from your computer. It works offline in Demo mode
and with any bring-your-own-key AI provider. (The service worker is skipped in this build.)

    python3 tools/build_standalone.py
"""
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")

# inline stylesheet
css = (ROOT / "css/app.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="css/app.css">', "<style>\n" + css + "\n</style>")

# inline scripts in order
def inline(match):
    src = match.group(1)
    code = (ROOT / src).read_text(encoding="utf-8")
    return "<script>\n/* " + src + " */\n" + code.replace("</script", "<\\/script") + "\n</script>"

html = html.replace('<script src="config.js"></script>', '<script>window.AFTERTHOUGHTS_STANDALONE = true;</script>\n<script src="config.js"></script>', 1)
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)

# icons as data URIs, drop manifest (needs separate files)
svg = (ROOT / "assets/icon.svg").read_bytes()
data_svg = "data:image/svg+xml;base64," + base64.b64encode(svg).decode()
png = (ROOT / "assets/icon-192.png").read_bytes()
data_png = "data:image/png;base64," + base64.b64encode(png).decode()
html = html.replace('href="assets/icon.svg"', 'href="' + data_svg + '"')
html = html.replace('href="assets/icon-192.png"', 'href="' + data_png + '"')
html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', "")
html = re.sub(r'<meta property="og:image"[^>]*>\n', "", html)

out = ROOT / "dist" / "afterthoughts.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print("Wrote", out.relative_to(ROOT), f"({out.stat().st_size // 1024} KB)")
