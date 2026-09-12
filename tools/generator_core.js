/* ==MWS-CORE-START==
   Pure logic for the Modular Workspace Server compose generator.
   No DOM access in this block. tests/validate.js extracts everything between
   the START and END markers and runs it in Node, so nothing here may touch
   window, document or localStorage. */

var CORE = (function () {
  'use strict';

  /* ---------- small helpers ---------- */

  function rand(n) {
    var a = new Uint8Array(n);
    (typeof crypto !== 'undefined' ? crypto : globalThis.crypto).getRandomValues(a);
    return a;
  }
  function hex(n) {
    return Array.prototype.map.call(rand(n), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }
  function b64(bytes) {
    var s = '', i;
    for (i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    if (typeof btoa === 'function') return btoa(s);
    return Buffer.from(bytes).toString('base64');
  }
  var ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  function alnum(n) {
    var a = rand(n), s = '', i;
    for (i = 0; i < n; i++) s += ALNUM[a[i] % ALNUM.length];
    return s;
  }

  // Every secret kind is backed by crypto.getRandomValues. Lengths are set by
  // what the receiving application actually requires, not by taste.
  var SECRET_KINDS = {
    hex32: function () { return hex(16); },        // 32 hex chars
    hex64: function () { return hex(32); },        // 64 hex chars - Homarr requires exactly this
    pass: function () { return alnum(28); },       // database passwords
    long48: function () { return alnum(48); },     // Zipline rejects under 32
    appkey: function () { return 'base64:' + b64(rand(32)); }, // BookStack format
    master12: function () { return alnum(12); }    // OpenSign documents 12 chars
  };

  function makeSecret(kind) {
    var f = SECRET_KINDS[kind];
    if (!f) throw new Error('unknown secret kind: ' + kind);
    return f();
  }

  /* ---------- YAML emitter ----------
     Emits the small subset we need: nested maps, lists of scalars, scalars.
     Built from objects rather than string concatenation so indentation cannot
     drift, and so the test suite can parse the result back. */

  function needsQuote(s) {
    if (s === '') return true;
    if (/^[-?:,\[\]{}#&*!|>'"%@`]/.test(s)) return true;
    if (/:\s/.test(s) || /\s#/.test(s)) return true;
    if (/^(true|false|null|yes|no|on|off|~)$/i.test(s)) return true;
    if (/^[\d.+-]+$/.test(s)) return true;
    if (/[:{}\[\],&*#?|<>=!%@`"']/.test(s)) return true;
    return false;
  }
  function scalar(v) {
    if (typeof v === 'boolean' || typeof v === 'number') return String(v);
    var s = String(v);
    return needsQuote(s) ? '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"' : s;
  }
  function emit(obj, indent) {
    var pad = '  '.repeat(indent), out = '';
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) {
        if (!v.length) return;
        out += pad + k + ':\n';
        v.forEach(function (item) {
          if (item && typeof item === 'object') {
            var inner = emit(item, indent + 2).replace(/^ {2}/, '- ');
            out += pad + '  ' + inner.slice(pad.length + 2);
          } else {
            out += pad + '  - ' + scalar(item) + '\n';
          }
        });
      } else if (typeof v === 'object') {
        if (!Object.keys(v).length) return;
        out += pad + k + ':\n' + emit(v, indent + 1);
      } else {
        out += pad + k + ': ' + scalar(v) + '\n';
      }
    });
    return out;
  }
  function toYaml(obj) { return emit(obj, 0); }

  /* ---------- storage layouts ---------- */

  var LAYOUTS = {
    bind: {
      label: 'Folders next to the compose file',
      note: 'Everything lives in ./data, where you can see it and copy it.',
      path: function (mod, sub, st) { return './data/' + mod + (sub ? '/' + sub : ''); },
      named: false
    },
    named: {
      label: 'Docker named volumes',
      note: 'Docker manages the storage. Tidier, but harder to inspect by hand.',
      path: function (mod, sub) { return mod + (sub ? '-' + sub : '') + '-data'; },
      named: true
    },
    custom: {
      label: 'A base path you choose',
      note: 'For a NAS share or a second disk. Give an absolute path.',
      path: function (mod, sub, st) {
        var base = (st.basePath || '').replace(/\/+$/, '') || '/srv/workspace';
        return base + '/' + mod + (sub ? '/' + sub : '');
      },
      named: false
    }
  };

  /* ---------- module registry ---------- */
  // job      - two selected modules sharing a job get an overlap warning
  // deploy   - 'service' generates compose, 'upstream' does not (see below)
  // requires - module ids added automatically, and removed again when nothing needs them

  function envList(o) {
    return Object.keys(o).map(function (k) { return k + '=' + o[k]; });
  }

  var MODULES = [

    /* --- shared support services, auto-added --- */
    {
      id: 'postgres', name: 'PostgreSQL', cat: 'Support', job: 'db-postgres',
      support: true, deploy: 'service', image: 'postgres:16-alpine', port: 5432,
      desc: 'Database. Added automatically by anything that needs it.',
      secrets: [{ key: 'POSTGRES_SUPERUSER_PASSWORD', kind: 'pass' }],
      compose: function (ctx) {
        return {
          postgres: {
            image: this.image,
            restart: 'unless-stopped',
            environment: envList({
              POSTGRES_USER: 'postgres',
              POSTGRES_PASSWORD: '${POSTGRES_SUPERUSER_PASSWORD}',
              POSTGRES_DB: 'postgres'
            }).concat(ctx.dbSecretEnv('postgres')),
            volumes: [ctx.vol('postgres', 'db') + ':/var/lib/postgresql/data',
                      './db-init/postgres:/docker-entrypoint-initdb.d:ro'],
            healthcheck: {
              test: ['CMD-SHELL', 'pg_isready -U postgres'],
              interval: '10s', timeout: '5s', retries: 5
            }
          }
        };
      }
    },
    {
      id: 'mariadb', name: 'MariaDB', cat: 'Support', job: 'db-mysql',
      support: true, deploy: 'service', image: 'mariadb:11', port: 3306,
      desc: 'Database for BookStack. Added automatically.',
      secrets: [{ key: 'MARIADB_ROOT_PASSWORD', kind: 'pass' }],
      compose: function (ctx) {
        return {
          mariadb: {
            image: this.image,
            restart: 'unless-stopped',
            environment: envList({ MARIADB_ROOT_PASSWORD: '${MARIADB_ROOT_PASSWORD}' })
              .concat(ctx.dbSecretEnv('mariadb')),
            volumes: [ctx.vol('mariadb', 'db') + ':/var/lib/mysql',
                      './db-init/mariadb:/docker-entrypoint-initdb.d:ro']
          }
        };
      }
    },
    {
      id: 'mongo', name: 'MongoDB', cat: 'Support', job: 'db-mongo',
      support: true, deploy: 'service', image: 'mongo:7', port: 27017,
      desc: 'Database for Wekan and OpenSign. Added automatically.',
      notes: ['Wekan pins its supported MongoDB version per release. If Wekan will not start, check the version against the project wiki before anything else.'],
      compose: function (ctx) {
        return {
          mongo: {
            image: this.image,
            restart: 'unless-stopped',
            volumes: [ctx.vol('mongo', 'db') + ':/data/db']
          }
        };
      }
    },
    {
      id: 'redis', name: 'Redis', cat: 'Support', job: 'cache',
      support: true, deploy: 'service', image: 'docker.io/library/redis:7', port: 6379,
      desc: 'Task broker for Paperless-ngx. Added automatically.',
      compose: function (ctx) {
        return {
          redis: {
            image: this.image,
            restart: 'unless-stopped',
            volumes: [ctx.vol('redis', 'data') + ':/data']
          }
        };
      }
    },
    {
      id: 'solr', name: 'Apache Solr', cat: 'Support', job: 'search',
      support: true, deploy: 'service', image: 'solr:9', port: 8983,
      desc: 'Full-text index for Docspell. Added automatically.',
      notes: ['Solr is the heaviest support service here. It is the main reason Docspell needs more memory than Paperless-ngx.'],
      compose: function (ctx) {
        return {
          solr: {
            image: this.image,
            restart: 'unless-stopped',
            volumes: [ctx.vol('solr', 'data') + ':/var/solr'],
            command: ['solr-precreate', 'docspell']
          }
        };
      }
    },

    /* --- PDF tools --- */
    {
      id: 'stirling', name: 'Stirling-PDF', cat: 'PDF tools', job: 'pdf-tools',
      deploy: 'service', image: 'docker.stirlingpdf.com/stirlingtools/stirling-pdf:latest',
      port: 8080, host: 8081,
      desc: 'Merge, split, OCR, convert and sign PDFs. Has an API.',
      notes: ['Single sign-on is in the paid tier. To put Stirling behind a login without paying, use a forward-auth gateway.'],
      compose: function (ctx) {
        return {
          stirling: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({ DOCKER_ENABLE_SECURITY: 'false', LANGS: 'en_GB' }),
            volumes: [ctx.vol('stirling', 'config') + ':/configs',
                      ctx.vol('stirling', 'ocr') + ':/usr/share/tessdata']
          }
        };
      }
    },
    {
      id: 'bentopdf', name: 'BentoPDF', cat: 'PDF tools', job: 'pdf-tools',
      deploy: 'service', image: 'ghcr.io/alam00000/bentopdf-simple:latest',
      port: 8080, host: 8082,
      desc: 'The same kind of tools, run entirely in your browser.',
      notes: ['Nothing is processed or stored server-side, so there are no volumes and no API.'],
      compose: function (ctx) {
        return {
          bentopdf: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port]
          }
        };
      }
    },
    {
      id: 'pdfding', name: 'PdfDing', cat: 'PDF tools', job: 'pdf-library',
      deploy: 'service', image: 'mrmn/pdfding:latest', port: 8000, host: 8083,
      desc: 'A reading library: tags, annotations, reading position across devices.',
      secrets: [{ key: 'PDFDING_SECRET_KEY', kind: 'hex64' }],
      notes: ['Development moved from GitHub to Codeberg. The GitHub repository is archived.'],
      compose: function (ctx) {
        return {
          pdfding: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              HOST_NAME: ctx.hostFor('pdfding'),
              SECRET_KEY: '${PDFDING_SECRET_KEY}',
              DEFAULT_THEME: 'dark'
            }),
            volumes: [ctx.vol('pdfding', 'media') + ':/home/nonroot/pdfding/media',
                      ctx.vol('pdfding', 'db') + ':/home/nonroot/pdfding/db']
          }
        };
      }
    },

    /* --- document archives --- */
    {
      id: 'paperless', name: 'Paperless-ngx', cat: 'Document archives', job: 'archive',
      deploy: 'service', image: 'ghcr.io/paperless-ngx/paperless-ngx:latest',
      port: 8000, host: 8000, requires: ['redis', 'postgres'],
      desc: 'Scan, OCR, tag and search your paper. The default choice.',
      db: { engine: 'postgres', name: 'paperless', user: 'paperless', secret: 'PAPERLESS_DB_PASSWORD' },
      secrets: [{ key: 'PAPERLESS_SECRET_KEY', kind: 'hex64' },
                { key: 'PAPERLESS_DB_PASSWORD', kind: 'pass' }],
      fields: [{ key: 'PAPERLESS_ADMIN_USER', label: 'Admin username', def: '' },
               { key: 'PAPERLESS_ADMIN_MAIL', label: 'Admin email', def: '' }],
      notes: ['The consume directory is the one to plan for. Point it at a share your scanner can already write to.'],
      compose: function (ctx) {
        return {
          paperless: {
            image: this.image,
            restart: 'unless-stopped',
            depends_on: ['redis', 'postgres'],
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              PAPERLESS_REDIS: 'redis://redis:6379',
              PAPERLESS_DBHOST: 'postgres',
              PAPERLESS_DBNAME: 'paperless',
              PAPERLESS_DBUSER: 'paperless',
              PAPERLESS_DBPASS: '${PAPERLESS_DB_PASSWORD}',
              PAPERLESS_SECRET_KEY: '${PAPERLESS_SECRET_KEY}',
              PAPERLESS_URL: ctx.urlFor('paperless'),
              PAPERLESS_TIME_ZONE: '${TZ}',
              PAPERLESS_ADMIN_USER: '${PAPERLESS_ADMIN_USER}',
              PAPERLESS_ADMIN_MAIL: '${PAPERLESS_ADMIN_MAIL}',
              USERMAP_UID: '${PUID}',
              USERMAP_GID: '${PGID}'
            }),
            volumes: [ctx.vol('paperless', 'data') + ':/usr/src/paperless/data',
                      ctx.vol('paperless', 'media') + ':/usr/src/paperless/media',
                      ctx.vol('paperless', 'export') + ':/usr/src/paperless/export',
                      ctx.vol('paperless', 'consume') + ':/usr/src/paperless/consume']
          }
        };
      }
    },
    {
      id: 'docspell', name: 'Docspell', cat: 'Document archives', job: 'archive',
      deploy: 'service', image: 'docspell/restserver:latest', port: 7880, host: 7880,
      requires: ['postgres', 'solr'],
      desc: 'Structured metadata and rules, at the cost of four services.',
      db: { engine: 'postgres', name: 'docspell', user: 'docspell', secret: 'DOCSPELL_DB_PASSWORD' },
      secrets: [{ key: 'DOCSPELL_DB_PASSWORD', kind: 'pass' },
                { key: 'DOCSPELL_SERVER_SECRET', kind: 'hex32' }],
      notes: ['Two Docspell containers are generated: the rest server and the joex worker. The web UI runs happily without joex and simply never processes anything, which looks like a stuck queue.'],
      compose: function (ctx) {
        var url = 'jdbc:postgresql://postgres:5432/docspell';
        return {
          docspell: {
            image: this.image,
            restart: 'unless-stopped',
            depends_on: ['postgres', 'solr'],
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              DOCSPELL_SERVER_BACKEND_JDBC_URL: url,
              DOCSPELL_SERVER_BACKEND_JDBC_USER: 'docspell',
              DOCSPELL_SERVER_BACKEND_JDBC_PASSWORD: '${DOCSPELL_DB_PASSWORD}',
              DOCSPELL_SERVER_AUTH_SERVER__SECRET: '${DOCSPELL_SERVER_SECRET}',
              DOCSPELL_SERVER_FULL__TEXT__SEARCH_ENABLED: 'true',
              DOCSPELL_SERVER_FULL__TEXT__SEARCH_SOLR_URL: 'http://solr:8983/solr/docspell',
              TZ: '${TZ}'
            })
          },
          'docspell-joex': {
            image: 'docspell/joex:latest',
            restart: 'unless-stopped',
            depends_on: ['postgres', 'solr'],
            environment: envList({
              DOCSPELL_JOEX_JDBC_URL: url,
              DOCSPELL_JOEX_JDBC_USER: 'docspell',
              DOCSPELL_JOEX_JDBC_PASSWORD: '${DOCSPELL_DB_PASSWORD}',
              DOCSPELL_JOEX_FULL__TEXT__SEARCH_ENABLED: 'true',
              DOCSPELL_JOEX_FULL__TEXT__SEARCH_SOLR_URL: 'http://solr:8983/solr/docspell',
              TZ: '${TZ}'
            })
          }
        };
      }
    },

    /* --- notes, wikis, libraries --- */
    {
      id: 'bookstack', name: 'BookStack', cat: 'Notes and wikis', job: 'wiki',
      deploy: 'service', image: 'lscr.io/linuxserver/bookstack:latest',
      port: 80, host: 6875, requires: ['mariadb'],
      desc: 'Shelves, books, chapters, pages. Structure that holds itself together.',
      db: { engine: 'mariadb', name: 'bookstack', user: 'bookstack', secret: 'BOOKSTACK_DB_PASSWORD' },
      secrets: [{ key: 'BOOKSTACK_DB_PASSWORD', kind: 'pass' },
                { key: 'BOOKSTACK_APP_KEY', kind: 'appkey' }],
      notes: ['The default login is admin@admin.com with the password "password". Change it before anything else.',
              'APP_KEY is normally produced by the image itself. The value generated here has the same base64: plus 32 bytes format, which is what BookStack expects.'],
      compose: function (ctx) {
        return {
          bookstack: {
            image: this.image,
            restart: 'unless-stopped',
            depends_on: ['mariadb'],
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              PUID: '${PUID}', PGID: '${PGID}', TZ: '${TZ}',
              APP_URL: ctx.urlFor('bookstack'),
              APP_KEY: '${BOOKSTACK_APP_KEY}',
              DB_HOST: 'mariadb', DB_PORT: '3306',
              DB_DATABASE: 'bookstack', DB_USERNAME: 'bookstack',
              DB_PASSWORD: '${BOOKSTACK_DB_PASSWORD}'
            }),
            volumes: [ctx.vol('bookstack', 'config') + ':/config']
          }
        };
      }
    },
    {
      id: 'wikijs', name: 'Wiki.js', cat: 'Notes and wikis', job: 'wiki',
      deploy: 'service', image: 'ghcr.io/requarks/wiki:2', port: 3000, host: 3001,
      requires: ['postgres'],
      desc: 'Free-form page tree with optional Git-backed content.',
      db: { engine: 'postgres', name: 'wikijs', user: 'wikijs', secret: 'WIKIJS_DB_PASSWORD' },
      secrets: [{ key: 'WIKIJS_DB_PASSWORD', kind: 'pass' }],
      notes: ['The image tag is pinned to :2 deliberately. Upstream recommends against latest, and version 3 is an unstable beta its own documentation says not to run in production.'],
      compose: function (ctx) {
        return {
          wikijs: {
            image: this.image,
            restart: 'unless-stopped',
            depends_on: ['postgres'],
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              DB_TYPE: 'postgres', DB_HOST: 'postgres', DB_PORT: '5432',
              DB_USER: 'wikijs', DB_PASS: '${WIKIJS_DB_PASSWORD}', DB_NAME: 'wikijs'
            })
          }
        };
      }
    },
    {
      id: 'obsidian', name: 'Obsidian', cat: 'Notes and wikis', job: 'notes-desktop',
      deploy: 'service', image: 'lscr.io/linuxserver/obsidian:latest',
      port: 3001, host: 3011, neverExpose: true,
      desc: 'The real desktop app, streamed to a browser. Plugins work.',
      secrets: [{ key: 'OBSIDIAN_PASSWORD', kind: 'pass' }],
      notes: ['Excluded from any generated reverse-proxy config. Reach it over your VPN.'],
      compose: function (ctx) {
        return {
          obsidian: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              PUID: '${PUID}', PGID: '${PGID}', TZ: '${TZ}',
              CUSTOM_USER: 'admin', PASSWORD: '${OBSIDIAN_PASSWORD}'
            }),
            volumes: [ctx.vol('obsidian', 'config') + ':/config'],
            shm_size: '1gb'
          }
        };
      }
    },
    {
      id: 'kiwix', name: 'Kiwix', cat: 'Notes and wikis', job: 'offline-library',
      deploy: 'service', image: 'ghcr.io/kiwix/kiwix-serve:latest', port: 8080, host: 8084,
      desc: 'Wikipedia and other whole sites, served offline from ZIM files.',
      notes: ['Put ZIM files in the data directory before starting. The container has nothing to serve without them, and new files need a restart.'],
      compose: function (ctx) {
        return {
          kiwix: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port],
            volumes: [ctx.vol('kiwix', 'zim') + ':/data'],
            command: ['*.zim']
          }
        };
      }
    },

    /* --- code forges --- */
    {
      id: 'forgejo', name: 'Forgejo', cat: 'Code forges', job: 'forge',
      deploy: 'service', image: 'codeberg.org/forgejo/forgejo:16', port: 3000, host: 3002,
      desc: 'Repositories, issues, Actions CI, package registry, OAuth2 provider.',
      secrets: [{ key: 'FORGEJO_DB_PASSWORD', kind: 'pass' }],
      requires: ['postgres'],
      db: { engine: 'postgres', name: 'forgejo', user: 'forgejo', secret: 'FORGEJO_DB_PASSWORD' },
      notes: ['SSH is published on 2222 so it does not collide with the host SSH daemon. Set the same number in the installer or clone URLs will be wrong.',
              'If Codeberg is unreachable, upstream mirrors the image at data.forgejo.org.'],
      compose: function (ctx) {
        return {
          forgejo: {
            image: this.image,
            restart: 'unless-stopped',
            depends_on: ['postgres'],
            ports: [ctx.hostPort(this) + ':' + this.port, '2222:22'],
            environment: envList({
              USER_UID: '${PUID}', USER_GID: '${PGID}', TZ: '${TZ}',
              FORGEJO__database__DB_TYPE: 'postgres',
              FORGEJO__database__HOST: 'postgres:5432',
              FORGEJO__database__NAME: 'forgejo',
              FORGEJO__database__USER: 'forgejo',
              FORGEJO__database__PASSWD: '${FORGEJO_DB_PASSWORD}'
            }),
            volumes: [ctx.vol('forgejo', 'data') + ':/data',
                      '/etc/timezone:/etc/timezone:ro',
                      '/etc/localtime:/etc/localtime:ro']
          }
        };
      }
    },
    {
      id: 'gogs', name: 'Gogs', cat: 'Code forges', job: 'forge',
      deploy: 'service', image: 'gogs/gogs:latest', port: 3000, host: 3003,
      desc: 'The smallest thing that is still a forge. No CI, no registry.',
      notes: ['Configured through a web installer on first run rather than environment variables.',
              'SSH is published on 2223. Enter that number in the installer or clone URLs will be wrong.'],
      compose: function (ctx) {
        return {
          gogs: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port, '2223:22'],
            volumes: [ctx.vol('gogs', 'data') + ':/data']
          }
        };
      }
    },

    /* --- file transfer --- */
    {
      id: 'pairdrop', name: 'PairDrop', cat: 'File transfer', job: 'transfer-live',
      deploy: 'service', image: 'lscr.io/linuxserver/pairdrop:latest', port: 3000, host: 3004,
      desc: 'Browser to browser over WebRTC. Nothing is stored.',
      notes: ['Over a VPN, set WS_FALLBACK to true: most VPNs block WebRTC. Fallback traffic is routed through the server and readable by it.'],
      compose: function (ctx) {
        return {
          pairdrop: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              PUID: '${PUID}', PGID: '${PGID}', TZ: '${TZ}',
              RATE_LIMIT: 'true', WS_FALLBACK: 'false', DEBUG_MODE: 'false'
            })
          }
        };
      }
    },
    {
      id: 'psitransfer', name: 'PsiTransfer', cat: 'File transfer', job: 'transfer-link',
      deploy: 'service', image: 'psitrax/psitransfer:latest', port: 3000, host: 3005,
      desc: 'Upload a bucket, set an expiry, send a link. No accounts.',
      secrets: [{ key: 'PSITRANSFER_ADMIN_PASS', kind: 'pass' },
                { key: 'PSITRANSFER_UPLOAD_PASS', kind: 'pass' }],
      notes: ['The data directory must be owned by UID 1000 before first start: chown -R 1000 on the path below. install.sh does this for you.'],
      chown: 1000,
      compose: function (ctx) {
        return {
          psitransfer: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              PSITRANSFER_ADMIN_PASS: '${PSITRANSFER_ADMIN_PASS}',
              PSITRANSFER_UPLOAD_PASS: '${PSITRANSFER_UPLOAD_PASS}',
              PSITRANSFER_UPLOAD_DIR: '/data'
            }),
            volumes: [ctx.vol('psitransfer', 'data') + ':/data']
          }
        };
      }
    },
    {
      id: 'zipline', name: 'Zipline', cat: 'File transfer', job: 'transfer-link',
      deploy: 'service', image: 'ghcr.io/diced/zipline:latest', port: 3000, host: 3006,
      requires: ['postgres'],
      desc: 'ShareX and screenshot upload server, with a URL shortener.',
      db: { engine: 'postgres', name: 'zipline', user: 'zipline', secret: 'ZIPLINE_DB_PASSWORD' },
      secrets: [{ key: 'ZIPLINE_DB_PASSWORD', kind: 'pass' },
                { key: 'ZIPLINE_CORE_SECRET', kind: 'long48' }],
      notes: ['CORE_SECRET is generated at 48 characters because Zipline rejects anything under 32.'],
      compose: function (ctx) {
        return {
          zipline: {
            image: this.image,
            restart: 'unless-stopped',
            depends_on: ['postgres'],
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              DATABASE_URL: 'postgres://zipline:${ZIPLINE_DB_PASSWORD}@postgres:5432/zipline',
              CORE_SECRET: '${ZIPLINE_CORE_SECRET}',
              CORE_HOSTNAME: '0.0.0.0',
              CORE_PORT: '3000',
              DATASOURCE_TYPE: 'local',
              DATASOURCE_LOCAL_DIRECTORY: './uploads'
            }),
            volumes: [ctx.vol('zipline', 'uploads') + ':/zipline/uploads',
                      ctx.vol('zipline', 'public') + ':/zipline/public',
                      ctx.vol('zipline', 'themes') + ':/zipline/themes']
          }
        };
      }
    },
    {
      id: 'chibisafe', name: 'Chibisafe', cat: 'File transfer', job: 'transfer-gallery',
      deploy: 'service', image: 'chibisafe/chibisafe:latest', port: 8000, host: 24424,
      desc: 'Albums, tags and a gallery. More file hosting than file transfer.',
      notes: ['Upstream documents two different layouts with different volume paths. This uses the single-container one from the Docker Hub readme. If you follow the repository compose instead, the paths differ.'],
      mkdirs: ['database', 'uploads', 'logs'],
      compose: function (ctx) {
        return {
          chibisafe: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port],
            volumes: [ctx.vol('chibisafe', 'database') + ':/home/node/chibisafe/database',
                      ctx.vol('chibisafe', 'uploads') + ':/home/node/chibisafe/uploads',
                      ctx.vol('chibisafe', 'logs') + ':/home/node/chibisafe/logs']
          }
        };
      }
    },

    /* --- workspaces and boards --- */
    {
      id: 'cryptpad', name: 'CryptPad', cat: 'Workspaces and boards', job: 'docs-collab',
      deploy: 'service', image: 'cryptpad/cryptpad:version-2025.9.0', port: 3000, host: 3007,
      twoDomains: true, extraPorts: 1,
      desc: 'End to end encrypted documents, sheets and boards.',
      notes: ['Needs two genuinely different origins. Running without the sandbox domain may put users\u2019 information at risk, per upstream.'],
      compose: function (ctx) {
        return {
          cryptpad: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port,
                    (ctx.hostPort(this) + 1) + ':3003'],
            environment: envList({
              CPAD_MAIN_DOMAIN: '${CRYPTPAD_MAIN_DOMAIN}',
              CPAD_SANDBOX_DOMAIN: '${CRYPTPAD_SANDBOX_DOMAIN}'
            }),
            volumes: [ctx.vol('cryptpad', 'blob') + ':/cryptpad/blob',
                      ctx.vol('cryptpad', 'block') + ':/cryptpad/block',
                      ctx.vol('cryptpad', 'data') + ':/cryptpad/data',
                      ctx.vol('cryptpad', 'datastore') + ':/cryptpad/datastore',
                      ctx.vol('cryptpad', 'customize') + ':/cryptpad/customize']
          }
        };
      }
    },
    {
      id: 'calligra', name: 'Calligra', cat: 'Workspaces and boards', job: 'office-desktop',
      deploy: 'service', image: 'lscr.io/linuxserver/calligra:latest',
      port: 3001, host: 3012, neverExpose: true,
      desc: 'KDE office suite, streamed to a browser.',
      secrets: [{ key: 'CALLIGRA_PASSWORD', kind: 'pass' }],
      notes: ['Excluded from any generated reverse-proxy config. Reach it over your VPN.'],
      compose: function (ctx) {
        return {
          calligra: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              PUID: '${PUID}', PGID: '${PGID}', TZ: '${TZ}',
              CUSTOM_USER: 'admin', PASSWORD: '${CALLIGRA_PASSWORD}'
            }),
            volumes: [ctx.vol('calligra', 'config') + ':/config'],
            shm_size: '1gb'
          }
        };
      }
    },
    {
      id: 'wekan', name: 'Wekan', cat: 'Workspaces and boards', job: 'boards',
      deploy: 'service', image: 'ghcr.io/wekan/wekan:latest', port: 8080, host: 8085,
      requires: ['mongo'],
      desc: 'Kanban boards, with Trello import and JSON export.',
      notes: ['ROOT_URL must be the external address you actually use. A wrong value breaks logins and invite links in ways that look like authentication bugs.'],
      compose: function (ctx) {
        return {
          wekan: {
            image: this.image,
            restart: 'unless-stopped',
            depends_on: ['mongo'],
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              WRITABLE_PATH: '/data',
              MONGO_URL: 'mongodb://mongo:27017/wekan',
              ROOT_URL: ctx.urlFor('wekan'),
              WITH_API: 'true'
            }),
            volumes: [ctx.vol('wekan', 'data') + ':/data']
          }
        };
      }
    },
    {
      id: 'opensign', name: 'OpenSign', cat: 'Workspaces and boards', job: 'signing',
      deploy: 'service', image: 'opensign/opensignserver:main', port: 8080, host: 8086,
      requires: ['mongo'],
      desc: 'Send a document, place fields, collect signatures, keep an audit trail.',
      secrets: [{ key: 'OPENSIGN_MASTER_KEY', kind: 'master12' }],
      extraPorts: 1,
      fields: [{ key: 'OPENSIGN_SMTP_HOST', label: 'SMTP host', def: '' },
               { key: 'OPENSIGN_SMTP_PORT', label: 'SMTP port', def: '587' },
               { key: 'OPENSIGN_SMTP_USER', label: 'SMTP username', def: '' },
               { key: 'OPENSIGN_SMTP_PASS', label: 'SMTP password', def: '' }],
      notes: ['Upstream ships its own compose file and Caddyfile. This generates the same services without the bundled Caddy, on the assumption you have a reverse proxy already. If you would rather follow upstream exactly, use their files instead.',
              'SMTP is not optional. Without a working mail adapter, verification and password resets fail.',
              'Replace the signing certificate before signing anything you rely on. PFX_BASE64 is left as CHANGEME deliberately.'],
      compose: function (ctx) {
        return {
          opensign: {
            image: this.image,
            restart: 'unless-stopped',
            depends_on: ['mongo'],
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              NODE_ENV: 'production',
              PARSE_MOUNT: '/app',
              APP_ID: 'opensign',
              MASTER_KEY: '${OPENSIGN_MASTER_KEY}',
              MONGODB_URI: 'mongodb://mongo:27017/OpenSignDB',
              SERVER_URL: ctx.urlFor('opensign') + '/app',
              PUBLIC_URL: ctx.urlFor('opensign-client'),
              SMTP_ENABLE: 'true',
              SMTP_HOST: '${OPENSIGN_SMTP_HOST}',
              SMTP_PORT: '${OPENSIGN_SMTP_PORT}',
              SMTP_USER_EMAIL: '${OPENSIGN_SMTP_USER}',
              SMTP_PASS: '${OPENSIGN_SMTP_PASS}',
              PFX_BASE64: '${OPENSIGN_PFX_BASE64}'
            }),
            volumes: [ctx.vol('opensign', 'files') + ':/usr/src/app/files']
          },
          'opensign-client': {
            image: 'opensign/opensign:main',
            restart: 'unless-stopped',
            depends_on: ['opensign'],
            ports: [(ctx.hostPort(this) + 1) + ':3000'],
            environment: envList({
              PUBLIC_URL: ctx.urlFor('opensign-client'),
              REACT_APP_APPID: 'opensign',
              REACT_APP_SERVERURL: ctx.urlFor('opensign') + '/app'
            })
          }
        };
      }
    },
    {
      id: 'appflowy', name: 'AppFlowy', cat: 'Workspaces and boards', job: 'workspace',
      deploy: 'upstream', desc: 'Notion-shaped workspace with desktop and mobile clients.',
      upstreamUrl: 'https://github.com/AppFlowy-IO/AppFlowy-Cloud',
      notes: ['AppFlowy Cloud is a multi-service stack deployed from its own repository, with PostgreSQL, Redis, MinIO, GoTrue and nginx of its own. No compose service is generated for it.',
              'Upstream asks for 4GB of RAM as a minimum and 8GB recommended, plus a real domain, because the clients connect to a base URL and a websocket URL that both have to resolve.']
    },
    {
      id: 'huly', name: 'Huly', cat: 'Workspaces and boards', job: 'workspace',
      deploy: 'upstream', desc: 'Projects, issues, documents and calls in one platform.',
      upstreamUrl: 'https://github.com/hcengineering/huly-selfhost',
      notes: ['Deployed from huly-selfhost with its own setup script and nginx config. No compose service is generated for it.',
              'Upstream states a minimum of 2 vCPUs and 8GB RAM, recommends 4 vCPUs and 16GB, and warns that smaller servers may fail. 0.6 to 0.7 needs dedicated migration steps.']
    },

    /* --- meetings --- */
    {
      id: 'jitsi', name: 'Jitsi Meet', cat: 'Meetings', job: 'video',
      deploy: 'upstream', desc: 'Video calls. Four services and its own secret generator.',
      upstreamUrl: 'https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker/',
      notes: ['Upstream says to download the release rather than clone the repository, then run its own gen-passwords.sh to write every secret into .env. Generating those here would produce components that disagree with each other, so no compose service is generated.',
              'Needs 10000/udp and 4443/tcp open for media, which is different from everything else on this site.',
              'Plain HTTP produces camera and microphone errors. Port 8000 exists for proxied setups only.']
    },

    /* --- docker management --- */
    {
      id: 'arcane', name: 'Arcane', cat: 'Docker management', job: 'docker-ui',
      deploy: 'service', image: 'ghcr.io/getarcaneapp/arcane:latest',
      port: 3552, host: 3552,
      desc: 'A web UI for Docker itself: containers, images, volumes, Compose projects.',
      secrets: [{ key: 'ARCANE_ENCRYPTION_KEY', kind: 'hex64' },
                { key: 'ARCANE_JWT_SECRET', kind: 'hex64' }],
      dockerSocket: true, alwaysSocket: true, ownScript: 'install-arcane.sh',
      notes: ['Arcane needs the Docker socket to do its job at all, so it cannot be run without it. That is root on the host in practical terms, which is why it is never written into the proxy config.',
              'Image path changed. All Arcane repositories moved to the getarcaneapp organisation, and releases after 1.7.2 come from ghcr.io/getarcaneapp/arcane. Guides pointing at ghcr.io/ofkm/arcane are pinned to an old namespace.',
              'Contested: some recent guides use ghcr.io/getarcaneapp/manager. The organisation README names ghcr.io/getarcaneapp/arcane, which is what this uses.',
              'ENCRYPTION_KEY protects stored credentials and must be at least 32 characters. Both keys are generated at 64 hex characters here.',
              'It has its own install script so you can put it on a machine before any of the rest of this exists. That is the beginner path.'],
      compose: function (ctx) {
        return {
          arcane: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({
              APP_URL: ctx.urlFor('arcane'),
              PUID: '${PUID}', PGID: '${PGID}', TZ: '${TZ}',
              ENCRYPTION_KEY: '${ARCANE_ENCRYPTION_KEY}',
              JWT_SECRET: '${ARCANE_JWT_SECRET}'
            }),
            volumes: ['/var/run/docker.sock:/var/run/docker.sock',
                      ctx.vol('arcane', 'data') + ':/app/data'],
            healthcheck: {
              test: ['CMD-SHELL', 'curl -fsS http://localhost:3552/api/health >/dev/null || exit 1'],
              interval: '10s', timeout: '3s', retries: 5, start_period: '15s'
            }
          }
        };
      }
    },

    /* --- dashboards --- */
    {
      id: 'homarr', name: 'Homarr', cat: 'Dashboards', job: 'dashboard',
      deploy: 'service', image: 'ghcr.io/homarr-labs/homarr:latest', port: 7575, host: 7575,
      desc: 'Drag and drop board with live integrations and its own accounts.',
      secrets: [{ key: 'HOMARR_SECRET_ENCRYPTION_KEY', kind: 'hex64' }],
      dockerSocket: true,
      notes: ['SECRET_ENCRYPTION_KEY encrypts every stored integration credential. Keep it. Rotating it makes them all undecryptable.',
              'The Docker socket mount is optional and off unless you turn it on. It is root on the host in practical terms.'],
      compose: function (ctx) {
        var vols = [ctx.vol('homarr', 'appdata') + ':/appdata'];
        if (ctx.state.dockerSocket) vols.push('/var/run/docker.sock:/var/run/docker.sock:ro');
        return {
          homarr: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({ SECRET_ENCRYPTION_KEY: '${HOMARR_SECRET_ENCRYPTION_KEY}', TZ: '${TZ}' }),
            volumes: vols
          }
        };
      }
    },
    {
      id: 'dashy', name: 'Dashy', cat: 'Dashboards', job: 'dashboard',
      deploy: 'service', image: 'lissy93/dashy:latest', port: 8080, host: 4000,
      desc: 'Dashboard as a YAML file you keep in version control.',
      notes: ['Container port is 8080, not 80. That changed in version 3 and older guides still show 80.',
              'Config goes in a directory mounted at /app/user-data containing conf.yml, not a single file at /app/public/conf.yml.'],
      compose: function (ctx) {
        return {
          dashy: {
            image: this.image,
            restart: 'unless-stopped',
            ports: [ctx.hostPort(this) + ':' + this.port],
            environment: envList({ NODE_ENV: 'production' }),
            volumes: [ctx.vol('dashy', 'user-data') + ':/app/user-data'],
            healthcheck: {
              test: ['CMD', 'node', '/app/services/healthcheck.js'],
              interval: '90s', timeout: '10s', retries: 3, start_period: '30s'
            }
          }
        };
      }
    }
  ];

  var BY_ID = {};
  MODULES.forEach(function (m) { BY_ID[m.id] = m; });

  var PRESETS = {
    small: { label: 'Small', ids: ['bookstack', 'forgejo', 'pairdrop', 'dashy'] },
    usual: { label: 'The usual one', ids: ['bookstack', 'forgejo', 'paperless', 'stirling', 'psitransfer', 'homarr'] },
    large: { label: 'Large', ids: ['bookstack', 'forgejo', 'paperless', 'stirling', 'pdfding', 'psitransfer', 'pairdrop', 'cryptpad', 'wekan', 'homarr', 'kiwix'] },
    // One of each job. "Everything" is no longer selectable, because the
    // alternatives exclude each other.
    everything: {
      label: 'One of each',
      ids: (function () {
        var seen = {}, out = [];
        MODULES.forEach(function (m) {
          if (m.support || seen[m.job]) return;
          seen[m.job] = true;
          out.push(m.id);
        });
        return out;
      })()
    }
  };

  /* ---------- state ---------- */

  function newState() {
    return {
      chosen: {},        // id -> 'user' | 'auto'
      layout: 'bind',
      basePath: '/srv/workspace',
      domain: '',
      sandboxDomain: '',
      useProxy: false,
      tz: 'Etc/UTC',
      puid: '1000',
      pgid: '1000',
      dockerSocket: false,
      secrets: {},       // key -> value
      revealed: {},      // key -> true
      fields: {}         // key -> value
    };
  }

  function selectedIds(st) { return Object.keys(st.chosen); }
  function selectedModules(st) {
    return MODULES.filter(function (m) { return st.chosen[m.id]; });
  }

  /* ---------- dependency resolution ----------
     add(): pull in requirements and mark them 'auto' so the UI can show why
     they appeared. A module the user picked themselves stays 'user' even if
     something else also requires it. */

  // Which already-selected modules would be dropped by adding this one.
  // Alternatives are mutually exclusive: one per job.
  function wouldReplace(st, id) {
    var m = BY_ID[id];
    if (!m || m.support || !m.job) return [];
    return selectedIds(st).filter(function (other) {
      var o = BY_ID[other];
      return other !== id && !o.support && o.job === m.job;
    });
  }

  function add(st, id, how) {
    var m = BY_ID[id];
    if (!m) throw new Error('unknown module: ' + id);
    // One per job. Picking BookStack when Wiki.js is selected swaps them
    // rather than leaving you with two wikis.
    wouldReplace(st, id).forEach(function (other) { remove(st, other); });
    if (st.chosen[id] === 'user') {
      // already an explicit choice; never downgrade it to auto
    } else {
      st.chosen[id] = how || 'user';
    }
    (m.requires || []).forEach(function (dep) {
      if (!st.chosen[dep]) add(st, dep, 'auto');
    });
    ensureSecrets(st);
    return st;
  }

  function dependentsOf(st, id) {
    return selectedIds(st).filter(function (other) {
      return (BY_ID[other].requires || []).indexOf(id) !== -1;
    });
  }

  // Removing a module removes anything that depended on it, then drops any
  // auto-added dependency nothing needs any more. A dependency the user chose
  // explicitly is kept.
  function remove(st, id) {
    if (!st.chosen[id]) return st;
    dependentsOf(st, id).forEach(function (d) { remove(st, d); });
    delete st.chosen[id];
    var changed = true;
    while (changed) {
      changed = false;
      selectedIds(st).forEach(function (other) {
        if (st.chosen[other] !== 'auto') return;
        if (dependentsOf(st, other).length === 0) {
          delete st.chosen[other];
          changed = true;
        }
      });
    }
    ensureSecrets(st);
    return st;
  }

  function toggle(st, id) {
    return st.chosen[id] ? remove(st, id) : add(st, id, 'user');
  }

  function applyPreset(st, name) {
    st.chosen = {};
    (PRESETS[name].ids).forEach(function (id) { add(st, id, 'user'); });
    return st;
  }

  /* ---------- secrets ---------- */

  function secretSpecs(st) {
    var out = [];
    selectedModules(st).forEach(function (m) {
      (m.secrets || []).forEach(function (s) {
        out.push({ key: s.key, kind: s.kind, module: m.id, name: m.name });
      });
    });
    return out;
  }

  function ensureSecrets(st) {
    var want = {};
    secretSpecs(st).forEach(function (s) {
      want[s.key] = true;
      if (!st.secrets[s.key]) st.secrets[s.key] = makeSecret(s.kind);
    });
    Object.keys(st.secrets).forEach(function (k) {
      if (!want[k]) { delete st.secrets[k]; delete st.revealed[k]; }
    });
    return st;
  }

  // Regenerating re-masks everything. A value revealed before a regenerate
  // must not stay revealed afterwards.
  function regenerateSecrets(st) {
    st.secrets = {};
    st.revealed = {};
    ensureSecrets(st);
    return st;
  }

  function fieldSpecs(st) {
    var out = [];
    selectedModules(st).forEach(function (m) {
      (m.fields || []).forEach(function (f) {
        out.push({ key: f.key, label: f.label, def: f.def, module: m.id, name: m.name });
      });
    });
    if (selectedIds(st).indexOf('opensign') !== -1) {
      out.push({ key: 'OPENSIGN_PFX_BASE64', label: 'Signing certificate (base64 PFX)', def: '', module: 'opensign', name: 'OpenSign' });
    }
    return out;
  }

  function mask(v) { return v ? '\u2022'.repeat(Math.min(v.length, 32)) : ''; }

  /* ---------- context passed to compose() ---------- */

  function makeCtx(st) {
    var layout = LAYOUTS[st.layout] || LAYOUTS.bind;
    var used = {};
    var assigned = {};
    // Host ports are assigned once, in registry order, so the same selection
    // always produces the same file.
    selectedModules(st).forEach(function (m) {
      if (m.deploy !== 'service' || m.support) return;
      var p = m.host || m.port;
      while (used[p] || used[p + 1] && m.extraPorts) p++;
      used[p] = true;
      if (m.extraPorts) { for (var k = 1; k <= m.extraPorts; k++) used[p + k] = true; }
      assigned[m.id] = p;
    });
    return {
      state: st,
      layout: layout,
      assigned: assigned,
      hostPort: function (m) { return assigned[m.id]; },
      dbSecretEnv: function (engine) {
        return selectedModules(st).filter(function (m) {
          return m.db && m.db.engine === engine;
        }).map(function (m) { return m.db.secret + '=${' + m.db.secret + '}'; });
      },
      vol: function (mod, sub) { return layout.path(mod, sub, st); },
      hostFor: function (id) {
        if (!st.domain) return 'CHANGEME';
        return id + '.' + st.domain;
      },
      urlFor: function (id) {
        if (!st.domain) return 'CHANGEME';
        return 'https://' + id + '.' + st.domain;
      }
    };
  }

  /* ---------- compose ---------- */

  function namedVolumes(st, ctx) {
    if (!ctx.layout.named) return null;
    var vols = {};
    var built = buildServices(st, ctx);
    built.order.forEach(function (name) {
      var svc = built.services[name];
      (svc.volumes || []).forEach(function (v) {
        var left = String(v).split(':')[0];
        if (!/^[.\/]/.test(left)) vols[left] = { driver: 'local' };
      });
    });
    return Object.keys(vols).length ? vols : null;
  }

  function buildServices(st, ctx) {
    var services = {}, order = [];
    selectedModules(st).forEach(function (m) {
      if (m.deploy !== 'service') return;
      var part = m.compose(ctx);
      Object.keys(part).forEach(function (name) {
        services[name] = part[name];
        order.push(name);
      });
    });
    var ordered = {};
    order.forEach(function (n) { ordered[n] = services[n]; });
    return { services: ordered, order: order };
  }

  function buildCompose(st) {
    var ctx = makeCtx(st);
    var built = buildServices(st, ctx);
    var doc = { services: built.services };
    var vols = namedVolumes(st, ctx);
    if (vols) doc.volumes = vols;
    var header =
      '# docker-compose.yml\n' +
      '# Generated by Modular Workspace Server.\n' +
      '# Storage layout: ' + ctx.layout.label + '\n' +
      '# Secrets live in .env, which is gitignored. Never commit that file.\n\n';
    return header + toYaml(doc);
  }

  /* ---------- env files ---------- */

  function envPairs(st) {
    var pairs = [
      { key: 'TZ', val: st.tz || 'Etc/UTC', secret: false },
      { key: 'PUID', val: st.puid || '1000', secret: false },
      { key: 'PGID', val: st.pgid || '1000', secret: false }
    ];
    if (st.chosen.cryptpad) {
      pairs.push({ key: 'CRYPTPAD_MAIN_DOMAIN', val: st.domain ? 'https://pad.' + st.domain : 'CHANGEME', secret: false });
      pairs.push({ key: 'CRYPTPAD_SANDBOX_DOMAIN', val: st.sandboxDomain ? 'https://' + st.sandboxDomain : 'CHANGEME', secret: false });
    }
    fieldSpecs(st).forEach(function (f) {
      var v = st.fields[f.key];
      // Anything left blank is written as CHANGEME. Never guessed.
      pairs.push({ key: f.key, val: (v === undefined || v === '') ? 'CHANGEME' : v, secret: false });
    });
    secretSpecs(st).forEach(function (s) {
      pairs.push({ key: s.key, val: st.secrets[s.key], secret: true });
    });
    return pairs;
  }

  function buildEnv(st) {
    var out = '# .env - real values. This file is gitignored. Do not commit it.\n\n';
    envPairs(st).forEach(function (p) { out += p.key + '=' + p.val + '\n'; });
    return out;
  }

  function buildEnvExample(st) {
    var out = '# .env.example - safe to commit. No real secrets here.\n' +
              '# Copy to .env and fill in, or run install.sh which generates them.\n\n';
    envPairs(st).forEach(function (p) {
      out += p.key + '=' + (p.secret ? 'CHANGEME' : p.val) + '\n';
    });
    return out;
  }

  function buildGitignore() {
    return ['.env', 'data/', '*.bak', ''].join('\n');
  }

  /* ---------- reverse proxy ----------
     Anything that must not be exposed is not written into this file, and the
     file says which modules were left out and why. */

  function proxyExclusions(st) {
    var out = [];
    selectedModules(st).forEach(function (m) {
      if (m.neverExpose) {
        out.push({ id: m.id, name: m.name, why: 'no authentication by default, and the web interface includes a terminal with passwordless sudo' });
      } else if (m.dockerSocket && (m.alwaysSocket || st.dockerSocket)) {
        out.push({ id: m.id, name: m.name, why: 'you mounted the Docker socket into it, which is root on the host in practical terms' });
      }
    });
    return out;
  }

  function buildCaddyfile(st) {
    var ctx = makeCtx(st);
    var out = '# Caddyfile - generated by Modular Workspace Server\n#\n';
    var excl = proxyExclusions(st);
    if (excl.length) {
      out += '# Deliberately NOT proxied:\n';
      excl.forEach(function (e) {
        out += '#   ' + e.name + ' - ' + e.why + '.\n';
      });
      out += '#   Reach these over a VPN instead. Adding them here would publish them.\n#\n';
    }
    out += '\n';
    selectedModules(st).forEach(function (m) {
      if (m.deploy !== 'service' || m.support) return;
      if (m.neverExpose) return;
      if (m.dockerSocket && (m.alwaysSocket || st.dockerSocket)) return;
      var host = st.domain ? m.id + '.' + st.domain : 'CHANGEME';
      out += host + ' {\n    reverse_proxy ' + m.id + ':' + m.port + '\n}\n\n';
    });
    return out;
  }

  /* ---------- database init ---------- */

  function dbUsers(st, engine) {
    return selectedModules(st).filter(function (m) {
      return m.db && m.db.engine === engine;
    });
  }

  // These run as shell scripts, not .sql. Files ending in .sql are piped
  // straight into the client with no variable expansion, so ${VAR} would be
  // written literally as the password. A .sh is run by the entrypoint with the
  // container environment available.
  function dbInit(st, engine) {
    var users = dbUsers(st, engine);
    if (!users.length) return null;
    var out = '#!/bin/sh\nset -e\n\n';
    if (engine === 'postgres') {
      out += 'psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<EOSQL\n';
      users.forEach(function (m) {
        out += "CREATE USER " + m.db.user + " WITH PASSWORD '${" + m.db.secret + "}';\n";
        out += 'CREATE DATABASE ' + m.db.name + ' OWNER ' + m.db.user + ';\n';
      });
      out += 'EOSQL\n';
    } else {
      out += 'mariadb -u root -p"$MARIADB_ROOT_PASSWORD" <<EOSQL\n';
      users.forEach(function (m) {
        out += 'CREATE DATABASE IF NOT EXISTS ' + m.db.name + ' CHARACTER SET utf8mb4;\n';
        out += "CREATE USER IF NOT EXISTS '" + m.db.user + "'@'%' IDENTIFIED BY '${" + m.db.secret + "}';\n";
        out += 'GRANT ALL ON ' + m.db.name + ".* TO '" + m.db.user + "'@'%';\n";
      });
      out += 'FLUSH PRIVILEGES;\nEOSQL\n';
    }
    return out;
  }

  /* ---------- validation ---------- */

  function validate(st) {
    var errors = [], warnings = [];
    var mods = selectedModules(st).filter(function (m) { return !m.support; });

    if (!mods.length) errors.push('Nothing selected yet. Pick at least one module.');

    if (st.layout === 'custom' && !/^\//.test(st.basePath || '')) {
      errors.push('Custom storage needs an absolute path, starting with a slash.');
    }

    if (st.chosen.cryptpad) {
      var main = st.domain ? 'pad.' + st.domain : '';
      if (!st.sandboxDomain) {
        errors.push('CryptPad needs a second, different sandbox domain. Upstream says running without it may put users\u2019 information at risk.');
      } else if (main && st.sandboxDomain === main) {
        errors.push('CryptPad\u2019s sandbox domain must be different from its main domain. They are currently the same.');
      }
    }

    // host port collisions
    var ctx = makeCtx(st), seen = {};
    var built = buildServices(st, ctx);
    Object.keys(built.services).forEach(function (name) {
      (built.services[name].ports || []).forEach(function (p) {
        var host = String(p).split(':')[0];
        if (seen[host]) errors.push('Host port ' + host + ' is used by both ' + seen[host] + ' and ' + name + '.');
        seen[host] = name;
      });
    });

    // alternatives are mutually exclusive, so two of a job should be
    // unreachable. If it ever happens it is a bug, not a preference.
    var byJob = {};
    mods.forEach(function (m) { (byJob[m.job] = byJob[m.job] || []).push(m.name); });
    Object.keys(byJob).forEach(function (job) {
      if (byJob[job].length > 1) {
        errors.push(byJob[job].join(' and ') + ' both do the same job and cannot run together.');
      }
    });

    if (!st.domain) warnings.push('No domain set, so URLs are written as CHANGEME. Apps that need to know their own address will not work until you fill them in.');
    if (st.dockerSocket) warnings.push('The Docker socket is mounted. That is root on the host in practical terms, and the module using it is excluded from the proxy config.');
    mods.forEach(function (m) {
      if (m.neverExpose) warnings.push(m.name + ' has no authentication by default. It is excluded from the proxy config. Reach it over a VPN.');
      if (m.deploy === 'upstream') warnings.push(m.name + ' is installed from its own repository, so no compose service is generated for it. See the README.');
    });
    fieldSpecs(st).forEach(function (f) {
      if (!st.fields[f.key]) warnings.push(f.name + ': ' + f.label + ' is blank, so it is written as CHANGEME.');
    });

    return { errors: errors, warnings: warnings, ok: errors.length === 0 };
  }

  /* ---------- README ---------- */

  function buildReadme(st) {
    var ctx = makeCtx(st);
    var mods = selectedModules(st).filter(function (m) { return !m.support; });
    var out = '# Your workspace server\n\nGenerated by Modular Workspace Server.\n\n';
    out += '## What is in here\n\n';
    out += '| File | What it is |\n|---|---|\n';
    out += '| docker-compose.yml | The stack |\n| .env | Real secrets. Gitignored |\n';
    out += '| .env.example | Safe to commit |\n| .gitignore | Keeps .env out of git |\n';
    if (st.useProxy) out += '| Caddyfile | Reverse proxy config |\n';
    if (dbInit(st, 'postgres')) out += '| db-init/postgres/init.sh | Creates one database per app |\n';
    if (dbInit(st, 'mariadb')) out += '| db-init/mariadb/init.sh | Creates one database per app |\n';
    out += '| install.sh | Creates directories, sets permissions, starts the stack |\n\n';

    out += '## Start it\n\n```sh\nsh install.sh\n```\n\n';
    out += 'Or by hand:\n\n```sh\ndocker compose up -d\ndocker compose logs -f\n```\n\n';

    out += '## Ports\n\n| Module | URL |\n|---|---|\n';
    mods.forEach(function (m) {
      if (m.deploy !== 'service') return;
      out += '| ' + m.name + ' | http://localhost:' + ctx.hostPort(m) + ' |\n';
    });
    out += '\n';

    var upstream = mods.filter(function (m) { return m.deploy === 'upstream'; });
    if (upstream.length) {
      out += '## Installed separately\n\n';
      out += 'These are not in docker-compose.yml. Each is a multi-service stack with its own\ndeployment process, and inventing a compose service for them would be guessing.\n\n';
      upstream.forEach(function (m) {
        out += '### ' + m.name + '\n\n' + m.desc + '\n\n';
        (m.notes || []).forEach(function (n) { out += '- ' + n + '\n'; });
        out += '\nUpstream: ' + m.upstreamUrl + '\n\n';
      });
    }

    var excl = proxyExclusions(st);
    if (excl.length) {
      out += '## Not published\n\n';
      excl.forEach(function (e) {
        out += '- **' + e.name + '** - ' + e.why + '. Left out of the proxy config on purpose.\n';
      });
      out += '\n';
    }

    out += '## Notes per module\n\n';
    mods.forEach(function (m) {
      if (!m.notes || !m.notes.length) return;
      out += '### ' + m.name + '\n\n';
      m.notes.forEach(function (n) { out += '- ' + n + '\n'; });
      out += '\n';
    });

    out += '## Backups\n\n';
    out += '- Copy your storage directories and this folder.\n';
    out += '- Dump databases rather than copying their files while running.\n';
    out += '- Back up .env separately. It holds keys that exist nowhere else,\n';
    out += '  and a perfect data backup will not start without them.\n';
    return out;
  }

  /* ---------- shared script preamble ----------
     Both generated scripts start with exactly the same block, so the checks a
     reader gets do not depend on which script they happened to run. The test
     suite compares the two byte for byte.

     POSIX sh throughout: macOS ships bash 3.2, so no associative arrays, no
     mapfile, no ${var^^}, and no [[ ]]. */

  function platformPreamble(title) {
    return '#!/bin/sh\n' +
      '# ' + title + '\n' +
      '# Generated by Modular Workspace Server.\n' +
      'set -eu\n' +
      '\n' +
      'say() { printf "%s\\n" "$*"; }\n' +
      'die() { printf "%s\\n" "$*" >&2; exit 1; }\n' +
      '\n' +
      'MWS_OS="unknown"\n' +
      'case "$(uname -s 2>/dev/null || echo unknown)" in\n' +
      '  Linux)\n' +
      '    if grep -qi microsoft /proc/version 2>/dev/null; then\n' +
      '      MWS_OS="wsl"\n' +
      '    else\n' +
      '      MWS_OS="linux"\n' +
      '    fi\n' +
      '    ;;\n' +
      '  Darwin) MWS_OS="macos" ;;\n' +
      '  MINGW*|MSYS*|CYGWIN*) MWS_OS="gitbash" ;;\n' +
      'esac\n' +
      '\n' +
      'MWS_HOME="${HOME:-/root}"\n' +
      'case "$MWS_OS" in\n' +
      '  linux)\n' +
      '    MWS_DEFAULT_BASE="/srv/workspace"\n' +
      '    ;;\n' +
      '  wsl)\n' +
      '    MWS_DEFAULT_BASE="$MWS_HOME/workspace"\n' +
      '    say "WSL detected. Keep your data inside the Linux filesystem."\n' +
      '    say "Paths under /mnt/c are slow and lose Unix permissions, which"\n' +
      '    say "breaks anything that checks file ownership."\n' +
      '    ;;\n' +
      '  macos)\n' +
      '    MWS_DEFAULT_BASE="$MWS_HOME/workspace"\n' +
      '    say "macOS detected. Docker Desktop runs containers in a VM, so bind"\n' +
      '    say "mounts are slower than on Linux and PUID and PGID are ignored."\n' +
      '    ;;\n' +
      '  gitbash)\n' +
      '    MWS_DEFAULT_BASE="$MWS_HOME/workspace"\n' +
      '    say "Git Bash detected. It rewrites arguments that look like paths."\n' +
      '    say "If a container path arrives mangled, prefix the command with"\n' +
      '    say "MSYS_NO_PATHCONV=1."\n' +
      '    ;;\n' +
      '  *)\n' +
      '    MWS_DEFAULT_BASE="$MWS_HOME/workspace"\n' +
      '    say "Could not identify this system. Continuing with generic defaults."\n' +
      '    ;;\n' +
      'esac\n' +
      '\n' +
      'command -v docker >/dev/null 2>&1 || die "docker is not on PATH. Install Docker first."\n' +
      'docker compose version >/dev/null 2>&1 || \\\n' +
      '  die "The docker compose plugin is missing. Install it, or upgrade Docker."\n' +
      'docker info >/dev/null 2>&1 || \\\n' +
      '  die "Docker is installed but not responding. Is the daemon running?"\n' +
      '\n';
  }

  /* ---------- install-arcane.sh ----------
     Standalone on purpose. Arcane manages Docker itself, so it is the thing
     you can put on a machine before the rest of this exists. */

  function buildArcaneSh(st) {
    var out = platformPreamble('install-arcane.sh - Arcane, a web UI for Docker');
    out += 'ARCANE_DIR="${1:-$MWS_DEFAULT_BASE/arcane}"\n';
    out += 'say "Installing Arcane into $ARCANE_DIR"\n';
    out += 'mkdir -p "$ARCANE_DIR/data"\n';
    out += 'cd "$ARCANE_DIR"\n\n';
    out += 'gen_secret() {\n';
    out += '  if command -v openssl >/dev/null 2>&1; then\n';
    out += '    openssl rand -hex 32\n';
    out += '  elif [ -r /dev/urandom ]; then\n';
    out += '    od -An -tx1 -N32 /dev/urandom | tr -d " \\n"\n';
    out += '  else\n';
    out += '    die "No openssl and no /dev/urandom. Cannot generate a key safely."\n';
    out += '  fi\n';
    out += '}\n\n';
    out += 'if [ -f .env ]; then\n';
    out += '  say "Keeping the existing .env. Delete it first if you want new keys."\n';
    out += 'else\n';
    out += '  # ENCRYPTION_KEY protects stored credentials and must be at least 32\n';
    out += '  # characters. Both are written at 64 hex characters.\n';
    out += '  printf "ENCRYPTION_KEY=%s\\nJWT_SECRET=%s\\nPUID=%s\\nPGID=%s\\n" \\\n';
    out += '    "$(gen_secret)" "$(gen_secret)" "$(id -u)" "$(id -g)" > .env\n';
    out += '  chmod 600 .env\n';
    out += '  say "Wrote .env. Back it up: losing ENCRYPTION_KEY means re-entering every stored credential."\n';
    out += 'fi\n\n';
    out += 'cat > docker-compose.yml <<\'COMPOSE\'\n';
    out += 'services:\n';
    out += '  arcane:\n';
    out += '    image: ghcr.io/getarcaneapp/arcane:latest\n';
    out += '    container_name: arcane\n';
    out += '    restart: unless-stopped\n';
    out += '    ports:\n';
    out += '      - "3552:3552"\n';
    out += '    environment:\n';
    out += '      - APP_URL=http://localhost:3552\n';
    out += '      - PUID=${PUID}\n';
    out += '      - PGID=${PGID}\n';
    out += '      - ENCRYPTION_KEY=${ENCRYPTION_KEY}\n';
    out += '      - JWT_SECRET=${JWT_SECRET}\n';
    out += '    volumes:\n';
    out += '      - /var/run/docker.sock:/var/run/docker.sock\n';
    out += '      - ./data:/app/data\n';
    out += 'COMPOSE\n\n';
    out += 'say ""\n';
    out += 'say "Arcane gets the Docker socket, which is root on this host in"\n';
    out += 'say "practical terms. Anyone who reaches port 3552 can run any"\n';
    out += 'say "container as root. Do not publish it. Reach it over a VPN."\n';
    out += 'say ""\n';
    out += 'docker compose up -d\n';
    out += 'say "Arcane is starting on http://localhost:3552"\n';
    out += 'say "Change the default password before you do anything else."\n';
    return out;
  }

  /* ---------- install.sh ---------- */

  function buildInstallSh(st) {
    var ctx = makeCtx(st);
    var out = platformPreamble('install.sh - start your workspace server');
    out += 'say "Platform: $MWS_OS. Storage layout: ' + ctx.layout.label.toLowerCase() + '."\n';
    out += 'say "Usual data location on this system: $MWS_DEFAULT_BASE"\n\n';

    if (!ctx.layout.named) {
      out += 'say "Creating storage directories"\n';
      var dirs = {};
      selectedModules(st).forEach(function (m) {
        if (m.deploy !== 'service') return;
        var part = m.compose(ctx);
        Object.keys(part).forEach(function (n) {
          (part[n].volumes || []).forEach(function (v) {
            var left = String(v).split(':')[0];
            if (/^[.\/]/.test(left) && left.indexOf('/etc/') !== 0 && left.indexOf('/var/run/') !== 0) dirs[left] = true;
          });
        });
      });
      Object.keys(dirs).sort().forEach(function (d) {
        out += 'mkdir -p "' + d + '"\n';
      });
      out += '\n';
      selectedModules(st).forEach(function (m) {
        if (!m.chown) return;
        var part = m.compose(ctx);
        Object.keys(part).forEach(function (n) {
          (part[n].volumes || []).forEach(function (v) {
            var left = String(v).split(':')[0];
            if (!/^[.\/]/.test(left)) return;
            out += '# ' + m.name + ' requires this path to be owned by UID ' + m.chown + '\n';
            out += 'chown -R ' + m.chown + ' "' + left + '" 2>/dev/null || \\\n';
            out += '  echo "could not chown ' + left + ' - rerun with sudo if ' + m.name + ' fails to start" >&2\n';
          });
        });
      });
      out += '\n';
    }

    if (!ctx.layout.named) {
      var extra = [];
      selectedModules(st).forEach(function (m) {
        (m.mkdirs || []).forEach(function () { extra.push(m.name); });
      });
    }

    out += 'if [ ! -f .env ]; then\n';
    out += '  die "No .env found. Copy .env.example to .env and fill it in first."\nfi\n\n';
    out += 'if grep -q "^[A-Z_]*=CHANGEME$" .env; then\n';
    out += '  say "Warning: .env still contains CHANGEME values:" >&2\n';
    out += '  grep -n "=CHANGEME$" .env >&2\n';
    out += 'fi\n\n';
    out += 'say "Starting the stack"\n';
    out += 'docker compose up -d\n';
    out += 'say ""\n';
    out += 'say "Running. Check progress with: docker compose logs -f"\n';
    return out;
  }

  /* ---------- file set ---------- */

  function buildFiles(st) {
    var files = [
      { name: 'docker-compose.yml', body: buildCompose(st) },
      { name: '.env', body: buildEnv(st) },
      { name: '.env.example', body: buildEnvExample(st) },
      { name: '.gitignore', body: buildGitignore() },
      { name: 'README.md', body: buildReadme(st) },
      { name: 'install.sh', body: buildInstallSh(st) }
    ];
    if (st.chosen.arcane) files.push({ name: 'install-arcane.sh', body: buildArcaneSh(st) });
    if (st.useProxy) files.push({ name: 'Caddyfile', body: buildCaddyfile(st) });
    var pg = dbInit(st, 'postgres');
    if (pg) files.push({ name: 'db-init/postgres/init.sh', body: pg });
    var my = dbInit(st, 'mariadb');
    if (my) files.push({ name: 'db-init/mariadb/init.sh', body: my });
    return files;
  }

  /* ---------- ZIP, STORE method ----------
     Written by hand rather than pulled in as a dependency. This page generates
     secrets; it is not the place to load third-party script. */

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256), c, n, k;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF, i;
    for (i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    return new Uint8Array(Buffer.from(str, 'utf8'));
  }

  function zipStore(files) {
    var chunks = [], central = [], offset = 0;

    function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
    function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }

    files.forEach(function (f) {
      var name = utf8(f.name), data = utf8(f.body), crc = crc32(data);
      var local = [].concat(
        u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
        u32(crc), u32(data.length), u32(data.length),
        u16(name.length), u16(0)
      );
      chunks.push(new Uint8Array(local), name, data);
      central.push({ name: name, crc: crc, size: data.length, offset: offset });
      offset += local.length + name.length + data.length;
    });

    var cdir = [];
    central.forEach(function (e) {
      var h = [].concat(
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
        u32(e.crc), u32(e.size), u32(e.size),
        u16(e.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.offset)
      );
      cdir.push(new Uint8Array(h), e.name);
    });
    var cdirSize = cdir.reduce(function (n, c) { return n + c.length; }, 0);
    var eocd = new Uint8Array([].concat(
      u32(0x06054b50), u16(0), u16(0),
      u16(files.length), u16(files.length),
      u32(cdirSize), u32(offset), u16(0)
    ));

    var all = chunks.concat(cdir, [eocd]);
    var total = all.reduce(function (n, c) { return n + c.length; }, 0);
    var out = new Uint8Array(total), p = 0;
    all.forEach(function (c) { out.set(c, p); p += c.length; });
    return out;
  }

  return {
    MODULES: MODULES, BY_ID: BY_ID, PRESETS: PRESETS, LAYOUTS: LAYOUTS,
    newState: newState, add: add, remove: remove, toggle: toggle,
    applyPreset: applyPreset, selectedModules: selectedModules,
    dependentsOf: dependentsOf,
    ensureSecrets: ensureSecrets, regenerateSecrets: regenerateSecrets,
    secretSpecs: secretSpecs, fieldSpecs: fieldSpecs, mask: mask,
    makeCtx: makeCtx, buildCompose: buildCompose, buildEnv: buildEnv,
    buildEnvExample: buildEnvExample, buildGitignore: buildGitignore,
    buildReadme: buildReadme, buildCaddyfile: buildCaddyfile,
    buildInstallSh: buildInstallSh, buildArcaneSh: buildArcaneSh,
    platformPreamble: platformPreamble, wouldReplace: wouldReplace, dbInit: dbInit,
    proxyExclusions: proxyExclusions,
    validate: validate, buildFiles: buildFiles,
    zipStore: zipStore, crc32: crc32, toYaml: toYaml
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
/* ==MWS-CORE-END== */
