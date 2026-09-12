# Modular Workspace Server

A friendly guide and Compose generator for a self-hosted work and document server.

The second of a pair. [Modular Media Server](https://parkertools.github.io/Modular-Media-Server/)
is the beginner project: Docker from scratch, one media stack. This is the
intermediate one, and it assumes that ground is covered. Both share the design
system, the generator design and the voice; every page here links back.

This is the page skeleton. Structure, chrome, navigation and the design system
are in place; the prose is not written yet. Every section body currently reads
`PLACEHOLDER`.

## What is here

| Path | What it is |
|---|---|
| `index.html` … `faq.html` | The nine pages, in reading-path order |
| `404.html` | Not-found page using the site chrome |
| `assets/site.css` | The whole design system: tokens, components, both themes |
| `assets/site.js` | Mobile menu, theme toggle, table-of-contents highlighting |
| `tests/site.js` | Structure, links, navigation and contrast checks |
| `tests/validate.js` | Generator checks: compose, env, ports, safety, ZIP |
| `tools/scaffold.py` | Rebuilds the pages from `tools/content.py` |
| `tools/content.py` | The written page bodies |
| `tools/generator_core.js` | Generator logic, inlined into `generator.html` |
| `tools/generator_ui.js` | Generator DOM code, inlined into `generator.html` |
| `tools/emit-install-scripts.js` | Writes every generated script for shellcheck |
| `.github/workflows/ci.yml` | Runs both suites, shellcheck, and a drift check |
| `LICENSE` | MIT |
| `.nojekyll` | Stops GitHub Pages running Jekyll over the files |

Flat static files. Nothing needs building or installing to serve the site.

## Placeholders a maintainer must set

Two strings, both currently literal placeholder text:

1. **`https://USER.github.io/REPO/`** — the site's base URL. It appears in the
   `<link rel="canonical">` and `og:url` of all ten pages. Replace it
   everywhere:

   ```sh
   grep -rl 'USER.github.io/REPO' *.html | xargs sed -i 's|https://USER.github.io/REPO/|https://your-user.github.io/your-repo/|g'
   ```

That is the only placeholder left.

The copyright line in `LICENSE` reads `Copyright (c) 2026 Sam`. Change the name
if you want something else on it.

No `privacy.html`, deliberately. The site carries no affiliate links, no
analytics and no tracking, and stores nothing, so there is nothing to disclose.
`tests/site.js` enforces that: the only external origins any page may load from
are the two Google Fonts hosts, and adding an analytics tag fails the build.

## Reading path

Home → Guide → Platforms → Generator → App setup → Access → Hardware → Docs → Help

The pager at the foot of each page walks this chain. `tests/site.js` checks the
chain is intact, so adding or reordering a page means updating `PAGES` in
`tools/scaffold.py` and re-running the tests.

## Tests

```sh
node tests/site.js
```

No dependencies. Checks, per page: one `<main id="main">`, a skip link, a
canonical URL, a meta description, exactly one `aria-current="page"` pointing
at itself, no duplicate ids, balanced container tags, every internal link and
in-page anchor resolving, an identical nav link set, an identical footer line, a
correct pager, no leftover `PLACEHOLDER` text, and no third-party resource
loads. Then
every text token against every surface token in both themes at WCAG AA
(4.5:1). `<script>` blocks are stripped before link scanning.

```sh
node tests/validate.js
```

Extracts CORE from `generator.html` between the `==MWS-CORE-START==` and
`==MWS-CORE-END==` markers and runs it in a VM with no `document` or `window`,
which is what proves CORE stays free of the DOM. Then, for every preset in
every storage layout: the compose file parses as YAML, every service has an
image, every `depends_on` target exists, named volumes are declared, no two
services claim the same host port, no database publishes one, every `${VAR}`
resolves in `.env`, `.env.example` contains no real secret, blanks are written
as `CHANGEME`, and two builds of the same state are byte identical.

Then: every module builds on its own, all 300 module pairs are checked for host
port collisions with TCP and UDP counted separately, alternatives are proved
mutually exclusive, both generated scripts are proved to carry a byte-identical
platform block, the ZIP is walked entry by entry against its own CRCs, and the
two UI rules hold — no `oninput` handler re-renders a pane containing an input,
and no markup is ever assigned as a string.

## One tool per job

Modules carry a `job`. Two modules cannot share one: picking a second wiki,
forge or dashboard swaps the first out and takes its auto-added dependencies
with it. `CORE.wouldReplace(state, id)` tells the UI what a pick will displace,
which is what the badge in the module list shows.

## The two scripts

`install.sh` starts a generated stack. `install-arcane.sh` is standalone and
installs Arcane on its own, so it can go on a machine before the rest exists.
Both open with the same platform block: it separates WSL from plain Linux,
warns about `/mnt/c`, Docker Desktop's VM and Git Bash path rewriting, and
refuses to continue unless Docker, the Compose plugin and the daemon all
answer. POSIX `sh` throughout, since macOS ships bash 3.2. CI shellchecks all
24 generated variants.

## Editing pages

The HTML files are generated. Edit `tools/content.py`, then run:

```sh
python3 tools/scaffold.py
```

That rewrites all ten pages with identical chrome and re-inlines the generator
scripts into `generator.html`. CI fails if the committed HTML does not match
what `tools/scaffold.py` produces, so the two cannot drift apart.

The site itself still has no build step: what is committed is what is served.
`scaffold.py` exists so the chrome is written once rather than ten times.
