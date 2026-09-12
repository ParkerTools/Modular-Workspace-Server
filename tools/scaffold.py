#!/usr/bin/env python3
"""Emit the Modular Workspace Server page skeleton.

Flat static output: every page is a complete standalone HTML file linking one
shared stylesheet and one shared script. No build step is needed to *serve*
the site; this script exists only so the shared chrome is written once here
rather than nine times by hand.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from content import CONTENT
except ImportError:
    CONTENT = {}

SITE = "Modular Workspace Server"
TAGLINE = "A friendly guide and Compose generator for a self-hosted work and document server"
BASE = "https://USER.github.io/REPO/"   # placeholder - see README
THEME_KEY = "mws-theme"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# reading path order == nav order
PAGES = [
    # file, nav label, page title, kicker, h1, hero blurb, pager blurb, sections
    ("index.html", "Home", "A self-hosted workspace you can actually maintain",
     "Start here",
     "Run your own documents, notes and code, on one box.",
     "Twenty-four containers, grouped by the job they do, with honest notes on which ones overlap and which ones you should not run together.",
     "What this project is and who it is for",
     [("what", "What this is"), ("who", "Who it is for"),
      ("stack", "The stack at a glance"), ("start", "Where to start")]),

    ("guide.html", "Guide", "Guide",
     "Foundations",
     "The parts you need before any of this runs.",
     "Docker, Compose, volumes, networks and reverse proxies, explained once so the rest of the site can assume them.",
     "Docker, Compose and the concepts the rest of the site assumes",
     [("docker", "Docker and Compose"), ("volumes", "Volumes and where data lives"),
      ("networks", "Networks and container names"), ("proxy", "Reverse proxies"),
      ("updates", "Updating without breaking things")]),

    ("platforms.html", "Platforms", "Platforms",
     "Where it runs",
     "Pick the box before you pick the apps.",
     "NAS, mini PC, VPS or an old laptop. What each one can carry, and the point at which a stack outgrows it.",
     "NAS, mini PC, VPS: what each can carry",
     [("nas", "NAS"), ("minipc", "Mini PC and home server"),
      ("vps", "VPS"), ("pi", "Raspberry Pi and ARM"),
      ("compare", "Side by side")]),

    ("generator.html", "Generator", "Compose generator",
     "Build your stack",
     "Choose your modules, get your files.",
     "Pick the containers you want. The generator resolves dependencies, generates secrets in your browser, and writes docker-compose.yml, .env and the rest.",
     "Pick modules and generate your compose files",
     [("modules", "Modules"), ("storage", "Storage"), ("connection", "Connection"),
      ("credentials", "Credentials"), ("secrets", "Secrets"),
      ("review", "Review"), ("files", "Files")]),

    ("setup.html", "App setup", "App setup",
     "After first boot",
     "What to do inside each app once it is running.",
     "First-run steps, the settings worth changing, and the specific place each app tends to trip people up.",
     "First-run steps for every container",
     [("documents", "Documents and PDFs"), ("archive", "Document archives"),
      ("notes", "Notes and wikis"), ("code", "Code forges"),
      ("transfer", "File transfer"), ("boards", "Boards and workspaces"),
      ("dash", "Dashboards")]),

    ("access.html", "Access", "Access",
     "Getting in",
     "Reaching your stack from outside the house.",
     "Reverse proxy, VPN, tunnels and authentication. Including the containers that should never be published, and why.",
     "Reverse proxy, VPN, tunnels and what must stay private",
     [("options", "Your options"), ("proxy", "Reverse proxy"),
      ("vpn", "VPN"), ("tunnel", "Tunnels"),
      ("auth", "Authentication"), ("never", "What never gets published")]),

    ("hardware.html", "Hardware", "Hardware",
     "Sizing",
     "How much machine this actually needs.",
     "RAM and disk per module, what OCR and search cost you, and which two apps in this list will eat a small server on their own.",
     "RAM, disk and what each module costs you",
     [("ram", "RAM"), ("disk", "Disk"), ("cpu", "CPU and OCR"),
      ("backups", "Backups"), ("examples", "Example builds")]),

    ("documentation.html", "Docs", "Documentation",
     "Reference",
     "Every module, one entry each.",
     "Image, ports, required environment variables, volumes and licence for each container, with the upstream link the entry was checked against.",
     "Per-module reference: images, ports, variables, volumes",
     [("how", "How to read an entry"), ("pdf", "PDF tools"),
      ("archives", "Document archives"), ("knowledge", "Notes, wikis and libraries"),
      ("forges", "Code forges"), ("filetransfer", "File transfer"),
      ("workspaces", "Workspaces and boards"), ("meeting", "Meetings and signing"),
      ("dashboards", "Dashboards")]),

    ("faq.html", "Help", "Help",
     "When it breaks",
     "The things that go wrong, and what to do about them.",
     "Container running but app wedged, permission errors, port clashes, and the upgrade traps specific to these apps.",
     "Troubleshooting and common questions",
     [("first", "Check these first"), ("perms", "Permissions"),
      ("ports", "Port clashes"), ("upgrades", "Upgrade traps"),
      ("data", "Getting your data back out")]),
]


def head(fname, title, desc):
    full = f"{title} · {SITE}" if fname != "index.html" else f"{SITE} · {TAGLINE}"
    url = BASE + ("" if fname == "index.html" else fname)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{full}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{SITE}">
<meta property="og:title" content="{full}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#006C87">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23006C87'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%23FDFCDC'/%3E%3Ccircle cx='16' cy='16' r='2.5' fill='%23F07167'/%3E%3C/svg%3E">
<script>
(function(){{
  var t;
  try{{ t=localStorage.getItem('{THEME_KEY}'); }}catch(e){{}}
  if(!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme',t);
}})();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:opsz,wght@9..144,700&display=swap">
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
<a class="skiplink" href="#main">Skip to content</a>
"""


def nav(current):
    links = []
    for f, label, *_ in PAGES:
        cur = ' aria-current="page"' if f == current else ''
        links.append(f'<a href="{f}"{cur}>{label}</a>')
    return ('<div class="wrap"><nav><a class="brand" href="index.html">modular<span>.</span>workspace</a>'
            '<div class="navlinks">' + "".join(links) + '</div>'
            '<div class="navtools">'
            '<button class="themebtn" id="themebtn" aria-label="Switch between light and dark">'
            '<svg class="i-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
            '<svg class="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/>'
            '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
            '</button>'
            '<button class="navbtn" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>'
            '</div></nav></div>\n')


def pager(i):
    prev_a = next_a = ""
    if i > 0:
        f, label, title, *rest = PAGES[i - 1]
        sub = PAGES[i - 1][6]
        prev_a = (f'<a class="prev" href="{f}"><span class="dir">← Previous</span>'
                  f'<span class="ttl">{title}</span><span class="sub">{sub}</span></a>')
    if i < len(PAGES) - 1:
        f, label, title, *rest = PAGES[i + 1]
        sub = PAGES[i + 1][6]
        next_a = (f'<a class="next" href="{f}"><span class="dir">Next →</span>'
                  f'<span class="ttl">{title}</span><span class="sub">{sub}</span></a>')
    return f'<div class="wrap"><div class="pager">\n{prev_a}\n{next_a}\n</div></div>\n'


FOOTER = f"""<footer class="sitefoot"><div class="wrap">
<div class="footgrid">
<div class="footbrand"><div class="fb">modular<span style="color:var(--coral)">.</span>workspace</div>
<p>{TAGLINE}.</p></div>
<div class="footcol"><b>Getting started</b><a href="index.html">Home</a><a href="guide.html">Guide</a><a href="platforms.html">Platforms</a></div>
<div class="footcol"><b>Building</b><a href="generator.html">Generator</a><a href="setup.html">App setup</a><a href="access.html">Access</a></div>
<div class="footcol"><b>Reference</b><a href="hardware.html">Hardware</a><a href="documentation.html">Docs</a><a href="faq.html">Help</a></div>
</div>
<div class="footbase">Every module entry is checked against upstream documentation before it is published. Where something could not be verified, the page says so. · PLACEHOLDER: licence and attribution line.</div>
</div></footer>
<script src="assets/site.js"></script>
</body></html>
"""

EXTRA_SCRIPTS = {"generator.html": ["generator_core.js", "generator_ui.js"]}

STUB = ('<p class="lead">PLACEHOLDER. This section is a stub: heading, anchor and '
        'position in the reading path are final, the prose is not written yet.</p>\n')


def build():
    for i, (fname, label, title, kicker, h1, blurb, pagersub, sections) in enumerate(PAGES):
        out = [head(fname, title, blurb), nav(fname)]
        out.append(f'<section class="hero"><div class="wrap"><div class="kicker">{kicker}</div>\n'
                   f'<h1>{h1}</h1>\n<p>{blurb}</p></div></section>\n')
        out.append('<div class="wrap"><div class="layout">\n')
        toc = ['<aside class="toc" id="toc">\n<strong>On this page</strong>\n']
        for sid, stitle in sections:
            toc.append(f'<a href="#{sid}">{stitle}</a>\n')
        toc.append('</aside>\n')
        out.append("".join(toc))
        out.append('<main id="main">\n')
        for sid, stitle in sections:
            body = CONTENT.get(fname, {}).get(sid, STUB)
            out.append(f'<section id="{sid}">\n<h2>{stitle}</h2>\n{body}</section>\n\n')
        out.append('</main>\n</div></div>\n')
        out.append(pager(i))
        extra = ""
        for src in EXTRA_SCRIPTS.get(fname, []):
            with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), src),
                      encoding="utf-8") as fh:
                extra += "<script>\n" + fh.read().rstrip() + "\n</script>\n"
        out.append(extra)
        out.append(FOOTER)
        open(os.path.join(ROOT, fname), "w", encoding="utf-8").write("".join(out))
        print("wrote", fname)

    # 404 uses the same chrome, no pager
    out = [head("404.html", "Page not found", "That page does not exist on this site."),
           nav("404.html")]
    out.append('<section class="hero"><div class="wrap"><div class="kicker">404</div>\n'
               '<h1>That page is not here.</h1>\n'
               '<p>The link may be old, or the page may have been renamed. '
               'The nav above still works, and every page is reachable from the '
               '<a href="index.html">home page</a>.</p></div></section>\n')
    out.append('<div class="wrap"><main id="main">\n<section id="where">\n<h2>Where to go instead</h2>\n'
               '<ul>\n<li><a href="guide.html">Guide</a> — Docker and Compose basics</li>\n'
               '<li><a href="generator.html">Generator</a> — build a compose file</li>\n'
               '<li><a href="documentation.html">Docs</a> — per-module reference</li>\n'
               '<li><a href="faq.html">Help</a> — troubleshooting</li>\n</ul>\n</section>\n</main></div>\n')
    out.append(FOOTER)
    open(os.path.join(ROOT, "404.html"), "w", encoding="utf-8").write("".join(out))
    print("wrote 404.html")


if __name__ == "__main__":
    build()
