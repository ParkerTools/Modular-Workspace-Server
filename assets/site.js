#!/usr/bin/env node
/* tests/site.js — structural and contrast checks for the static pages.
   Run: node tests/site.js   (from the repo root, no dependencies)

   This is the first half of the suite described in the brief. It covers
   structure, links, anchors, landmarks and contrast. Generator checks live
   in tests/validate.js and are not written yet. */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();

let failures = 0;
let checks = 0;
function ok(name) { checks++; }
function fail(name, detail) {
  checks++; failures++;
  console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
}
function assert(cond, name, detail) { cond ? ok(name) : fail(name, detail); }

// Strip <script> blocks before scanning for links, so JS strings that look
// like hrefs are not treated as navigation.
const stripScripts = h => h.replace(/<script\b[\s\S]*?<\/script>/gi, '');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

console.log(`\nScanning ${PAGES.length} pages\n`);

/* ---------- per-page structure ---------- */
console.log('Structure');
for (const p of PAGES) {
  const raw = read(p);
  const html = stripScripts(raw);

  assert(/<html lang="en"/.test(raw), `${p}: html lang`);
  assert((raw.match(/<main id="main"/g) || []).length === 1, `${p}: exactly one <main id="main">`);
  assert(/class="skiplink" href="#main"/.test(raw), `${p}: skip link`);
  assert(/<link rel="canonical" href="https?:\/\/[^"]+"/.test(raw), `${p}: canonical URL`);
  assert(/<meta name="description" content="[^"]{10,}"/.test(raw), `${p}: meta description`);
  assert(/<title>[^<]{5,}<\/title>/.test(raw), `${p}: title`);
  assert(/id="themebtn"/.test(raw), `${p}: theme toggle`);
  assert(/class="navbtn"/.test(raw), `${p}: mobile menu button`);
  assert(/<footer class="sitefoot"/.test(raw), `${p}: shared footer`);

  // the design system styles <pre> directly and gives inline <code> a light
  // tinted background; nesting them puts a light box inside a dark block
  assert(!/<pre>\s*<code/.test(raw), `${p}: no <code> nested inside <pre>`);

  // duplicate ids
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
  assert(dupes.length === 0, `${p}: no duplicate ids`, dupes.join(', '));

  // aria-current: exactly one, and it points at this page (404 has none)
  const cur = [...raw.matchAll(/<a href="([^"]+)"\s+aria-current="page"/g)].map(m => m[1]);
  if (p === '404.html') {
    assert(cur.length === 0, `${p}: no aria-current on 404`);
  } else {
    assert(cur.length === 1 && cur[0] === p, `${p}: aria-current marks this page`, cur.join(','));
  }

  // tag balance for the containers that actually nest
  for (const tag of ['div', 'section', 'main', 'aside', 'nav', 'footer', 'details', 'ul', 'ol']) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    assert(open === close, `${p}: <${tag}> balanced`, `${open} open, ${close} close`);
  }
}

/* ---------- no placeholders, no third-party loads ---------- */
console.log('Publishing hygiene');
{
  // The two Google Fonts hosts are the only external origins the site loads
  // anything from. No analytics, no affiliate scripts, no tracking pixels.
  const ALLOWED = ['fonts.googleapis.com', 'fonts.gstatic.com'];
  for (const p of PAGES) {
    const raw = read(p);
    assert(!/PLACEHOLDER/.test(raw), `${p}: no PLACEHOLDER text left`);

    const loads = [
      ...raw.matchAll(/<script[^>]+src="(https?:\/\/[^"]+)"/gi),
      ...raw.matchAll(/<img[^>]+src="(https?:\/\/[^"]+)"/gi),
      ...raw.matchAll(/<iframe[^>]+src="(https?:\/\/[^"]+)"/gi),
      ...raw.matchAll(/<link[^>]+href="(https?:\/\/[^"]+)"[^>]*rel="stylesheet"/gi),
      ...raw.matchAll(/<link[^>]+rel="(?:stylesheet|preconnect)"[^>]+href="(https?:\/\/[^"]+)"/gi)
    ].map(m => m[1]);

    for (const url of loads) {
      const host = url.replace(/^https?:\/\//, '').split('/')[0];
      assert(ALLOWED.includes(host), `${p}: loads nothing from ${host}`);
    }
  }
  assert(fs.existsSync(path.join(ROOT, 'LICENSE')), 'LICENSE exists');
  assert(/MIT License/.test(fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8')),
    'LICENSE is the MIT text');
  // the footer is shared chrome, so it must be identical everywhere
  const footOf = h => (h.match(/<div class="footbase">([\s\S]*?)<\/div>/) || [, ''])[1];
  const footBase = footOf(read(PAGES[0]));
  assert(/MIT licensed/.test(footBase), 'the footer states the licence');
  for (const p of PAGES) {
    assert(footOf(read(p)) === footBase, `${p}: footer line matches every other page`);
  }
}

/* ---------- links and anchors ---------- */
console.log('Links');
for (const p of PAGES) {
  const html = stripScripts(read(p));
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  for (const h of hrefs) {
    if (/^(https?:|mailto:|data:)/.test(h)) continue;
    if (h.startsWith('#')) {
      const id = h.slice(1);
      assert(new RegExp(`id="${id}"`).test(html), `${p}: anchor ${h} resolves`);
    } else {
      const target = h.split('#')[0];
      assert(fs.existsSync(path.join(ROOT, target)), `${p}: link ${target} resolves`);
      const frag = h.split('#')[1];
      if (frag) {
        const other = stripScripts(read(target));
        assert(new RegExp(`id="${frag}"`).test(other), `${p}: ${target}#${frag} resolves`);
      }
    }
  }
}

/* ---------- nav consistency ---------- */
console.log('Navigation');
const navOf = h => (h.match(/<div class="navlinks">([\s\S]*?)<\/div>/) || [, ''])[1]
  .replace(/\s+aria-current="page"/g, '');
const baseline = navOf(read(PAGES[0]));
for (const p of PAGES) {
  assert(navOf(read(p)) === baseline, `${p}: nav link set matches every other page`);
}

// every nav target exists, and the reading path is a chain
const navTargets = [...baseline.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
for (const t of navTargets) {
  assert(fs.existsSync(path.join(ROOT, t)), `nav target ${t} exists`);
}
console.log('Pager');
for (let i = 0; i < navTargets.length; i++) {
  const p = navTargets[i];
  const html = read(p);
  const prev = (html.match(/class="prev" href="([^"]+)"/) || [])[1] || null;
  const next = (html.match(/class="next" href="([^"]+)"/) || [])[1] || null;
  assert(prev === (i === 0 ? null : navTargets[i - 1]), `${p}: prev link`, `got ${prev}`);
  assert(next === (i === navTargets.length - 1 ? null : navTargets[i + 1]), `${p}: next link`, `got ${next}`);
}

/* ---------- module reference ---------- */
console.log('Module reference');
{
  const MODULES = ['Stirling-PDF','BentoPDF','PdfDing','Paperless-ngx','Docspell',
    'BookStack','Wiki.js','Obsidian','Kiwix','Forgejo','Gogs','PairDrop',
    'PsiTransfer','Zipline','Chibisafe','CryptPad','Calligra','AppFlowy','Huly',
    'Wekan','Jitsi Meet','OpenSign','Homarr','Dashy'];
  const docs = read('documentation.html');
  const entries = [...docs.matchAll(/<details class="app"><summary><b>([^<]+)<\/b>/g)].map(m => m[1]);
  assert(entries.length === MODULES.length,
    `documentation.html: ${MODULES.length} module entries`, `found ${entries.length}`);
  for (const m of MODULES) {
    assert(entries.includes(m), `documentation.html: entry for ${m}`);
  }
  // every entry carries exactly one verification pill
  const bodies = docs.split('<details class="app">').slice(1);
  bodies.forEach((b, i) => {
    const pills = (b.match(/class="pill (first|after)"/g) || []).length;
    assert(pills === 1, `documentation.html: ${entries[i]} has one status pill`, `found ${pills}`);
  });
  // an unverified entry must not also present an image name
  bodies.forEach((b, i) => {
    if (/class="pill after"/.test(b)) {
      assert(!/<dt>Image<\/dt>/.test(b),
        `documentation.html: ${entries[i]} is unverified and states no image`);
    }
  });
}

/* ---------- contrast ---------- */
console.log('Contrast (WCAG AA, 4.5:1)');
const css = fs.readFileSync(path.join(ROOT, 'assets/site.css'), 'utf8');

function tokensFrom(block) {
  const t = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/g)) {
    t[m[1]] = m[2];
  }
  return t;
}
// light tokens: the :root block. dark: the [data-theme="dark"] block.
const lightBlock = css.match(/:root\{([\s\S]*?)\}/)[1];
const darkBlock = css.match(/html\[data-theme="dark"\]\{([\s\S]*?)\}/)[1];
const light = tokensFrom(lightBlock);
const dark = Object.assign({}, light, tokensFrom(darkBlock));

function parse(c) {
  if (c.startsWith('#')) {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16));
  }
  const n = c.match(/[\d.]+/g).map(Number);
  return [n[0], n[1], n[2]];
}
function lum([r, g, b]) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const [x, y] = [lum(parse(a)), lum(parse(b))].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// Every text token against every surface it can legitimately sit on.
const FG = ['--ink', '--muted', '--blue', '--code-fg', '--ok', '--bad', '--warnfg'];
const BG = ['--cream', '--white', '--surface', '--tint-teal', '--tint-peach',
            '--tint-soft', '--warn-bg', '--tip-bg'];
const PAIRS = [
  ['--pill-peach-fg', '--pill-peach-bg'],
  ['--pill-coral-fg', '--pill-coral-bg'],
  ['--code-fg', '--tint-teal'],
  ['--code-txt', '--code-bg'],
  ['--accent-fg', '--blue'],
  ['--accent-fg', '--blue-hover'],
];

for (const [name, T] of [['light', light], ['dark', dark]]) {
  for (const fg of FG) for (const bg of BG) {
    if (!T[fg] || !T[bg]) { fail(`${name}: token ${fg} or ${bg} missing`); continue; }
    const r = ratio(T[fg], T[bg]);
    assert(r >= 4.5, `${name}: ${fg} on ${bg}`, `${r.toFixed(2)}:1`);
  }
  for (const [fg, bg] of PAIRS) {
    if (!T[fg] || !T[bg]) { fail(`${name}: token ${fg} or ${bg} missing`); continue; }
    const r = ratio(T[fg], T[bg]);
    assert(r >= 4.5, `${name}: ${fg} on ${bg}`, `${r.toFixed(2)}:1`);
  }
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.log(`${failures} failed\n`); process.exit(1); }
console.log('');
