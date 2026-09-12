#!/usr/bin/env node
/* Writes one install.sh per preset and storage layout so CI can shellcheck
   every script the generator can actually produce, not just one sample. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'generator.html'), 'utf8');
const START = '/* ==MWS-CORE-START==', END = '/* ==MWS-CORE-END== */';
const source = page.slice(page.indexOf(START), page.indexOf(END) + END.length);

const sandbox = { crypto: require('crypto').webcrypto, console, Buffer, TextEncoder };
vm.createContext(sandbox);
vm.runInContext(source + '\n;__CORE__ = CORE;', sandbox);
const CORE = sandbox.__CORE__;

const out = process.argv[2] || path.join(ROOT, 'build', 'sh');
fs.mkdirSync(out, { recursive: true });

let n = 0;
for (const preset of Object.keys(CORE.PRESETS)) {
  for (const layout of Object.keys(CORE.LAYOUTS)) {
    const st = CORE.newState();
    CORE.applyPreset(st, preset);
    st.layout = layout;
    st.domain = 'example.com';
    st.sandboxDomain = 'pad-sandbox.example.com';
    fs.writeFileSync(path.join(out, `${preset}-${layout}.sh`), CORE.buildInstallSh(st));
    n++;
  }
}
console.log(`wrote ${n} scripts to ${out}`);
