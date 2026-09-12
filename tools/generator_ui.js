/* Generator UI. Everything below here touches the DOM; nothing above the
   CORE end marker does. Two rules this file follows deliberately:

   1. No pane containing a text input is ever re-rendered from that input's
      oninput handler. Doing so destroys the element being typed into and the
      caret lands somewhere else after every keystroke. Inputs update state and
      then patch only the panes that do not contain them.
   2. Nothing parses or rewrites HTML with string matching. Nodes are built and
      replaced through the DOM, so nesting cannot be miscounted. */

(function () {
  'use strict';
  if (!document.getElementById('gen-modules')) return;

  var st = CORE.newState();

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function $(id) { return document.getElementById(id); }

  /* ---------- step 1: modules ---------- */

  function renderModules() {
    var host = $('gen-modules');
    clear(host);

    var presets = el('div', 'gen-presets');
    presets.appendChild(el('span', 'gen-lab', 'Start from:'));
    Object.keys(CORE.PRESETS).forEach(function (key) {
      var b = el('button', 'gen-btn', CORE.PRESETS[key].label);
      b.type = 'button';
      b.onclick = function () { CORE.applyPreset(st, key); renderAll(); };
      presets.appendChild(b);
    });
    var clearBtn = el('button', 'gen-btn', 'Clear');
    clearBtn.type = 'button';
    clearBtn.onclick = function () { st.chosen = {}; CORE.ensureSecrets(st); renderAll(); };
    presets.appendChild(clearBtn);
    host.appendChild(presets);

    var cats = [];
    CORE.MODULES.forEach(function (m) {
      if (m.support) return;
      if (cats.indexOf(m.cat) === -1) cats.push(m.cat);
    });

    cats.forEach(function (cat) {
      host.appendChild(el('h3', null, cat));
      var wrap = el('div', 'gen-grid');
      CORE.MODULES.filter(function (m) { return m.cat === cat && !m.support; })
        .forEach(function (m) { wrap.appendChild(moduleRow(m)); });
      host.appendChild(wrap);
    });

    var auto = CORE.selectedModules(st).filter(function (m) { return st.chosen[m.id] === 'auto'; });
    if (auto.length) {
      var note = el('div', 'tip');
      var b = el('strong', null, 'Added for you: ');
      note.appendChild(b);
      note.appendChild(document.createTextNode(
        auto.map(function (m) { return m.name; }).join(', ') +
        '. These are required by something you picked. Remove the thing that needs them and they go too.'));
      host.appendChild(note);
    }
  }

  function moduleRow(m) {
    var row = el('label', 'gen-mod' + (st.chosen[m.id] ? ' on' : ''));
    var cb = el('input');
    cb.type = 'checkbox';
    cb.checked = !!st.chosen[m.id];
    cb.onchange = function () { CORE.toggle(st, m.id); renderAll(); };
    row.appendChild(cb);

    var body = el('div', 'gen-modbody');
    var head = el('div', 'gen-modhead');
    head.appendChild(el('b', null, m.name));
    if (st.chosen[m.id] === 'auto') head.appendChild(el('span', 'pill after', 'auto'));
    if (m.deploy === 'upstream') head.appendChild(el('span', 'pill first', 'own installer'));
    if (m.neverExpose) head.appendChild(el('span', 'pill after', 'never publish'));
    body.appendChild(head);
    body.appendChild(el('p', null, m.desc));
    row.appendChild(body);
    return row;
  }

  /* ---------- step 2: storage ---------- */

  function renderStorage() {
    var host = $('gen-storage');
    clear(host);
    Object.keys(CORE.LAYOUTS).forEach(function (key) {
      var L = CORE.LAYOUTS[key];
      var row = el('label', 'gen-opt' + (st.layout === key ? ' on' : ''));
      var r = el('input');
      r.type = 'radio'; r.name = 'layout'; r.checked = st.layout === key;
      r.onchange = function () { st.layout = key; renderAll(); };
      row.appendChild(r);
      var body = el('div');
      body.appendChild(el('b', null, L.label));
      body.appendChild(el('p', null, L.note));
      row.appendChild(body);
      host.appendChild(row);
    });

    if (st.layout === 'custom') {
      host.appendChild(textField('Base path', 'basePath', st.basePath, '/srv/workspace'));
    }
    var ex = el('p', 'gen-note');
    ex.appendChild(document.createTextNode('Example path: '));
    ex.appendChild(el('code', null, CORE.LAYOUTS[st.layout].path('bookstack', 'config', st)));
    host.appendChild(ex);
  }

  /* ---------- shared field builders ----------
     oninput updates state and patches only the panes that contain no inputs.
     The pane holding this element is never rebuilt while it has focus. */

  function textField(label, key, value, placeholder) {
    var wrap = el('div', 'gen-field');
    var id = 'f-' + key;
    var lab = el('label', null, label);
    lab.setAttribute('for', id);
    wrap.appendChild(lab);
    var i = el('input');
    i.type = 'text'; i.id = id; i.value = value || '';
    if (placeholder) i.placeholder = placeholder;
    i.oninput = function () { st[key] = i.value; patchDependents(); };
    wrap.appendChild(i);
    return wrap;
  }

  function envField(spec) {
    var wrap = el('div', 'gen-field');
    var id = 'e-' + spec.key;
    var lab = el('label', null, spec.name + ': ' + spec.label);
    lab.setAttribute('for', id);
    wrap.appendChild(lab);
    var i = el('input');
    i.type = 'text'; i.id = id;
    i.value = st.fields[spec.key] !== undefined ? st.fields[spec.key] : (spec.def || '');
    i.placeholder = 'blank becomes CHANGEME';
    i.oninput = function () { st.fields[spec.key] = i.value; patchDependents(); };
    wrap.appendChild(i);
    return wrap;
  }

  function checkField(label, key, note) {
    var row = el('label', 'gen-opt' + (st[key] ? ' on' : ''));
    var c = el('input');
    c.type = 'checkbox'; c.checked = !!st[key];
    c.onchange = function () { st[key] = c.checked; renderAll(); };
    row.appendChild(c);
    var body = el('div');
    body.appendChild(el('b', null, label));
    if (note) body.appendChild(el('p', null, note));
    row.appendChild(body);
    return row;
  }

  /* ---------- step 3: connection ---------- */

  function renderConnection() {
    var host = $('gen-connection');
    clear(host);
    host.appendChild(textField('Your domain', 'domain', st.domain, 'example.com'));
    host.appendChild(el('p', 'gen-note',
      'Each module gets a subdomain. Leave it blank and every URL is written as CHANGEME rather than guessed.'));
    host.appendChild(checkField('Generate a Caddyfile', 'useProxy',
      'Routes each subdomain to the right container. Modules that should not be published are left out, with the reason in a comment.'));
    if (st.chosen.cryptpad) {
      host.appendChild(textField('CryptPad sandbox domain', 'sandboxDomain', st.sandboxDomain, 'pad-sandbox.example.com'));
      var w = el('div', 'warning');
      w.appendChild(el('strong', null, 'CryptPad needs two different origins. '));
      w.appendChild(document.createTextNode(
        'Upstream states that running without the sandbox may put users\u2019 information at risk. This is a blocking error until the two differ.'));
      host.appendChild(w);
    }
    host.appendChild(textField('Timezone', 'tz', st.tz, 'Etc/UTC'));
    host.appendChild(textField('PUID', 'puid', st.puid, '1000'));
    host.appendChild(textField('PGID', 'pgid', st.pgid, '1000'));
    if (st.chosen.homarr) {
      host.appendChild(checkField('Mount the Docker socket into Homarr', 'dockerSocket',
        'Gives you live container status. The socket is root on the host in practical terms, so Homarr is then excluded from the proxy config.'));
    }
  }

  /* ---------- step 4: credentials ---------- */

  function renderCredentials() {
    var host = $('gen-credentials');
    clear(host);
    var specs = CORE.fieldSpecs(st);
    if (!specs.length) {
      host.appendChild(el('p', null, 'Nothing selected needs a credential up front. Most of these apps create their first account in the browser.'));
      return;
    }
    specs.forEach(function (s) { host.appendChild(envField(s)); });
    host.appendChild(el('p', 'gen-note', 'Anything left blank is written as CHANGEME. Nothing is guessed for you.'));
  }

  /* ---------- step 5: secrets ---------- */

  function renderSecrets() {
    var host = $('gen-secrets');
    clear(host);
    var specs = CORE.secretSpecs(st);
    if (!specs.length) {
      host.appendChild(el('p', null, 'Nothing selected needs a secret.'));
      return;
    }
    var bar = el('div', 'gen-presets');
    var b = el('button', 'gen-btn', 'Regenerate all');
    b.type = 'button';
    b.onclick = function () { CORE.regenerateSecrets(st); renderAll(); };
    bar.appendChild(b);
    bar.appendChild(el('span', 'gen-lab', 'Regenerating hides every value again.'));
    host.appendChild(bar);

    specs.forEach(function (s) {
      var row = el('div', 'gen-secret');
      row.appendChild(el('div', 'gen-skey', s.name + ' \u00b7 ' + s.key));
      var val = el('code', 'gen-sval');
      var shown = !!st.revealed[s.key];
      val.textContent = shown ? st.secrets[s.key] : CORE.mask(st.secrets[s.key]);
      row.appendChild(val);
      var t = el('button', 'gen-btn', shown ? 'Hide' : 'Reveal');
      t.type = 'button';
      t.onclick = function () {
        st.revealed[s.key] = !st.revealed[s.key];
        var now = !!st.revealed[s.key];
        val.textContent = now ? st.secrets[s.key] : CORE.mask(st.secrets[s.key]);
        t.textContent = now ? 'Hide' : 'Reveal';
      };
      row.appendChild(t);
      host.appendChild(row);
    });
    host.appendChild(el('p', 'gen-note',
      'Generated in your browser with crypto.getRandomValues, one value per service. They are never sent anywhere.'));
  }

  /* ---------- step 6: review ---------- */

  function renderReview() {
    var host = $('gen-review');
    clear(host);
    var v = CORE.validate(st);

    if (v.errors.length) {
      var e = el('div', 'warning');
      e.appendChild(el('strong', null, 'Fix these before the files are usable'));
      var ul = el('ul');
      v.errors.forEach(function (m) { ul.appendChild(el('li', null, m)); });
      e.appendChild(ul);
      host.appendChild(e);
    } else {
      host.appendChild(el('div', 'tip', 'No blocking problems.'));
    }

    if (v.warnings.length) {
      var w = el('div', 'card');
      w.appendChild(el('strong', null, 'Worth knowing'));
      var ul2 = el('ul');
      v.warnings.forEach(function (m) { ul2.appendChild(el('li', null, m)); });
      w.appendChild(ul2);
      host.appendChild(w);
    }

    var ctx = CORE.makeCtx(st);
    var mods = CORE.selectedModules(st).filter(function (m) { return !m.support && m.deploy === 'service'; });
    if (mods.length) {
      var tbl = el('div', 'tbl');
      var t = el('table');
      var thead = el('thead'), hr = el('tr');
      ['Module', 'Host port'].forEach(function (h) { hr.appendChild(el('th', null, h)); });
      thead.appendChild(hr); t.appendChild(thead);
      var tb = el('tbody');
      mods.forEach(function (m) {
        var tr = el('tr');
        tr.appendChild(el('td', null, m.name));
        tr.appendChild(el('td', null, String(ctx.hostPort(m))));
        tb.appendChild(tr);
      });
      t.appendChild(tb); tbl.appendChild(t);
      host.appendChild(tbl);
    }
  }

  /* ---------- step 7: files ---------- */

  var activeFile = 'docker-compose.yml';

  function renderFiles() {
    var host = $('gen-files');
    clear(host);
    var files = CORE.buildFiles(st);
    if (!CORE.selectedModules(st).length) {
      host.appendChild(el('p', null, 'Pick some modules and the files appear here.'));
      return;
    }
    if (!files.some(function (f) { return f.name === activeFile; })) activeFile = files[0].name;

    var tabs = el('div', 'gen-tabs');
    files.forEach(function (f) {
      var b = el('button', 'gen-tab' + (f.name === activeFile ? ' on' : ''), f.name);
      b.type = 'button';
      b.onclick = function () { activeFile = f.name; renderFiles(); };
      tabs.appendChild(b);
    });
    host.appendChild(tabs);

    var body = files.filter(function (f) { return f.name === activeFile; })[0].body;
    var pre = el('pre');
    pre.textContent = body;
    host.appendChild(pre);

    var bar = el('div', 'gen-presets');
    var dl = el('button', 'gen-btn gen-primary', 'Download all as ZIP');
    dl.type = 'button';
    dl.onclick = function () { downloadZip(files); };
    bar.appendChild(dl);

    var copy = el('button', 'gen-btn', 'Copy this file');
    copy.type = 'button';
    copy.onclick = function () {
      navigator.clipboard.writeText(body).then(function () {
        copy.textContent = 'Copied';
        setTimeout(function () { copy.textContent = 'Copy this file'; }, 1500);
      });
    };
    bar.appendChild(copy);
    host.appendChild(bar);
  }

  function downloadZip(files) {
    var bytes = CORE.zipStore(files);
    var blob = new Blob([bytes], { type: 'application/zip' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'workspace-server.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- render orchestration ---------- */

  // Called from oninput. Deliberately does not touch any pane containing a
  // text input, so the element being typed into survives.
  function patchDependents() {
    renderReview();
    renderFiles();
  }

  function renderAll() {
    renderModules();
    renderStorage();
    renderConnection();
    renderCredentials();
    renderSecrets();
    renderReview();
    renderFiles();
  }

  CORE.applyPreset(st, 'usual');
  renderAll();
})();
