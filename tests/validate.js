#!/usr/bin/env node
/* tests/validate.js — checks the compose generator.
   Run: node tests/validate.js   (from the repo root, no dependencies)

   CORE is extracted from generator.html between the marker comments and run in
   a VM, so this tests the code that actually ships on the page rather than a
   copy of it. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

let failures = 0, checks = 0;
function ok() { checks++; }
function fail(name, detail) {
  checks++; failures++;
  console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`);
}
function assert(cond, name, detail) { cond ? ok() : fail(name, detail); }

/* ---------- extract CORE from the shipped page ---------- */

const page = fs.readFileSync(path.join(ROOT, 'generator.html'), 'utf8');
const START = '/* ==MWS-CORE-START==';
const END = '/* ==MWS-CORE-END== */';
const a = page.indexOf(START), b = page.indexOf(END);
if (a === -1 || b === -1) {
  console.log('  FAIL  could not find CORE markers in generator.html');
  process.exit(1);
}
const source = page.slice(a, b + END.length);

// Comments cannot execute. Strip them before any scan that asks what the code
// does, or a comment explaining a rule trips the check for that rule.
const stripJsComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const stripShComments = t => t.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
// Strings are data, not DOM access. "Send a document" in a module description
// is not a call to document.querySelector.
const stripJsStrings = t => t.replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
const code = stripJsStrings(stripJsComments(source));

// CORE must not touch the DOM. Running it in a context with no document or
// window proves it, and would throw here if that ever changed.
const sandbox = { crypto: require('crypto').webcrypto, console, Buffer, TextEncoder };
vm.createContext(sandbox);
vm.runInContext(source + '\n;__CORE__ = CORE;', sandbox, { filename: 'generator-core.js' });
const CORE = sandbox.__CORE__;

console.log(`\nCORE extracted from generator.html (${source.length} bytes)\n`);

/* ---------- a small YAML reader for the subset we emit ---------- */

function parseYaml(text) {
  const lines = text.split('\n')
    .filter(l => l.trim() !== '' && !/^\s*#/.test(l));
  let i = 0;

  function unquote(s) {
    s = s.trim();
    if (/^".*"$/.test(s)) return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return s;
  }
  function indentOf(l) { return l.match(/^ */)[0].length; }

  function parseBlock(depth) {
    // returns an object or an array depending on what it finds
    let obj = null;
    while (i < lines.length) {
      const line = lines[i];
      const ind = indentOf(line);
      if (ind < depth) break;
      if (ind > depth) throw new Error('unexpected indent at line: ' + line);
      const body = line.slice(ind);

      if (body.startsWith('- ')) {
        if (obj === null) obj = [];
        if (!Array.isArray(obj)) throw new Error('list item inside a map: ' + line);
        i++;
        obj.push(unquote(body.slice(2)));
        continue;
      }

      const m = body.match(/^([^:]+):\s*(.*)$/);
      if (!m) throw new Error('cannot parse line: ' + line);
      if (obj === null) obj = {};
      if (Array.isArray(obj)) throw new Error('map key inside a list: ' + line);
      const key = unquote(m[1]);
      const rest = m[2];
      i++;
      if (rest !== '') {
        obj[key] = unquote(rest);
      } else {
        const next = lines[i];
        if (next === undefined || indentOf(next) <= depth) obj[key] = null;
        else obj[key] = parseBlock(indentOf(next));
      }
    }
    return obj === null ? {} : obj;
  }
  const out = parseBlock(0);
  if (i !== lines.length) throw new Error('trailing content at line: ' + lines[i]);
  return out;
}

/* ---------- every preset in every storage layout ---------- */

console.log('Compose output');
const layouts = Object.keys(CORE.LAYOUTS);
const presets = Object.keys(CORE.PRESETS);

function stateFor(preset, layout, extra) {
  const st = CORE.newState();
  CORE.applyPreset(st, preset);
  st.layout = layout;
  st.domain = 'example.com';
  st.sandboxDomain = 'pad-sandbox.example.com';
  st.useProxy = true;
  Object.assign(st, extra || {});
  return st;
}

const combos = [];
for (const p of presets) for (const l of layouts) combos.push([p, l]);

for (const [preset, layout] of combos) {
  const tag = `${preset}/${layout}`;
  const st = stateFor(preset, layout);
  let doc = null;
  try {
    doc = parseYaml(CORE.buildCompose(st));
    ok();
  } catch (e) {
    fail(`${tag}: compose parses as YAML`, e.message);
    continue;
  }

  assert(doc.services && Object.keys(doc.services).length > 0,
    `${tag}: has services`);

  // every service has an image
  for (const [name, svc] of Object.entries(doc.services)) {
    assert(typeof svc.image === 'string' && svc.image.length > 0,
      `${tag}: ${name} has an image`);
  }

  // named layout must declare its volumes at the top level
  if (CORE.LAYOUTS[layout].named) {
    const declared = Object.keys(doc.volumes || {});
    for (const [name, svc] of Object.entries(doc.services)) {
      for (const v of (svc.volumes || [])) {
        const left = String(v).split(':')[0];
        if (/^[.\/]/.test(left)) continue;
        assert(declared.includes(left),
          `${tag}: named volume ${left} is declared`, `service ${name}`);
      }
    }
  }

  // depends_on must point at a service that exists
  for (const [name, svc] of Object.entries(doc.services)) {
    for (const dep of (svc.depends_on || [])) {
      assert(Object.keys(doc.services).includes(dep),
        `${tag}: ${name} depends_on ${dep} which exists`);
    }
  }
}

/* ---------- every ${VAR} resolves in .env ---------- */

console.log('Variable resolution');
for (const [preset, layout] of combos) {
  const tag = `${preset}/${layout}`;
  const st = stateFor(preset, layout);
  const env = CORE.buildEnv(st);
  const defined = new Set(
    env.split('\n').filter(l => /^[A-Z0-9_]+=/.test(l)).map(l => l.split('=')[0])
  );
  const files = CORE.buildFiles(st);
  for (const f of files) {
    if (f.name === '.env' || f.name === '.env.example') continue;
    const refs = [...f.body.matchAll(/\$\{([A-Z0-9_]+)\}/g)].map(m => m[1]);
    for (const r of new Set(refs)) {
      assert(defined.has(r), `${tag}: \${${r}} in ${f.name} is defined in .env`);
    }
  }
  // and nothing in .env is left empty
  for (const line of env.split('\n')) {
    if (!/^[A-Z0-9_]+=/.test(line)) continue;
    const [k, ...rest] = line.split('=');
    assert(rest.join('=').length > 0, `${tag}: ${k} has a value in .env`);
  }
}

/* ---------- host ports ---------- */

console.log('Host ports');
for (const [preset, layout] of combos) {
  const tag = `${preset}/${layout}`;
  const st = stateFor(preset, layout);
  const doc = parseYaml(CORE.buildCompose(st));
  const seen = new Map();
  for (const [name, svc] of Object.entries(doc.services)) {
    for (const p of (svc.ports || [])) {
      const host = String(p).split(':')[0];
      assert(!seen.has(host),
        `${tag}: host port ${host} is not claimed twice`,
        seen.has(host) ? `${seen.get(host)} and ${name}` : '');
      seen.set(host, name);
    }
  }
  // databases must not publish a port at all
  for (const dbName of ['postgres', 'mariadb', 'mongo', 'redis', 'solr']) {
    if (!doc.services[dbName]) continue;
    assert(!doc.services[dbName].ports,
      `${tag}: ${dbName} publishes no host port`);
  }
}

/* ---------- safety rules ---------- */

console.log('Safety');
{
  const st = stateFor('everything', 'bind', { dockerSocket: true });
  const caddy = CORE.buildCaddyfile(st);
  const compose = CORE.buildCompose(st);

  for (const m of CORE.MODULES.filter(m => m.neverExpose)) {
    // a proxied entry looks like "<id>.<domain> {"
    assert(!new RegExp(`^${m.id}\\.example\\.com \\{`, 'm').test(caddy),
      `${m.name} is not given a proxy entry`);
    assert(caddy.includes(m.name),
      `${m.name} is named in the exclusion comment`);
  }

  // the socket holder is excluded too, and only when the socket is mounted
  assert(!/^homarr\.example\.com \{/m.test(caddy),
    'Homarr is excluded while the Docker socket is mounted');
  const stNoSock = stateFor('everything', 'bind', { dockerSocket: false });
  assert(/^homarr\.example\.com \{/m.test(CORE.buildCaddyfile(stNoSock)),
    'Homarr is proxied when the socket is not mounted');
  assert(!CORE.buildCompose(stNoSock).includes('docker.sock'),
    'no Docker socket in compose unless asked for');
  assert(compose.includes('/var/run/docker.sock:/var/run/docker.sock:ro'),
    'the Docker socket is mounted read only when asked for');

  // upstream-only modules never get a compose service
  for (const m of CORE.MODULES.filter(m => m.deploy === 'upstream')) {
    assert(!new RegExp(`^  ${m.id}:`, 'm').test(compose),
      `${m.name} gets no invented compose service`);
    assert(CORE.buildReadme(st).includes(m.upstreamUrl),
      `${m.name} links to its upstream instructions in the README`);
  }

  // CryptPad's two origins
  const same = stateFor('large', 'bind');
  same.sandboxDomain = 'pad.example.com';
  assert(CORE.validate(same).errors.some(e => /sandbox/i.test(e)),
    'identical CryptPad origins are a blocking error');
  const blank = stateFor('large', 'bind');
  blank.sandboxDomain = '';
  assert(CORE.validate(blank).errors.some(e => /sandbox/i.test(e)),
    'a missing CryptPad sandbox domain is a blocking error');

  // overlaps warn, never block
  const overlap = CORE.newState();
  CORE.add(overlap, 'bookstack', 'user');
  CORE.add(overlap, 'wikijs', 'user');
  const ov = CORE.validate(overlap);
  assert(ov.warnings.some(w => /same job/.test(w)), 'two wikis produce a warning');
  assert(!ov.errors.some(e => /same job/.test(e)), 'two wikis do not block');
}

/* ---------- .env.example leaks nothing ---------- */

console.log('Secret hygiene');
{
  const st = stateFor('everything', 'bind');
  const example = CORE.buildEnvExample(st);
  const specs = CORE.secretSpecs(st);
  assert(specs.length > 0, 'there are secrets to check');
  for (const s of specs) {
    const real = st.secrets[s.key];
    assert(!example.includes(real), `.env.example does not contain the real ${s.key}`);
    assert(new RegExp(`^${s.key}=CHANGEME$`, 'm').test(example),
      `.env.example writes ${s.key} as CHANGEME`);
  }
  // secrets are unique per service
  const values = specs.map(s => st.secrets[s.key]);
  assert(new Set(values).size === values.length, 'every secret value is unique');

  // required lengths that upstream actually enforces
  assert(/^[0-9a-f]{64}$/.test(st.secrets.HOMARR_SECRET_ENCRYPTION_KEY),
    'Homarr key is 64 hex characters');
  assert(st.secrets.ZIPLINE_CORE_SECRET.length > 32,
    'Zipline secret is longer than 32 characters');
  assert(/^base64:/.test(st.secrets.BOOKSTACK_APP_KEY),
    'BookStack APP_KEY uses the base64: form');
  assert(Buffer.from(st.secrets.BOOKSTACK_APP_KEY.slice(7), 'base64').length === 32,
    'BookStack APP_KEY decodes to 32 bytes');

  // blanks become CHANGEME, never a guess
  const blankField = stateFor('everything', 'bind');
  blankField.fields = {};
  const env = CORE.buildEnv(blankField);
  for (const f of CORE.fieldSpecs(blankField)) {
    assert(new RegExp(`^${f.key}=CHANGEME$`, 'm').test(env),
      `${f.key} left blank is written as CHANGEME`);
  }

  // regenerating re-masks everything
  const masked = stateFor('usual', 'bind');
  const firstKey = CORE.secretSpecs(masked)[0].key;
  const before = masked.secrets[firstKey];
  masked.revealed[firstKey] = true;
  CORE.regenerateSecrets(masked);
  assert(Object.keys(masked.revealed).length === 0,
    'regenerating clears every revealed flag');
  assert(masked.secrets[firstKey] !== before, 'regenerating changes the value');
  assert(CORE.mask('abcdef') !== 'abcdef' && CORE.mask('abcdef').length === 6,
    'masking hides the value and keeps the length');
}

/* ---------- dependency behaviour ---------- */

console.log('Dependencies');
{
  const st = CORE.newState();
  CORE.add(st, 'paperless', 'user');
  assert(st.chosen.postgres === 'auto' && st.chosen.redis === 'auto',
    'requirements are added and marked auto');

  CORE.add(st, 'wikijs', 'user');
  CORE.remove(st, 'paperless');
  assert(!st.chosen.redis, 'an auto dependency nothing needs is dropped');
  assert(st.chosen.postgres === 'auto', 'an auto dependency still needed is kept');

  // a dependency the user picked explicitly survives
  const st2 = CORE.newState();
  CORE.add(st2, 'postgres', 'user');
  CORE.add(st2, 'paperless', 'user');
  assert(st2.chosen.postgres === 'user', 'an explicit choice is not downgraded to auto');
  CORE.remove(st2, 'paperless');
  assert(st2.chosen.postgres === 'user', 'a user-chosen dependency survives removal');
  assert(!st2.chosen.redis, 'the auto-added one does not');

  // removing a dependency takes its dependents with it
  const st3 = CORE.newState();
  CORE.add(st3, 'paperless', 'user');
  CORE.remove(st3, 'postgres');
  assert(!st3.chosen.paperless, 'removing a dependency removes what depended on it');

  // secrets follow the selection
  const st4 = CORE.newState();
  CORE.add(st4, 'homarr', 'user');
  assert(st4.secrets.HOMARR_SECRET_ENCRYPTION_KEY, 'selecting a module creates its secret');
  CORE.remove(st4, 'homarr');
  assert(!st4.secrets.HOMARR_SECRET_ENCRYPTION_KEY, 'removing it drops the secret');
}

/* ---------- install.sh ---------- */

console.log('install.sh');
for (const [preset, layout] of combos) {
  const tag = `${preset}/${layout}`;
  const st = stateFor(preset, layout);
  const sh = CORE.buildInstallSh(st);
  assert(sh.startsWith('#!/bin/sh\n'), `${tag}: install.sh is POSIX sh`);
  const shCode = stripShComments(sh);
  // bash 4+ syntax that macOS bash 3.2 cannot run
  assert(!/declare -A|mapfile|readarray|\$\{[A-Za-z_]+\^\^\}|\$\{[A-Za-z_]+,,\}|\[\[/.test(shCode),
    `${tag}: install.sh uses no bash 4 syntax`);
  assert(/set -eu/.test(shCode), `${tag}: install.sh sets -eu`);
  if (!CORE.LAYOUTS[layout].named) {
    assert(/mkdir -p/.test(shCode), `${tag}: install.sh creates storage directories`);
  }
}
{
  // the modules that document a required owner get a chown, and only those
  const st = stateFor('everything', 'bind');
  const sh = CORE.buildInstallSh(st);
  assert(/chown -R 1000/.test(sh), 'PsiTransfer gets its documented chown');
  assert(!/chown -R 1000[\s\S]*chown -R 1000[\s\S]*chown -R 1000/.test(sh),
    'chown is not applied indiscriminately');
}

/* ---------- ZIP ---------- */

console.log('ZIP');
{
  const st = stateFor('usual', 'bind');
  const files = CORE.buildFiles(st);
  const zip = CORE.zipStore(files);
  const buf = Buffer.from(zip);

  assert(buf.readUInt32LE(0) === 0x04034b50, 'starts with a local file header');

  // end of central directory, last 22 bytes when there is no comment
  const eocdOff = buf.length - 22;
  assert(buf.readUInt32LE(eocdOff) === 0x06054b50, 'ends with an EOCD record');
  assert(buf.readUInt16LE(eocdOff + 10) === files.length,
    'EOCD counts every file', `${buf.readUInt16LE(eocdOff + 10)} vs ${files.length}`);

  const cdirSize = buf.readUInt32LE(eocdOff + 12);
  const cdirOff = buf.readUInt32LE(eocdOff + 16);
  assert(cdirOff + cdirSize === eocdOff, 'central directory offset and size line up');
  assert(buf.readUInt32LE(cdirOff) === 0x02014b50, 'central directory starts where it says');

  // walk every local header and verify the stored bytes and CRC
  let off = 0;
  for (const f of files) {
    assert(buf.readUInt32LE(off) === 0x04034b50, `local header for ${f.name}`);
    assert(buf.readUInt16LE(off + 8) === 0, `${f.name} uses the STORE method`);
    const crc = buf.readUInt32LE(off + 14);
    const size = buf.readUInt32LE(off + 18);
    const nameLen = buf.readUInt16LE(off + 26);
    const name = buf.slice(off + 30, off + 30 + nameLen).toString('utf8');
    assert(name === f.name, `stored name matches`, `${name} vs ${f.name}`);
    const data = buf.slice(off + 30 + nameLen, off + 30 + nameLen + size);
    assert(data.toString('utf8') === f.body, `${f.name} round-trips byte for byte`);
    assert(CORE.crc32(new Uint8Array(data)) === crc, `${f.name} CRC matches`);
    off += 30 + nameLen + size;
  }
  assert(off === cdirOff, 'local entries end exactly where the directory starts');
}

/* ---------- CORE stays free of the DOM ---------- */

console.log('Isolation');
{
  assert(!/\bdocument\b/.test(code), 'CORE never touches document');
  assert(!/\bwindow\b/.test(code), 'CORE never touches window');
  assert(!/localStorage|sessionStorage/.test(code), 'CORE uses no browser storage');
  assert(/getRandomValues/.test(code), 'CORE generates secrets with getRandomValues');
  assert(!/Math\.random/.test(code), 'CORE never uses Math.random for secrets');
}

/* ---------- the UI rules that caused real bugs ---------- */

console.log('UI rules');
{
  const ui = stripJsComments(page.slice(page.indexOf(END) + END.length));

  // Re-rendering a pane from its own input's oninput destroys the element being
  // typed into and drops focus after every keystroke.
  const handlers = [...ui.matchAll(/oninput\s*=\s*function\s*\([^)]*\)\s*\{([^}]*)\}/g)]
    .map(m => m[1]);
  assert(handlers.length > 0, 'there are oninput handlers to check');
  for (const h of handlers) {
    assert(!/renderAll|renderConnection|renderStorage|renderCredentials/.test(h),
      'no oninput handler re-renders a pane containing an input', h.trim());
  }

  // Nested markup is built through the DOM, never rewritten as strings.
  assert(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(ui),
    'the UI never assigns HTML as a string');
}

/* ---------- the same input produces the same bytes ---------- */

console.log('Determinism');
for (const [preset, layout] of combos) {
  const tag = `${preset}/${layout}`;
  const st = stateFor(preset, layout);
  const a1 = CORE.buildFiles(st).map(f => f.name + '\u0000' + f.body).join('\u0001');
  const a2 = CORE.buildFiles(st).map(f => f.name + '\u0000' + f.body).join('\u0001');
  assert(a1 === a2, `${tag}: two builds of the same state are byte identical`);

  const z1 = Buffer.from(CORE.zipStore(CORE.buildFiles(st)));
  const z2 = Buffer.from(CORE.zipStore(CORE.buildFiles(st)));
  assert(z1.equals(z2), `${tag}: the ZIP is byte identical between builds`);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) { console.log(`${failures} failed\n`); process.exit(1); }
console.log('');
