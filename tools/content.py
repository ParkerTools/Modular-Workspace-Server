# -*- coding: utf-8 -*-
"""Written page bodies, keyed by file then section id.

Any section not present here falls back to the PLACEHOLDER stub in
scaffold.py, so half-written pages still build and still pass the tests.
"""

CONTENT = {}

# --------------------------------------------------------------------------
CONTENT["index.html"] = {

"what": """
<p class="lead">This site helps you run your own document server: the things
you write in, the things you file, the things you sign, and the code you keep.
Twenty-four containers, grouped by the job they do.</p>

<p>Most self-hosting guides hand you one enormous compose file and wish you
luck. That works right up to the first error message, at which point you have
no idea which of the fourteen services is broken or why. This site takes the
opposite approach. Every container is a module you can add or leave out, and
every module entry tells you what it needs, what it costs you, and what tends
to go wrong with it.</p>

<p>Three things are true of everything here:</p>

<ul>
<li>It runs in Docker, on hardware you control.</li>
<li>Your documents stay on your disk.</li>
<li>You can leave. Every module in the list has an export path, and the
<a href="faq.html#data">Help page</a> covers how to use it.</li>
</ul>

<div class="tip"><strong>You do not need all of this.</strong> A useful
workspace server is often three containers. The list is long because people
want different things, not because you should run the whole list.</div>
""",

"who": """
<p>You will get on with this site if you can open a terminal, edit a text
file, and are willing to read an error message rather than delete everything
and start again. You do not need to know Docker already. The
<a href="guide.html">Guide</a> covers what you need before anything else
makes sense.</p>

<p>You will find this frustrating if you want a one-click appliance. Several
of these applications need a database, a reverse proxy, and a real domain
name before they will work properly, and no amount of friendly writing
changes that. Where an app is genuinely hard to run, this site says so
instead of pretending.</p>

<div class="card teal">
<p><strong>What this costs.</strong> Nothing, if you already own a machine
that stays on. If you do not, the cheapest honest answer is usually a
second-hand mini PC rather than a VPS, because the storage is where the money
goes and rented storage is expensive. <a href="platforms.html">Platforms</a>
works through that comparison with numbers.</p>
</div>
""",

"stack": """
<p>The modules fall into seven jobs. Within a job, the options are genuine
alternatives, so you generally want one of each rather than all of them.</p>

<div class="tbl">
<table>
<thead><tr><th>Job</th><th>Options</th><th>Most people want</th></tr></thead>
<tbody>
<tr><td>PDF tools</td><td>Stirling-PDF, BentoPDF</td><td>Stirling-PDF, unless you want zero server-side processing</td></tr>
<tr><td>Document archive</td><td>Paperless-ngx, Docspell</td><td>Paperless-ngx</td></tr>
<tr><td>Reading library</td><td>PdfDing</td><td>Only if you read long PDFs across devices</td></tr>
<tr><td>Notes and wikis</td><td>BookStack, Wiki.js, Obsidian, Kiwix</td><td>BookStack</td></tr>
<tr><td>Code forge</td><td>Forgejo, Gogs</td><td>Forgejo</td></tr>
<tr><td>File transfer</td><td>PairDrop, PsiTransfer, Zipline, Chibisafe</td><td>PairDrop for the house, PsiTransfer for links</td></tr>
<tr><td>Dashboard</td><td>Homarr, Dashy</td><td>Either. Pick by whether you want YAML or a GUI</td></tr>
</tbody>
</table>
</div>

<p>The rest sit on their own: OpenSign for signatures, Jitsi Meet for calls,
Wekan for boards, CryptPad for encrypted collaborative editing, and AppFlowy
and Huly for full Notion-style workspaces. Those last two are much larger
than everything else here, and the <a href="hardware.html#ram">Hardware
page</a> explains why they get their own warning.</p>
""",

"start": """
<ol class="steps">
<li><strong>Read the <a href="guide.html">Guide</a>.</strong> Volumes,
networks and reverse proxies. Twenty minutes, and everything afterwards
assumes it.</li>
<li><strong>Pick a box.</strong> <a href="platforms.html">Platforms</a>
covers NAS, mini PC, VPS and Raspberry Pi, and what each can actually
carry.</li>
<li><strong>Build a compose file.</strong> The
<a href="generator.html">Generator</a> resolves dependencies, generates
secrets in your browser, and writes the files for you.</li>
<li><strong>Set the apps up.</strong> <a href="setup.html">App setup</a> has
the first-run steps and the specific place each app trips people up.</li>
<li><strong>Decide how you reach it.</strong> <a href="access.html">Access</a>
covers proxies, VPNs and tunnels, and lists the containers that should never
be published to the internet.</li>
</ol>

<div class="warning"><strong>Read the Access page before you open anything to
the internet.</strong> Two of the applications in this list ship with no
authentication at all and give anyone who reaches them a root shell inside
the container. They are still worth running. They are not worth publishing.
</div>
""",
}

# --------------------------------------------------------------------------
CONTENT["guide.html"] = {

"docker": """
<p class="lead">Docker packages an application with everything it needs, so
you run one command instead of installing a language runtime, a database
driver and six libraries. Compose describes a set of those containers in one
file so they start together.</p>

<p>You need two things installed: Docker Engine and the Compose plugin. On a
modern install they arrive together and the command is <code>docker
compose</code>, with a space. If your machine only has
<code>docker-compose</code> with a hyphen, that is the older standalone
version. It mostly works, but it predates some syntax used on this site, and
upgrading is easier than working around it.</p>

<p>A compose file is a list of services. Each service has an image, and
usually some combination of ports, volumes and environment variables:</p>

<pre>services:
  bookstack:
    image: lscr.io/linuxserver/bookstack:latest
    ports:
      - "6875:80"
    volumes:
      - ./bookstack/config:/config
    environment:
      - APP_URL=https://wiki.example.com
    restart: unless-stopped</pre>

<p>Four commands cover almost everything:</p>

<div class="fields"><dl>
<dt>docker compose up -d</dt><dd>Start everything, in the background</dd>
<dt>docker compose ps</dt><dd>What is running, and on which ports</dd>
<dt>docker compose logs -f name</dt><dd>Follow one service's output. This is where the answer usually is</dd>
<dt>docker compose down</dt><dd>Stop and remove the containers. Volumes survive</dd>
</dl></div>

<div class="warning"><strong>This is the detail people get wrong.</strong> A
container can be running while the application inside it is wedged.
<code>docker compose ps</code> showing <code>Up</code> means the process
started, not that the app is healthy. If a page will not load, go straight to
<code>logs -f</code> rather than restarting and hoping.</div>
""",

"volumes": """
<p>A container's own filesystem is disposable. Anything you want to survive an
update has to live in a volume. Get this wrong and you will lose your
documents the first time you pull a new image.</p>

<p>There are two kinds, and the difference matters more than most guides
admit.</p>

<div class="tbl">
<table>
<thead><tr><th>Kind</th><th>Looks like</th><th>Lives</th></tr></thead>
<tbody>
<tr><td>Bind mount</td><td><code>./paperless/data:/usr/src/paperless/data</code></td><td>In a folder next to your compose file, where you can see it</td></tr>
<tr><td>Named volume</td><td><code>pgdata:/var/lib/postgresql/data</code></td><td>Somewhere under Docker's own directory, managed for you</td></tr>
</tbody>
</table>
</div>

<p>This site uses bind mounts for anything you might want to open, copy or
back up by hand, which is most application data. It uses named volumes for
database storage, because databases care about filesystem behaviour and
letting Docker manage that avoids a class of permission problem.</p>

<p>Permissions are the other half. Many images run as a non-root user and let
you choose which one with <code>PUID</code> and <code>PGID</code>. Set them to
your own user, which you can find with <code>id -u</code> and
<code>id -g</code>. If an app starts and then immediately reports that it
cannot write to its data directory, this is almost always why.</p>

<div class="tip"><strong>Back up the folder, not the container.</strong> If
your compose file and your bind-mount folders are backed up, you can rebuild
the whole stack on a new machine. Databases want a proper dump rather than a
file copy while running, which the <a href="hardware.html#backups">Hardware
page</a> covers.</div>
""",

"networks": """
<p>Containers in the same compose project can reach each other by service
name. That is why a Paperless service can point at
<code>redis://broker:6379</code> without knowing any IP address. The name
comes from the key in the compose file, not the image and not the container
name.</p>

<p>Two consequences worth internalising:</p>

<ul>
<li><strong>Internal traffic uses the container port.</strong> If a service
publishes <code>"8000:8000"</code>, other containers still talk to it on
8000, not on whatever host port you chose. A published port is for you, not
for them.</li>
<li><strong>A service does not need a published port at all.</strong>
Databases in particular should not have one. If only the application talks to
Postgres, leave <code>ports:</code> off the database entirely and it becomes
unreachable from your network.</li>
</ul>

<p>Host ports are a finite resource and clashes are the most common first-run
failure. Two services both wanting 3000 will not start, and the error names
the port rather than the app, which is why it confuses people. Forgejo, Gogs
and CryptPad all default to 3000. The <a href="generator.html">Generator</a>
assigns unique host ports for exactly this reason.</p>
""",

"proxy": """
<p>A reverse proxy sits in front of your containers and routes by hostname, so
<code>wiki.example.com</code> and <code>files.example.com</code> both arrive
on port 443 and get sent to different services. It also handles TLS
certificates.</p>

<p>You want one as soon as you have more than about three services, for three
reasons: you stop memorising port numbers, you get HTTPS, and several of the
applications here simply do not work correctly without it. CryptPad needs
it. Jitsi needs it. Anything with WebSockets needs it configured to pass
those through.</p>

<div class="tbl">
<table>
<thead><tr><th>Proxy</th><th>Config style</th><th>Suits</th></tr></thead>
<tbody>
<tr><td>Caddy</td><td>A few lines per site, certificates automatic</td><td>Most people, most of the time</td></tr>
<tr><td>Traefik</td><td>Labels on each container, discovered automatically</td><td>Stacks that change often</td></tr>
<tr><td>Nginx Proxy Manager</td><td>Web UI</td><td>People who would rather click than edit files</td></tr>
</tbody>
</table>
</div>

<p>Start with Caddy unless you have a reason not to. A working site block is
two lines, and it gets certificates without you configuring anything.</p>

<div class="warning"><strong>Putting a proxy in front of something does not
make it safe to publish.</strong> A proxy gives you TLS and tidy hostnames. It
does not add authentication, and it does not fix an app that has none.
<a href="access.html#never">Access</a> lists what should stay off the
internet regardless of how well your proxy is configured.</div>
""",

"updates": """
<p>Updating is pulling a newer image and recreating the container. The data in
your volumes stays put.</p>

<pre>docker compose pull
docker compose up -d</pre>

<p>The risk is not the command, it is the tag. <code>latest</code> means
whatever the maintainer pushed most recently, including the next major
version with a changed database schema. That is how people wake up to a
migrated database and an app that will not start.</p>

<div class="warning"><strong>Pin the major version on anything holding your
data.</strong> Wiki.js is the clearest example in this list. Its version 3
documentation states plainly that it is an unstable beta and should not be
installed in production, so the tag to run is
<code>ghcr.io/requarks/wiki:2</code>. Pulling <code>latest</code> there
changes the schema underneath a running instance.</div>

<p>Two more upgrade traps specific to modules on this site:</p>

<ul>
<li><strong>Dashy 4.0.0</strong> removed the <code>build-and-start</code>
entrypoint. Compose files that override the command crash on start until
changed to <code>node server.js</code>.</li>
<li><strong>Huly 0.6 to 0.7</strong> is not an in-place upgrade. The project
publishes dedicated migration steps and you have to follow them.</li>
</ul>

<p>Before any update on a stack that matters, take a backup and read the
release notes for the app you are updating. Watchtower and similar tools that
update automatically are a bad fit for this kind of stack, because an
unattended major version bump is exactly the failure you cannot recover from
quickly.</p>
""",
}

# --------------------------------------------------------------------------
CONTENT["platforms.html"] = {

"nas": """
<p class="lead">If you already own a NAS with a Docker or Container Manager
app, use it. The disks are the expensive part and you have already bought
them.</p>

<p>Synology, QNAP, UGREEN, TerraMaster and Asustor all run containers, with
varying amounts of friction. The web UI they give you for it is usually worse
than the command line. If you can enable SSH, do, and use compose files
rather than the graphical container editor. You get something you can back up
and re-create.</p>

<p>What to check before you plan a stack:</p>

<ul>
<li><strong>RAM, and whether it is upgradeable.</strong> Many two-bay units
ship with 2GB soldered. That is enough for a wiki and a dashboard. It is not
enough for Paperless with OCR running.</li>
<li><strong>CPU architecture.</strong> Some cheaper units are ARM, and a few
images here are amd64 only.</li>
<li><strong>Whether the vendor has taken ports 80 and 443.</strong> On
Synology in particular the built-in web station may hold them, which
complicates running your own reverse proxy.</li>
</ul>

<div class="tip"><strong>The consume folder is the thing to plan for.</strong>
If you run Paperless-ngx, put its consume directory on a network share the
scanner can already write to. That one decision is the difference between
scanning being a habit and scanning being a chore.</div>
""",

"minipc": """
<p>A second-hand mini PC is the best value in this whole comparison, and it is
what this site recommends if you are buying something.</p>

<p>An ex-office machine with a recent Intel chip, 16GB of RAM and an NVMe
drive covers everything on this site including the heavy modules, runs
silently, and draws maybe ten watts idle. Refurbished units of this kind
routinely sell for less than three months of a comparably specified VPS.</p>

<p>The tradeoffs are honest ones. It lives in your house, so your upload speed
is your upload speed, and a power cut is an outage. It has one disk unless you
add more, so backups are your responsibility rather than a RAID array's.</p>

<div class="card teal">
<p><strong>What to look for.</strong> 16GB RAM, an NVMe slot, and a spare SATA
bay or a USB enclosure for backups. Anything from the last five or six years
is fine. Do not pay for a current-generation machine to run web applications
that spend most of their time idle.</p>
</div>
""",

"vps": """
<p>A VPS gives you a static IP, real upload bandwidth, and someone else's
power supply. It costs monthly, forever, and storage is where it hurts.</p>

<p>The pattern that catches people is buying a cheap plan for the RAM, then
discovering that a document archive fills the 40GB of included disk within a
year, and that block storage is billed per gigabyte per month on top. A
scanned-document archive with OCR grows faster than people expect, because
Paperless keeps both the original and a processed version.</p>

<p>A VPS is the right answer when you need the stack reachable from anywhere
with no fuss, when you are sharing it with people outside your house, or when
your home connection genuinely cannot serve it. For a personal archive on a
home network, it is money spent on a problem you do not have.</p>

<div class="tip"><strong>The middle option.</strong> Run the stack at home and
put only the reverse proxy on a cheap VPS, connected over a VPN. You get a
public address without renting storage. <a href="access.html#tunnel">Access</a>
covers how, along with the tunnel services that do the same job without a
server.</div>
""",

"pi": """
<p>A Raspberry Pi 5 with 8GB runs a useful subset of this list. A Pi 4 with
4GB runs a smaller one. Neither is a good home for a document archive.</p>

<p>Two constraints do the damage. OCR is CPU-bound, and a Pi will take
several times longer per page than a mini PC, which turns a bulk import into
an overnight job. And SD cards fail under sustained database writes. If you
run anything with Postgres on a Pi, boot from an SSD over USB.</p>

<p>What works well on a Pi: BookStack, Gogs, PairDrop, PsiTransfer, Dashy,
Homarr, Kiwix. What does not: Paperless-ngx with a large backlog, Docspell,
AppFlowy, Huly, Jitsi Meet.</p>

<div class="warning"><strong>Check the architecture before you commit.</strong>
A Pi is arm64. Most images here publish arm64 builds, but not all do, and an
image that does not will fail at start with an exec format error rather than
anything more helpful.</div>
""",

"compare": """
<div class="tbl">
<table>
<thead><tr><th>Platform</th><th>Up-front</th><th>Ongoing</th><th>Best for</th><th>Weak spot</th></tr></thead>
<tbody>
<tr><td>Existing NAS</td><td>Nothing</td><td>Power</td><td>Anyone who already owns one</td><td>Soldered RAM, vendor holds ports 80 and 443</td></tr>
<tr><td>Mini PC</td><td>Low, second-hand</td><td>Power</td><td>Best value overall</td><td>Your upload speed, single disk</td></tr>
<tr><td>VPS</td><td>Nothing</td><td>Monthly, storage billed extra</td><td>Sharing with people elsewhere</td><td>Storage cost grows with the archive</td></tr>
<tr><td>Raspberry Pi</td><td>Low</td><td>Very little power</td><td>Small stacks, low draw</td><td>OCR speed, SD card wear</td></tr>
</tbody>
</table>
</div>

<p>If you are undecided and already own a machine that stays on, use it. Buy
something only once you know which modules you actually keep using.
<a href="hardware.html">Hardware</a> has the per-module figures to size
against.</p>
""",
}

# --------------------------------------------------------------------------
CONTENT["access.html"] = {

"options": """
<p class="lead">There are three ways to reach your stack from outside, and
they are not equally safe. Pick by who needs access, not by which is easiest
to set up.</p>

<div class="tbl">
<table>
<thead><tr><th>Approach</th><th>Who can reach it</th><th>Needs</th></tr></thead>
<tbody>
<tr><td>VPN</td><td>Only devices you enrol</td><td>A port forward, or a mesh service</td></tr>
<tr><td>Tunnel</td><td>Anyone with the URL, plus whatever auth you add</td><td>An account with the tunnel provider</td></tr>
<tr><td>Reverse proxy on a public IP</td><td>Anyone on the internet</td><td>A domain, a port forward, and real care</td></tr>
</tbody>
</table>
</div>

<p>The honest default for a personal workspace server is a VPN. Nothing is
exposed, there is no login page for anyone to attack, and every app behaves
as though you were at home. Publish only the specific things other people
genuinely need to open.</p>
""",

"proxy": """
<p>The proxy's job is TLS and hostname routing. Give each service a subdomain
and let the proxy hold the certificate.</p>

<p>A Caddy site block is two lines:</p>

<pre>wiki.example.com {
    reverse_proxy bookstack:80
}</pre>

<p>Three things go wrong often enough to name:</p>

<ul>
<li><strong>The app needs to know its own URL.</strong> BookStack has
<code>APP_URL</code>, Paperless-ngx has <code>PAPERLESS_URL</code>, Homarr
infers it from forwarded headers. Set it, or you get redirects back to
localhost and broken links in emails.</li>
<li><strong>WebSockets.</strong> CryptPad, Wiki.js, AppFlowy and Jitsi all
need them passed through. Caddy and Traefik do this by default; Nginx needs
the upgrade headers set explicitly.</li>
<li><strong>Certificate validation.</strong> The Selkies-based containers
serve their own self-signed certificate on port 3001, so a proxy that
validates upstream certificates will refuse them. Their HTTP port exists for
exactly this case.</li>
</ul>
""",

"vpn": """
<p>Two shapes, and the difference is whether you open a port.</p>

<p><strong>WireGuard on your own server</strong> means one UDP port forwarded
and a config file per device. It is fast, it is small, and it depends on
nobody. It needs a port forward, which means it needs a router you control
and an address that does not change, or dynamic DNS.</p>

<p><strong>A mesh VPN</strong> such as Tailscale or Netbird does the same job
without a port forward, by having both ends connect out to a coordination
service. Easier, works behind carrier-grade NAT, and the tradeoff is that a
third party brokers your connections. Both have self-hostable coordination
servers if that matters to you.</p>

<div class="tip"><strong>This is the cheap answer.</strong> A VPN costs
nothing, needs no domain, and removes the entire question of which apps are
safe to expose. If you are the only person using the stack, stop here.</div>
""",

"tunnel": """
<p>A tunnel service gives you a public hostname without a port forward or a
static IP. An agent on your machine connects out, and traffic comes back down
that connection. Cloudflare Tunnel is the common choice; there are others.</p>

<p>Two things to weigh. The provider terminates TLS, so they can see your
traffic. And providers have terms about what may be served through a free
tunnel, particularly around large media files. Read the current terms rather
than a blog post about them, because the wording has changed more than once
and old summaries circulate long after they stop being true.</p>

<p>For a workspace server, tunnels fit well: the traffic is documents and
web pages, not bulk media. If you want a public URL for one shared thing, a
tunnel in front of that one service is a reasonable answer.</p>
""",

"auth": """
<p>Proxying is not authenticating. If a service has no login, putting it on a
subdomain with a valid certificate just means the world can reach it over
HTTPS.</p>

<p>Three layers, weakest first:</p>

<ol class="steps">
<li><strong>Basic auth at the proxy.</strong> One shared password, no
sessions, no recovery. Fine for a single admin tool on a home network,
nothing more.</li>
<li><strong>A forward-auth gateway.</strong> Authelia or Authentik sit beside
the proxy and require a login before any request reaches the app. This is the
right answer for apps with weak or no built-in authentication.</li>
<li><strong>The app's own accounts, plus SSO.</strong> Best where available.
Forgejo can act as an OAuth2 provider for other services, which is worth
knowing if you are running it anyway. PdfDing, BookStack, Homarr and Dashy
all support OIDC.</li>
</ol>

<div class="warning"><strong>Stirling-PDF's SSO is not in the free
tier.</strong> Single sign-on sits in the paid Server plan. If you need
Stirling behind a login without paying, use a forward-auth gateway rather
than assuming the built-in accounts will do it.</div>
""",

"never": """
<p>Some containers in this list should not be published to the internet, with
or without a proxy in front of them. If the generator writes you a
reverse-proxy config, these are excluded from it, and the config says why.</p>

<div class="tbl">
<table>
<thead><tr><th>Module</th><th>Why</th></tr></thead>
<tbody>
<tr><td>Obsidian (LinuxServer)</td><td>Streamed desktop with a terminal and passwordless sudo. No authentication by default</td></tr>
<tr><td>Calligra (LinuxServer)</td><td>Same base image, same exposure</td></tr>
<tr><td>Anything with the Docker socket</td><td>The socket is root on the host, in practical terms</td></tr>
</tbody>
</table>
</div>

<div class="warning"><strong>Take the Selkies warning literally.</strong>
LinuxServer's own documentation says these containers provide privileged
access to the host system, that the web interface includes a terminal with
passwordless sudo, and that anyone who can reach the GUI can gain root inside
the container. It tells you to treat a session like an SSH login to a machine
on your network, because that is what it is. Reach them over your VPN.</div>

<p>The Docker socket deserves its own note because it appears innocently.
Homarr asks for it to show container status, and dashboards generally do.
Mounting <code>/var/run/docker.sock</code> gives that container control of
the Docker daemon, which is equivalent to root on the host. Mount it read
only when you do mount it, understand that read only limits the damage rather
than removing it, and leave it out entirely if you do not need live container
status.</p>

<p>One more, which is about data rather than exposure. CryptPad needs two
different origins, a main domain and a sandbox domain with restrictive
content-security-policy headers. Its documentation states that running
without the sandbox may put users' information at risk. A single-hostname
CryptPad install is not a working CryptPad install.</p>
""",
}

# --------------------------------------------------------------------------
CONTENT["documentation.html"] = {

"how": """
<p class="lead">One entry per module. Every entry was checked against the
project's own documentation on the date shown, not against a blog post or
another guide.</p>

<p>Each entry lists the image, the ports, the volumes, and what else the
module needs running alongside it. Container ports are given as the container
sees them. Host ports are yours to choose, and the
<a href="generator.html">Generator</a> assigns unique ones so nothing
clashes.</p>

<div class="fields"><dl>
<dt>Image</dt><dd>The registry path the project itself publishes</dd>
<dt>Ports</dt><dd>Container port, and what it serves</dd>
<dt>Volumes</dt><dd>Paths inside the container that must persist</dd>
<dt>Needs</dt><dd>Other services, or a variable you cannot leave blank</dd>
<dt>Checked</dt><dd>When this entry was last verified upstream</dd>
</dl></div>

<div class="tip"><strong>All twenty-four entries are currently
checked.</strong> If one is ever marked <span class="pill after">not
checked</span>, that entry will carry no image name, no ports and no
variables, and the generator will not write compose for it. An unverified
entry states what is unknown rather than guessing at it.</div>
""",

"pdf": """
<details class="app"><summary><b>Stirling-PDF</b> <span class="d">Sixty-odd
PDF operations, with an API</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>docker.stirlingpdf.com/stirlingtools/stirling-pdf</dd>
<dt>Ports</dt><dd>8080, web UI and API</dd>
<dt>Volumes</dt><dd>Optional, for custom config and OCR language data</dd>
<dt>Needs</dt><dd>Nothing. Single container</dd>
<dt>Licence</dt><dd>MIT, open core</dd>
</dl></div>
<p>The only PDF tool here with a proper API, so it is the one that fits into
scripts and automation. Merge, split, OCR, convert, sign, redact, compress.</p>
<div class="warning"><strong>Read the licensing before you build a team
around it.</strong> The project moved to an open-core model. Directories
inside the repo are licensed separately from the MIT core. A maintainer
stated in 2025 that there is currently no user limit and the pricing page
claiming five users was wrong, but also that the plan is eventually to
restrict the account system to five users. Single sign-on sits in the paid
Server tier. If you need Stirling behind a login without paying, put a
forward-auth gateway in front of it.</div>
<p>Contested: one software directory lists the licence as Apache-2.0. The
repository's own LICENSE file says MIT with carve-out directories. Trust the
repository.</p>
</div>
</details>

<details class="app"><summary><b>BentoPDF</b> <span class="d">The same kind of
tools, entirely in your browser</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>ghcr.io/alam00000/bentopdf-simple</dd>
<dt>Ports</dt><dd>8080, static web server</dd>
<dt>Volumes</dt><dd>None. Nothing is stored server-side</dd>
<dt>Needs</dt><dd>Nothing</dd>
<dt>Licence</dt><dd>AGPL-3.0, or a commercial licence</dd>
</dl></div>
<p>Every operation runs in the browser. Files never reach the server, which
is the whole point. That also means it can be served as plain static files
from any web server, and the container is only a convenience.</p>
<p>Use the <em>simple</em> build. Upstream describes it as the full toolset
with the marketing page removed, intended for internal deployments, and
explicitly not a feature-reduced version.</p>
<div class="tip"><strong>What you give up.</strong> No API, no scripting, no
automation, and file size is bounded by the browser's memory rather than the
server's. For a large batch job, use Stirling-PDF.</div>
</div>
</details>

<details class="app"><summary><b>PdfDing</b> <span class="d">A reading library
for PDFs, not a toolkit</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>mrmn/pdfding</dd>
<dt>Ports</dt><dd>8000, web UI</dd>
<dt>Volumes</dt><dd>Media directory for the PDFs, plus the database</dd>
<dt>Needs</dt><dd>SQLite by default, PostgreSQL optional</dd>
<dt>Licence</dt><dd>GPL-3.0</dd>
</dl></div>
<p>Tags, collections, annotations, share links, and it remembers where you
stopped reading on each device. OIDC single sign-on is included rather than
paid for. There is a consume directory for adding files without the UI.</p>
<div class="warning"><strong>The GitHub repository is archived.</strong>
Development moved to Codeberg, at codeberg.org/mrmn/PdfDing. Any guide
pointing you at GitHub is pointing at a repository that has stopped moving.
</div>
</div>
</details>
""",

"archives": """
<details class="app"><summary><b>Paperless-ngx</b> <span class="d">Scan, OCR,
tag, search. The default choice</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>ghcr.io/paperless-ngx/paperless-ngx</dd>
<dt>Ports</dt><dd>8000, web UI and API</dd>
<dt>Volumes</dt><dd>/usr/src/paperless/data, /media, /export and /consume</dd>
<dt>Needs</dt><dd>Redis and PostgreSQL. Gotenberg and Tika if you want office files</dd>
<dt>Required vars</dt><dd>PAPERLESS_SECRET_KEY, PAPERLESS_URL, plus the database and Redis connection</dd>
</dl></div>
<p>Drop a file in the consume directory and it is OCR'd, classified and
indexed. It learns tags and correspondents from your corrections. Everything
the UI does is available over the API.</p>
<div class="tip"><strong>Plan the consume directory first.</strong> Put it on
a share your scanner can already write to. That single decision decides
whether you actually use this.</div>
<p>Four volumes, and they are not interchangeable. <code>media</code> holds
the documents themselves, <code>data</code> holds the search index and
classifier. Back up both. <code>export</code> is where a proper document
export lands, which is the migration path off Paperless if you ever want
one.</p>
</div>
</details>

<details class="app"><summary><b>Docspell</b> <span class="d">Structured
metadata and rules, at the cost of four services</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Images</dt><dd>Separate restserver and joex images, published by the project</dd>
<dt>Ports</dt><dd>7880, web UI and API</dd>
<dt>Volumes</dt><dd>Document storage plus the database and search index</dd>
<dt>Needs</dt><dd>PostgreSQL and Solr, plus a separate joex worker container</dd>
<dt>Licence</dt><dd>GPL-3.0</dd>
</dl></div>
<p>Stronger than Paperless on structured metadata: document types, folders,
permissions, and a rule-driven workflow layer with a documented API.</p>
<div class="warning"><strong>Count the containers.</strong> Docspell is
restserver plus joex plus PostgreSQL plus Solr. That is four services before
you scan anything, and Solr in particular wants memory. On a small box, run
Paperless-ngx instead.</div>
<p>Release cadence is slow but the project is not abandoned. The last tagged
release was v0.43.0 in March 2025, while pull requests were still being
merged in August 2026 and nightly builds continue. Judge it as slow rather
than dead.</p>
</div>
</details>
""",

"knowledge": """
<details class="app"><summary><b>BookStack</b> <span class="d">Structured
wiki: shelves, books, chapters, pages</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>lscr.io/linuxserver/bookstack</dd>
<dt>Ports</dt><dd>80, web UI</dd>
<dt>Volumes</dt><dd>/config</dd>
<dt>Needs</dt><dd>MySQL or MariaDB</dd>
<dt>Required vars</dt><dd>APP_URL, APP_KEY, DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD</dd>
</dl></div>
<p>The recommendation for most people who want a team wiki. The fixed
hierarchy is the feature: non-technical writers put things in the right place
without being told to. Ships on a calendar release schedule with regular
security releases.</p>
<div class="warning"><strong>APP_KEY is not optional and not free-form.</strong>
Generate it with the image itself:
<code>docker run -it --rm --entrypoint /bin/bash lscr.io/linuxserver/bookstack:latest appkey</code>.
It has the form <code>base64:</code> followed by 32 base64-encoded bytes. A
random string in that field will not work.</div>
<p>The default login is admin@admin.com with the password
<code>password</code>. Change it before anything else. If you are running
behind a reverse proxy, APP_URL must be the external URL or links and
redirects break.</p>
</div>
</details>

<details class="app"><summary><b>Wiki.js</b> <span class="d">Free-form page
tree, Git-backed storage</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>ghcr.io/requarks/wiki:2</dd>
<dt>Ports</dt><dd>3000, web UI</dd>
<dt>Volumes</dt><dd>None required. Content lives in the database</dd>
<dt>Needs</dt><dd>PostgreSQL, recommended over the other supported engines</dd>
<dt>Required vars</dt><dd>DB_TYPE, DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME</dd>
</dl></div>
<p>More flexible than BookStack: several editor types over one page tree,
optional Git synchronisation of content, and richer search backends.</p>
<div class="warning"><strong>Pin the major tag.</strong> The project's own
documentation recommends against <code>latest</code> and tells you to use the
major version you need. Version 3 has been in alpha since October 2022 with
no announced release date, and its documentation says plainly that it is an
unstable beta which should not be installed in production. Run
<code>ghcr.io/requarks/wiki:2</code>.</div>
<p>Version 2.5.314 shipped in May 2026 and security fixes continue, but new
feature work is going into version 3. If a predictable release schedule
matters to you, that is the argument for BookStack.</p>
</div>
</details>

<details class="app"><summary><b>Obsidian</b> <span class="d">The desktop app,
streamed to a browser</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>lscr.io/linuxserver/obsidian</dd>
<dt>Ports</dt><dd>3001 HTTPS, self-signed. 3000 HTTP, for use behind a proxy only</dd>
<dt>Volumes</dt><dd>/config, and a mount for your vault</dd>
<dt>Needs</dt><dd>Nothing, but see the warning</dd>
</dl></div>
<p>This is not a web application. It is the real Obsidian desktop app running
in a container and streamed to your browser through Selkies, which replaced
KasmVNC in these images. Plugins work because it is the actual app.</p>
<div class="warning"><strong>Never publish this.</strong> LinuxServer's own
documentation states that the container provides privileged access to the
host system, that the web interface includes a terminal with passwordless
sudo, and that anyone who can reach the GUI can gain root inside the
container. It tells you to treat a session like an SSH login to a machine on
your network. There is no authentication by default. Setting CUSTOM_USER and
PASSWORD gives you HTTP basic auth, which upstream describes as adequate for
a trusted LAN and nothing more. Reach it over your
<a href="access.html#vpn">VPN</a>.</div>
<p>HTTPS is required for the video and audio features to work at all, because
the browser APIs involved only run in a secure context. That is why port 3001
serves its own certificate. A reverse proxy that validates upstream
certificates will reject it, which is what port 3000 exists for.</p>
</div>
</details>

<details class="app"><summary><b>Kiwix</b> <span class="d">Wikipedia and other
whole sites, offline</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>ghcr.io/kiwix/kiwix-serve</dd>
<dt>Ports</dt><dd>8080, web UI</dd>
<dt>Volumes</dt><dd>/data, holding your ZIM files</dd>
<dt>Needs</dt><dd>Nothing. The ZIM files are the whole dependency</dd>
<dt>Command</dt><dd>The ZIM files to serve, or the glob <code>'*.zim'</code></dd>
</dl></div>
<p>Serves ZIM archives with full-text search. A full English Wikipedia with
images is tens of gigabytes; the no-pictures build is far smaller. Stack
Exchange sites, Project Gutenberg and WikiHow are also available.</p>
<p>The command argument is not optional if you are serving local files.
Without it the container has nothing to serve. Quote the glob in compose, or
YAML will not pass it through as you expect.</p>
<div class="tip"><strong>Image name to watch.</strong> Some directories list
this as <code>ghcr.io/kiwix/kiwix-tools</code>, which is the bundle of
command-line tools rather than the server image. Upstream's own Docker readme
uses <code>ghcr.io/kiwix/kiwix-serve</code>.</div>
</div>
</details>
""",

"forges": """
<details class="app"><summary><b>Forgejo</b> <span class="d">Full forge with
CI, registry and issues</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>codeberg.org/forgejo/forgejo:16</dd>
<dt>Ports</dt><dd>3000 web UI, 22 SSH</dd>
<dt>Volumes</dt><dd>/data</dd>
<dt>Needs</dt><dd>SQLite by default. PostgreSQL or MySQL for anything real</dd>
<dt>Required vars</dt><dd>USER_UID and USER_GID, matching the owner of your data directory</dd>
</dl></div>
<p>The recommendation of the two forges here. Forgejo Actions gives you CI
compatible with GitHub Actions workflows, there is a package registry, and it
can act as an OAuth2 provider for other services in your stack, which is
worth knowing if you want single sign-on without running a separate identity
server.</p>
<p>Governance is community-led under Codeberg e.V. Federation over ActivityPub
exists but is experimental and off by default.</p>
<div class="tip"><strong>If Codeberg is unreachable</strong>, upstream
publishes a mirror: replace codeberg.org with data.forgejo.org in the image
name.</div>
<p>Map SSH to a spare host port such as 222 rather than 22, unless you have
moved your host's own SSH daemon. Both cannot have port 22.</p>
</div>
</details>

<details class="app"><summary><b>Gogs</b> <span class="d">The smallest thing
that is still a forge</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>gogs/gogs</dd>
<dt>Ports</dt><dd>3000 web UI, 22 SSH</dd>
<dt>Volumes</dt><dd>/data</dd>
<dt>Needs</dt><dd>SQLite by default, PostgreSQL or MySQL optional</dd>
<dt>Required vars</dt><dd>None. Configuration happens in a web installer on first run</dd>
</dl></div>
<p>Repositories, issues, pull requests, a wiki, webhooks, SSH and HTTP. That
is the whole scope, and it has stayed that way deliberately. It will run on
hardware where Forgejo would be uncomfortable.</p>
<p>What it does not have: built-in CI, a package registry, project boards, or
an OAuth2 provider. If you want any of those, you want Forgejo.</p>
<div class="warning"><strong>The SSH port is set during the web
installer.</strong> Whatever host port you published for 22 has to be entered
there, or clone URLs will be generated with the wrong port and SSH pushes
will fail with a confusing error.</div>
</div>
</details>
""",

"filetransfer": """
<details class="app"><summary><b>PairDrop</b> <span class="d">AirDrop for
everything, over your own network</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>lscr.io/linuxserver/pairdrop</dd>
<dt>Ports</dt><dd>3000, web UI and signalling</dd>
<dt>Volumes</dt><dd>None, unless you supply a custom STUN and TURN config</dd>
<dt>Needs</dt><dd>Nothing. A coturn server if you want it working across networks</dd>
<dt>Optional vars</dt><dd>WS_FALLBACK, RATE_LIMIT, RTC_CONFIG, DEBUG_MODE</dd>
</dl></div>
<p>Open the page on two devices on the same network and they find each other.
Files go directly between browsers over WebRTC; the server only introduces
them. Nothing is stored, so there is nothing to clean up.</p>
<div class="warning"><strong>If you reach this over a VPN, read
this.</strong> Most VPN services block WebRTC entirely in order to hide your
real address, so peer discovery fails. Setting WS_FALLBACK to true fixes it,
but upstream is clear about the cost: fallback traffic is routed through the
server, is readable by the server, and uses the server's bandwidth. It is no
longer peer to peer.</div>
<p>Leave DEBUG_MODE off. Upstream says not to use it in production, because
it logs client IP addresses to standard output.</p>
<p>One naming trap. A site at pairdrop.org advertises a self-contained PHP
script with no database. That is different software with the same name. The
project this image wraps is the Node and WebRTC one, forked from Snapdrop.</p>
</div>
</details>

<details class="app"><summary><b>PsiTransfer</b> <span class="d">Send someone
a link. No accounts</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>psitrax/psitransfer, also ghcr.io/psi-4ward/psitransfer</dd>
<dt>Ports</dt><dd>3000, web UI</dd>
<dt>Volumes</dt><dd>/data</dd>
<dt>Needs</dt><dd>Nothing</dd>
<dt>Optional vars</dt><dd>PSITRANSFER_ADMIN_PASS, PSITRANSFER_UPLOAD_PASS, PSITRANSFER_UPLOAD_DIR</dd>
</dl></div>
<p>The closest thing here to WeTransfer. Upload a bucket of files, set an
expiry, get a link. Resumable uploads and downloads, one-time downloads,
password-protected download lists, and everything can be pulled as a zip.</p>
<div class="warning"><strong>Chown the data directory before first
start.</strong> Upstream is explicit: the data volume needs UID 1000. Run
<code>chown -R 1000 ./data</code> or the container fails with permission
errors that do not name the cause.</div>
<p>Two different passwords, easy to confuse.
<code>PSITRANSFER_ADMIN_PASS</code> enables the <code>/admin</code> page,
which is disabled entirely until you set it.
<code>PSITRANSFER_UPLOAD_PASS</code> is what stops strangers uploading if the
instance is reachable from outside.</p>
</div>
</details>

<details class="app"><summary><b>Zipline</b> <span class="d">Screenshot and
upload server, ShareX compatible</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>ghcr.io/diced/zipline</dd>
<dt>Ports</dt><dd>3000, web UI and API</dd>
<dt>Volumes</dt><dd>/zipline/uploads, /zipline/public, /zipline/themes</dd>
<dt>Needs</dt><dd>PostgreSQL</dd>
<dt>Required vars</dt><dd>DATABASE_URL and CORE_SECRET. Everything else has a default</dd>
</dl></div>
<p>Built for ShareX, Flameshot and similar tools. Dashboard, API, URL
shortener, paste bin, and embed metadata for links pasted into chat apps.</p>
<div class="warning"><strong>CORE_SECRET must be longer than 32
characters.</strong> Upstream rejects anything shorter. If you are generating
it with a password manager, quote it in the compose file so special
characters survive.</div>
<p>Version 4 was a complete rewrite and there is no in-place upgrade from
version 3. Data moves across using a built-in importer. Several variables
were renamed at the same time: CORE_DATABASE_URL became DATABASE_URL, and
CORE_HOST became CORE_HOSTNAME. Old compose files fail in confusing ways
because of this.</p>
</div>
</details>

<details class="app"><summary><b>Chibisafe</b> <span class="d">A gallery you
upload to, with albums and tags</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>chibisafe/chibisafe, plus chibisafe/chibisafe-server in the split layout</dd>
<dt>Ports</dt><dd>8000 in the single-container layout, 24424 through Caddy in the split layout</dd>
<dt>Volumes</dt><dd>database, uploads and logs directories</dd>
<dt>Needs</dt><dd>Depends on layout. See below</dd>
<dt>Licence</dt><dd>MIT</dd>
</dl></div>
<p>More file hosting than file transfer. Albums, tagging, thumbnails,
shareable galleries, multi-user with permissions, and ShareX support.</p>
<div class="warning"><strong>Upstream documents two different layouts and
they disagree.</strong> The repository's compose example runs three services,
a frontend, a server, and a Caddy instance that merges them onto port 24424,
and requires you to create a Caddyfile by hand. The Docker Hub readme shows a
single container publishing 24424 to container port 8000. The volume paths
differ too: <code>/app/database</code> and friends in one,
<code>/home/node/chibisafe/database</code> in the other. Pick one source and
follow it all the way through rather than mixing them.</div>
<p>Some third-party comparisons state that Chibisafe requires PostgreSQL.
Upstream's own compose files use a local database directory instead. Where a
guide and the project disagree, the project wins.</p>
<p>Create the database, uploads and logs directories before first start.
Letting Docker create them produces permission errors.</p>
</div>
</details>
""",

"workspaces": """
<details class="app"><summary><b>CryptPad</b> <span class="d">Encrypted
collaborative documents</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>cryptpad/cryptpad</dd>
<dt>Ports</dt><dd>3000 and 3003</dd>
<dt>Volumes</dt><dd>blob, block, customize, data and datastore, under /cryptpad</dd>
<dt>Needs</dt><dd>A reverse proxy, and two distinct domains</dd>
<dt>Required vars</dt><dd>CPAD_MAIN_DOMAIN and CPAD_SANDBOX_DOMAIN</dd>
</dl></div>
<p>Documents, spreadsheets, kanban and more, encrypted in the browser so the
server cannot read them. That property is also its main constraint: the
server cannot help you if you lose a key.</p>
<div class="warning"><strong>Two domains, not one.</strong> CryptPad needs a
main origin and a separate sandbox origin with restrictive
content-security-policy headers applied. Its documentation states that using
CryptPad in production without the sandboxing system may put users'
information at risk. The two values must be genuinely different origins. A
single-hostname install is not a working install.</div>
<p>The optional OnlyOffice integration is enabled by an environment variable
that the shipped compose file leaves commented out, with a note telling you
to read and accept its licence first. That comment is there deliberately.</p>
</div>
</details>

<details class="app"><summary><b>Calligra</b> <span class="d">An office suite,
streamed to a browser</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>lscr.io/linuxserver/calligra</dd>
<dt>Ports</dt><dd>3001 HTTPS, self-signed. 3000 HTTP, behind a proxy only</dd>
<dt>Volumes</dt><dd>/config, and a mount for your documents</dd>
<dt>Needs</dt><dd>Nothing, but see the warning</dd>
</dl></div>
<p>The same Selkies base image as Obsidian, running KDE's office suite. Words,
Sheets, Stage and the rest, in a browser tab. Useful when you need to open a
document format nothing else handles and you do not want to install anything
locally.</p>
<div class="warning"><strong>Same exposure as Obsidian, for the same
reason.</strong> Privileged access to the host, a terminal with passwordless
sudo in the web interface, and no authentication by default. Do not publish
it. It is on the never-expose list on the
<a href="access.html#never">Access page</a>.</div>
<p>HTTPS is required for full functionality, because the browser features it
depends on do not work over plain HTTP.</p>
</div>
</details>

<details class="app"><summary><b>AppFlowy</b> <span class="d">A Notion-shaped
workspace with its own cloud backend</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Deploy</dt><dd>From the AppFlowy-Cloud repository, not a single service</dd>
<dt>Ports</dt><dd>80 and 443, through its own bundled nginx</dd>
<dt>Needs</dt><dd>PostgreSQL, Redis, MinIO and GoTrue, all part of its stack</dd>
<dt>Hardware</dt><dd>4GB RAM minimum, 8GB recommended, and a real domain</dd>
</dl></div>
<p>Documents, databases, kanban boards and calendars, with polished desktop
and mobile clients that you point at your own server. AppFlowy Cloud is the
server component; the apps are where you actually work.</p>
<div class="warning"><strong>This is not a module you can drop into a
compose file.</strong> It is a multi-service stack deployed from its own
repository with its own deployment configuration. The
<a href="generator.html">Generator</a> treats it as an upstream install:
it will write you proxy configuration and notes, not an invented compose
service.</div>
<p>A domain name is required rather than recommended, because the clients
connect to a base URL and a websocket URL that have to resolve.</p>
</div>
</details>

<details class="app"><summary><b>Huly</b> <span class="d">Projects, issues,
documents, calls, in one platform</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Deploy</dt><dd>From the huly-selfhost repository, with its own setup script and nginx config</dd>
<dt>Ports</dt><dd>8087 in the local quick-start</dd>
<dt>Needs</dt><dd>Many services: account, front, transactor, database, queues and more</dd>
<dt>Hardware</dt><dd>Minimum 2 vCPUs and 8GB RAM. Recommended 4 vCPUs and 16GB</dd>
</dl></div>
<p>The largest thing on this site by some distance. Project management,
issue tracking, documents, HR, and optional video calls through LiveKit.</p>
<div class="warning"><strong>Take the RAM figure literally.</strong>
Upstream warns that servers below the minimum may stop responding or fail.
Eight gigabytes is the floor, not a comfortable target. On a NAS with
soldered 4GB, this is not going to work.</div>
<p>Upgrades need attention. Moving from any 0.6.x version to 0.7.x requires
the dedicated migration steps in the project's migration guide rather than a
direct in-place upgrade. The quick-start compose is described by upstream as
intended for local testing only.</p>
</div>
</details>

<details class="app"><summary><b>Wekan</b> <span class="d">Kanban boards,
with Trello import and export</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>ghcr.io/wekan/wekan, also quay.io/wekan/wekan</dd>
<dt>Ports</dt><dd>8080, web UI</dd>
<dt>Volumes</dt><dd>/data, set by WRITABLE_PATH</dd>
<dt>Needs</dt><dd>MongoDB</dd>
<dt>Required vars</dt><dd>MONGO_URL, ROOT_URL, WRITABLE_PATH</dd>
</dl></div>
<p>Boards, swimlanes, checklists, due dates and attachments, close enough to
Trello that the import works. Boards export as JSON with attachments
included, which is a real exit route rather than a claimed one. WITH_API
turns on the REST API, off by default.</p>
<div class="warning"><strong>ROOT_URL is not cosmetic.</strong> It is the
address Wekan believes it lives at. Get it wrong and logins and invite links
break in ways that look like authentication bugs. Set it to the external URL
you actually use, including the scheme.</div>
<p>Contested: the required MongoDB version. Community guides variously insist
on 4.4.x, while others run MongoDB 6 or 7 without trouble, and upstream
examples span everything from 3.2 to 4.4 depending on their age. Check the
project wiki for the version matching the Wekan release you are pulling
rather than copying a version number out of a blog post.</p>
</div>
</details>
""",

"meeting": """
<details class="app"><summary><b>Jitsi Meet</b> <span class="d">Video calls,
four containers</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Images</dt><dd>jitsi/web, jitsi/prosody, jitsi/jicofo, jitsi/jvb</dd>
<dt>Ports</dt><dd>8443 HTTPS and 8000 HTTP by default, plus 10000/udp and 4443/tcp for media</dd>
<dt>Volumes</dt><dd>A config tree you create by hand before first start</dd>
<dt>Needs</dt><dd>A real domain, and UDP reaching the videobridge</dd>
<dt>Required vars</dt><dd>PUBLIC_URL, plus the passwords generated by the project's script</dd>
</dl></div>
<p>Four services: the web UI, an XMPP server, a conference focus component,
and the videobridge that actually moves the media. Optional add-ons for SIP
and recording are separate compose files layered on top.</p>
<div class="warning"><strong>Do not clone the repository.</strong> Upstream
says explicitly to download and extract the latest release instead. Then copy
env.example to .env and run the project's own gen-passwords.sh, which
generates every required secret with openssl and rewrites .env in place. Do
not invent these passwords yourself; the components have to agree on
them.</div>
<p>You also have to create the config directories before the first start, or
the containers have nowhere to write. Upstream gives the exact mkdir line,
covering web, transcripts, prosody config and plugins, jicofo, jvb, jigasi
and jibri.</p>
<div class="warning"><strong>Plain HTTP will appear to work and then
fail.</strong> Port 8000 exists for reverse-proxy setups only. Reaching Jitsi
directly over HTTP produces camera and microphone errors, because the browser
APIs it needs are only available in a secure context. Also set PUBLIC_URL to
the real domain for any deployment that is not a local test.</div>
<p>The firewall rules differ from everything else on this site. Media needs
10000/udp open, and 4443/tcp for the case where UDP is blocked at the
client's end. A reverse proxy alone does not carry that traffic.</p>
</div>
</details>

<details class="app"><summary><b>OpenSign</b> <span class="d">Document signing
workflows</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Images</dt><dd>opensign/opensignserver and opensign/opensign, plus MongoDB and Caddy</dd>
<dt>Ports</dt><dd>3000 client, 8080 server, 3001 through the bundled Caddy</dd>
<dt>Volumes</dt><dd>/usr/src/app/files for documents, plus the MongoDB data volume</dd>
<dt>Needs</dt><dd>MongoDB, an SMTP server, and a signing certificate</dd>
<dt>Required vars</dt><dd>PUBLIC_URL, SERVER_URL, MONGODB_URI, MASTER_KEY, PARSE_MOUNT, SMTP settings, PFX_BASE64</dd>
</dl></div>
<p>Send a document, place fields, collect signatures, keep an audit trail.
Deployed from upstream's own compose file and Caddyfile rather than a service
you write yourself, with configuration in a .env.prod file.</p>
<div class="warning"><strong>Configure SMTP before you invite anyone.</strong>
Email is not optional here. Without a working mail adapter, account
verification and password resets fail with an error that does not explain
itself, and a signing request nobody can be notified about is not a signing
workflow.</div>
<p>MASTER_KEY is described by upstream as the key that allows access to all
the data. Treat it as the most sensitive value in your whole stack, keep it
out of version control, and do not reuse it anywhere. PARSE_MOUNT should be
left at /app; upstream says not to change it.</p>
<p>PFX_BASE64 holds the signing certificate. Upstream's example file ships a
sample certificate, which is fine for trying it out and wrong for anything
you would actually rely on.</p>
</div>
</details>
""",

"dashboards": """
<details class="app"><summary><b>Homarr</b> <span class="d">Drag and drop
dashboard with live integrations</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>ghcr.io/homarr-labs/homarr</dd>
<dt>Ports</dt><dd>7575, web UI</dd>
<dt>Volumes</dt><dd>/appdata. Optionally the Docker socket</dd>
<dt>Needs</dt><dd>Nothing. It bundles its own database</dd>
<dt>Required vars</dt><dd>SECRET_ENCRYPTION_KEY, a 64-character hex string</dd>
</dl></div>
<p>You build the board in the browser rather than in a file. Tiles pull live
data from services you point them at, and it ships its own user accounts and
login, so it does not need an auth layer bolted on.</p>
<div class="warning"><strong>Keep the encryption key.</strong> It encrypts
every stored integration credential. Generate it with
<code>openssl rand -hex 32</code>, store it outside version control, and do
not rotate it casually: change it and every saved credential becomes
undecryptable, so you re-enter all of them.</div>
<p>The Docker socket mount is what gives you container status, and it is
optional. Mount it read only if you mount it at all, and understand that read
only limits the damage rather than removing it. The socket is root on the
host in practical terms.</p>
<p>The version 1 rewrite changed the architecture and required manual
reconfiguration for people upgrading from earlier versions.</p>
</div>
</details>

<details class="app"><summary><b>Dashy</b> <span class="d">Dashboard as a
config file, with a UI editor</span> <span class="pill first">checked 8 Sep 2026</span></summary>
<div class="abody">
<div class="fields"><dl>
<dt>Image</dt><dd>lissy93/dashy, also ghcr.io/lissy93/dashy</dd>
<dt>Ports</dt><dd>8080, web UI</dd>
<dt>Volumes</dt><dd>/app/user-data, holding conf.yml and any icons or themes</dd>
<dt>Needs</dt><dd>Nothing</dd>
<dt>Licence</dt><dd>MIT</dd>
</dl></div>
<p>Your whole dashboard is one YAML file, which means it lives in Git next to
your compose file and is restored by copying a file. There is a UI editor
too, so you are not forced into a text editor. Status checks per tile, and a
large theme collection.</p>
<div class="warning"><strong>Two breaking changes to know about.</strong>
Version 3 moved the config from <code>/app/public/conf.yml</code> to
<code>/app/user-data/conf.yml</code> and changed the container port from 80
to 8080 so the image could run as non-root. Version 4 removed the
<code>build-and-start</code> entrypoint; compose files that override the
command crash on start until changed to <code>node server.js</code>. Older
guides still show all three of the old values.</div>
<p>Actively released through 2026, on the 4.5.x line as of August.</p>
</div>
</details>
"""
}

# --------------------------------------------------------------------------
CONTENT["setup.html"] = {

"documents": """
<p class="lead">First-run steps, grouped by job. Every app here is running at
this point. This page is about what to do inside it.</p>

<h3>Stirling-PDF</h3>
<ol class="steps">
<li>Open it and confirm the tool list loads. If the page appears but tools
are missing, check the logs rather than reloading.</li>
<li>Decide about accounts. Login is off by default. Turning it on gives you
users and API keys; single sign-on is in the paid tier, so if you need
Stirling behind a login without paying, put a forward-auth gateway in front
instead.</li>
<li>If you want OCR, add the language data. Only English ships by default,
and OCR silently produces poor results rather than failing when the language
pack is missing.</li>
</ol>

<h3>BentoPDF</h3>
<p>Nothing to configure. There are no accounts and no server-side settings,
because there is no server-side processing. Open it and use it.</p>
<div class="tip"><strong>Sanity check it is really local.</strong> Load the
page, disconnect the machine from the network, and run an operation. It
should still work. That is the property you are paying for with the missing
API.</div>

<h3>PdfDing</h3>
<ol class="steps">
<li>Create the first account. It becomes the admin.</li>
<li>Turn off open registration unless you want it. Otherwise anyone who can
reach the page can sign up.</li>
<li>Point the consume directory somewhere useful if you want to add files
without the UI.</li>
<li>Set up OIDC now if you are going to. It is included rather than paid for,
and retrofitting it after people have local accounts is more work.</li>
</ol>
""",

"archive": """
<h3>Paperless-ngx</h3>
<ol class="steps">
<li>Create the superuser. Depending on how you deployed, this is either a
prompt on first run or a one-off command against the container.</li>
<li>Confirm the consume directory works before anything else. Drop one PDF
in and watch the logs. If it is not picked up, nothing later matters.</li>
<li>Set your document language under settings, so OCR is not guessing at
English.</li>
<li>Create three or four tags and two correspondents by hand, then let the
classifier learn from your corrections. It gets better with use and worse
with a hundred tags created up front.</li>
<li>Add Gotenberg and Tika only if you need office documents. They are two
more containers and most people only ever feed it PDFs and scans.</li>
</ol>
<div class="warning"><strong>Check your backups before you bulk
import.</strong> The data volume holds the search index and the trained
classifier; the media volume holds the documents themselves. Losing the first
is annoying, losing the second is losing your archive. Test a restore before
you trust it with the only copy of anything.</div>

<h3>Docspell</h3>
<ol class="steps">
<li>Register the first account, then create a collective. Documents belong to
the collective rather than the user, which is the model that confuses people
coming from Paperless.</li>
<li>Check that joex is actually running. The web UI comes up perfectly well
without it and simply never processes anything, which looks like a stuck
queue rather than a missing service.</li>
<li>Confirm Solr is reachable before you rely on full-text search. Search
fails quietly rather than erroring.</li>
</ol>
""",

"notes": """
<h3>BookStack</h3>
<ol class="steps">
<li>Log in as admin@admin.com with the password <code>password</code>, then
change both immediately. This is the single most common way a self-hosted
BookStack ends up compromised.</li>
<li>Check that APP_URL matches the address you actually use. If links and
redirects send you to the wrong host, this is why.</li>
<li>Set the default visibility for new content before inviting anyone.</li>
<li>Turn off public registration unless you want it.</li>
</ol>

<h3>Wiki.js</h3>
<ol class="steps">
<li>Complete the setup wizard, which creates the admin account and the
initial configuration.</li>
<li>Pick a storage target. Git synchronisation is the reason many people
choose Wiki.js, and setting it up on day one is much easier than migrating
content into it later.</li>
<li>Confirm your image tag is pinned to <code>:2</code> and not
<code>latest</code>, before you have content worth losing.</li>
</ol>

<h3>Obsidian and Calligra</h3>
<div class="warning"><strong>Set a password immediately, and still do not
publish it.</strong> These containers have no authentication by default.
Setting CUSTOM_USER and PASSWORD adds HTTP basic auth, which upstream
describes as suitable for a trusted LAN and nothing more. The web interface
includes a terminal with passwordless sudo. Reach them over your
<a href="access.html#vpn">VPN</a>.</div>
<p>Mount your vault or documents directory explicitly. Anything written
outside a mounted path lives inside the container and disappears on the next
update. Expect a self-signed certificate warning on port 3001; that is
normal and is why the HTTP port exists for proxied setups.</p>

<h3>Kiwix</h3>
<ol class="steps">
<li>Download ZIM files into the mounted data directory. Check sizes on the
Kiwix download site first, because a full Wikipedia with images is a very
different proposition from the no-pictures build.</li>
<li>Restart the container after adding files. The command argument is
evaluated at start, so new files do not appear on their own.</li>
</ol>
""",

"code": """
<h3>Forgejo</h3>
<ol class="steps">
<li>Complete the installer page. This is where the database connection and
the site URL are set, and the site URL is the value that ends up in every
clone command you copy.</li>
<li>Set the SSH port to the host port you published, not 22, unless you moved
your host's own SSH daemon out of the way.</li>
<li>Disable open registration unless you want it. The installer has a
checkbox for it and it is easy to skip past.</li>
<li>Create the first user. The first registered account becomes the
administrator.</li>
<li>If you want Actions, enable the runner separately. Forgejo ships the CI
feature; the runner is its own component.</li>
</ol>
<div class="tip"><strong>Worth doing while you are here.</strong> Forgejo can
act as an OAuth2 provider. If you are running it anyway, it can be the login
for BookStack, PdfDing, Homarr and Dashy, and you avoid standing up a
separate identity server.</div>

<h3>Gogs</h3>
<ol class="steps">
<li>Work through the web installer. Choose SQLite unless you have a reason
not to.</li>
<li>Set the SSH port to your published host port. This is the field people
miss, and the symptom is clone URLs that look right and do not work.</li>
<li>Set the application URL to the address you actually use.</li>
<li>Create the admin account in the installer rather than leaving it to the
first registration.</li>
</ol>
""",

"transfer": """
<h3>PairDrop</h3>
<p>Open it on two devices on the same network. They should see each other
within a second or two. If they do not, the problem is almost always one of
two things: the devices are on different subnets or VLANs, or something is
blocking WebRTC.</p>
<div class="warning"><strong>Over a VPN, set WS_FALLBACK to true.</strong>
Most VPN services block WebRTC entirely to avoid leaking your real address,
so peer discovery fails. The fallback fixes it, and upstream is clear about
the cost: that traffic is routed through your server, readable by it, and
uses its bandwidth. It is no longer peer to peer.</div>
<p>Leave DEBUG_MODE off in normal use. Upstream says not to use it in
production because it logs client IP addresses.</p>

<h3>PsiTransfer</h3>
<ol class="steps">
<li>Before the first start, run <code>chown -R 1000 ./data</code>. Upstream
requires the data volume to be owned by UID 1000, and the failure without it
is a permission error that does not name the cause.</li>
<li>Set PSITRANSFER_ADMIN_PASS if you want the <code>/admin</code> page. It
is disabled entirely until you do.</li>
<li>Set PSITRANSFER_UPLOAD_PASS if the instance is reachable by anyone you do
not know. Otherwise it is an open upload endpoint.</li>
<li>Choose a default retention. The point of this tool is that files leave
again.</li>
</ol>

<h3>Zipline</h3>
<ol class="steps">
<li>Generate CORE_SECRET longer than 32 characters. Shorter values are
rejected outright. Quote it in the compose file so special characters
survive.</li>
<li>Create the first user, which becomes the administrator.</li>
<li>Generate an API token and paste it into ShareX or Flameshot. This is the
only reason most people run Zipline.</li>
<li>Set upload size limits before sharing the instance.</li>
</ol>
<p>Coming from version 3, use the built-in importer. There is no in-place
upgrade, and several variables were renamed, so an old compose file fails in
ways that do not point at the cause.</p>

<h3>Chibisafe</h3>
<ol class="steps">
<li>Create the database, uploads and logs directories by hand before the
first start, or you get permission errors.</li>
<li>Decide which upstream layout you are following, the split three-service
one from the repository or the single container from Docker Hub, and follow
it all the way through. The volume paths differ between them.</li>
<li>Change the admin password immediately.</li>
<li>Turn off public registration unless you want it.</li>
</ol>
""",

"boards": """
<h3>CryptPad</h3>
<ol class="steps">
<li>Set both CPAD_MAIN_DOMAIN and CPAD_SANDBOX_DOMAIN to genuinely different
origins, and point both at the instance through your reverse proxy.</li>
<li>Register the first account, then claim admin rights by adding its public
key to the admin list in the configuration. The first account is not
automatically an administrator.</li>
<li>Decide on registration and quotas before sharing the address.</li>
</ol>
<div class="warning"><strong>A single-domain install is not a working
install.</strong> CryptPad's documentation states that running in production
without the sandbox may put users' information at risk. If you only have one
hostname available, wait until you have two.</div>

<h3>Wekan</h3>
<ol class="steps">
<li>Set ROOT_URL to the external address you actually use, including the
scheme. Wrong values here break logins and invite links in ways that look
like authentication bugs.</li>
<li>Create the first account, which becomes the administrator, then disable
registration.</li>
<li>Import from Trello if you are migrating. Export a board to JSON
afterwards to confirm your exit route works.</li>
</ol>

<h3>AppFlowy and Huly</h3>
<p>Both are deployed from their own repositories with their own scripts, so
their setup is upstream's to document rather than this site's. Two things are
worth knowing before you start.</p>
<ul>
<li><strong>Huly</strong> needs 8GB of RAM as a floor and upstream warns that
smaller servers may fail outright. Check what you have before you spend an
evening on it. Upgrades from 0.6 to 0.7 need dedicated migration steps.</li>
<li><strong>AppFlowy</strong> expects a real domain, because the desktop and
mobile clients connect to a base URL and a websocket URL that both have to
resolve. The web experience is secondary to the apps.</li>
</ul>

<h3>OpenSign</h3>
<ol class="steps">
<li>Configure SMTP in .env.prod <em>before</em> creating accounts. Without a
working mail adapter, verification and password resets fail with an
unhelpful error.</li>
<li>Replace MASTER_KEY with your own value. Upstream describes it as the key
that allows access to all the data.</li>
<li>Replace the sample signing certificate in PFX_BASE64 with a real one
before signing anything you care about.</li>
<li>Leave PARSE_MOUNT at /app. Upstream says not to change it.</li>
</ol>

<h3>Jitsi Meet</h3>
<ol class="steps">
<li>Download and extract the latest release. Upstream says explicitly not to
clone the repository.</li>
<li>Copy env.example to .env, then run the project's gen-passwords.sh. It
writes every required secret for you. Do not invent these; the components
have to agree on them.</li>
<li>Create the config directories before the first start, using the mkdir
line from upstream's guide.</li>
<li>Set PUBLIC_URL to your real domain.</li>
<li>Open 10000/udp, and 4443/tcp for clients whose networks block UDP.</li>
</ol>
<div class="warning"><strong>Do not test it over plain HTTP.</strong> Port
8000 exists for reverse-proxy setups. Direct HTTP access produces camera and
microphone errors, because the browser APIs Jitsi needs only work in a secure
context. It looks like a broken install and is not one.</div>
""",

"dash": """
<h3>Homarr</h3>
<ol class="steps">
<li>Generate SECRET_ENCRYPTION_KEY with <code>openssl rand -hex 32</code> and
store it somewhere you will still have it in a year.</li>
<li>Create the admin account on first load.</li>
<li>Add the Docker integration only if you want container status, and mount
the socket read only if you do.</li>
<li>Build the board, then export a backup. The layout lives in Homarr's
database rather than in a file you already back up.</li>
</ol>
<div class="warning"><strong>Do not rotate the encryption key
casually.</strong> It encrypts every stored integration credential. Change it
and they all become undecryptable, so you re-enter every one.</div>

<h3>Dashy</h3>
<ol class="steps">
<li>Mount a directory at <code>/app/user-data</code> containing
<code>conf.yml</code>. Not a single file at
<code>/app/public/conf.yml</code>, which is where version 2 kept it and where
older guides still point.</li>
<li>Publish against container port 8080, not 80. That changed in version 3
so the image could run as non-root.</li>
<li>Build the dashboard in the UI editor if you prefer, then save the file
and commit it.</li>
<li>Turn on status checks for the tiles you care about.</li>
</ol>
<div class="tip"><strong>Commit conf.yml.</strong> The whole argument for
Dashy over Homarr is that your dashboard is a file. Put it next to your
compose file in version control and restoring it is a copy.</div>
""",
}

# --------------------------------------------------------------------------
CONTENT["hardware.html"] = {

"ram": """
<p class="lead">Two modules on this site publish real minimums, and both are
larger than people expect. Everything else is small enough that the answer is
usually "it fits".</p>

<p>Where a project states a figure, it is quoted here. Where it does not, the
band is an estimate from typical idle use, not an upstream number, and it is
labelled as such.</p>

<div class="tbl">
<table>
<thead><tr><th>Module</th><th>RAM</th><th>Source</th></tr></thead>
<tbody>
<tr><td>Huly</td><td>8GB minimum, 16GB recommended</td><td>Upstream</td></tr>
<tr><td>AppFlowy</td><td>4GB minimum, 8GB recommended</td><td>Upstream</td></tr>
<tr><td>Jitsi Meet</td><td>Grows with participants, not with idle time</td><td>Depends on calls</td></tr>
<tr><td>Docspell with Solr</td><td>Hundreds of MB, mostly Solr</td><td>Estimate</td></tr>
<tr><td>Paperless-ngx during OCR</td><td>Hundreds of MB, spiky</td><td>Estimate</td></tr>
<tr><td>Homarr, Dashy, BookStack, Wiki.js</td><td>Modest, a few hundred MB each</td><td>Estimate</td></tr>
<tr><td>PairDrop, PsiTransfer, Kiwix, BentoPDF</td><td>Small</td><td>Estimate</td></tr>
</tbody>
</table>
</div>

<div class="warning"><strong>Take the Huly figure literally.</strong>
Upstream warns that servers below the minimum may stop responding or fail
outright. Eight gigabytes is the floor for that one service, not for your
whole stack. On a NAS with 4GB soldered in, Huly is not an option and no
amount of tuning changes that.</div>

<p>The practical answer for most people: 8GB runs a comfortable stack without
the two large workspaces. 16GB runs anything on this site. 4GB runs a wiki, a
forge, a dashboard and file transfer, which is a genuinely useful server.</p>
""",

"disk": """
<p>Disk is where a workspace server surprises you, and it is almost always
one of three things.</p>

<div class="fields"><dl>
<dt>Paperless-ngx</dt><dd>Keeps the original and a processed archive version of each document, so budget roughly double what you are scanning</dd>
<dt>Kiwix</dt><dd>ZIM files are the whole cost. A full Wikipedia with images is very large; the no-pictures build is far smaller. Check current sizes on the Kiwix download site before committing</dd>
<dt>Forgejo or Gogs</dt><dd>Repository history, which grows quietly, plus package registry storage if you use it</dd>
</dl></div>

<p>Everything else is small by comparison. Wikis, dashboards and PDF tools
store text, configuration and thumbnails.</p>

<div class="tip"><strong>Put the archive on the big disk, not the fast
one.</strong> If you have an NVMe drive and a spinning disk, databases and
the OS go on the NVMe. Scanned documents and ZIM files go on the spinning
disk. They are read occasionally and written once.</div>

<p>Watch growth rather than guessing at it. A monthly look at
<code>du -sh</code> across your bind-mount directories will tell you which
module is actually growing, which is rarely the one you expected.</p>
""",

"cpu": """
<p>Almost nothing here is CPU-bound. The exceptions are OCR and video.</p>

<p><strong>OCR</strong> is the one that will make a slow machine feel slow.
Paperless-ngx and Docspell both run it on every incoming document, and it
scales with page count. On a mini PC this is unnoticeable. On a Raspberry Pi
it turns a bulk import of several hundred documents into an overnight job. If
you are migrating an existing archive, start it before bed rather than
before a meeting.</p>

<p><strong>Video</strong> in Jitsi is different: the videobridge forwards
streams rather than transcoding them, so CPU load tracks the number of
participants in a call rather than sitting constant. An idle Jitsi install
costs you almost nothing. A ten-person call costs you real bandwidth, more
than it costs you CPU.</p>

<p>Everything else in this list spends most of its life waiting for a request
that never comes. Do not buy a current-generation processor to run a wiki.</p>
""",

"backups": """
<p>Three categories, and they need different treatment.</p>

<ol class="steps">
<li><strong>Bind-mount directories.</strong> Copy them. If your compose file
and these folders are backed up, you can rebuild the stack on a new
machine.</li>
<li><strong>Databases.</strong> Do not copy the files while the database is
running. Take a dump: <code>docker compose exec db pg_dump -U user dbname
&gt; dump.sql</code> for PostgreSQL, the mysqldump or mongodump equivalent
otherwise. A file-level copy of a live database restores as a corrupt
database, and you usually find out at the worst moment.</li>
<li><strong>Application-level exports.</strong> Several apps have their own
export that survives a version change better than a raw backup does.
Paperless has a document export, Wekan exports boards as JSON with
attachments, BookStack and Wiki.js both export content. Run one occasionally
even if you have file backups.</li>
</ol>

<div class="warning"><strong>An untested backup is not a backup.</strong>
Restore one into a scratch directory and start the stack against it. The
first restore always reveals something: a missing environment variable, a
permission mismatch, a secret that only existed in the running container. Find
that out deliberately rather than during an outage.</div>

<div class="tip"><strong>Back up your secrets separately.</strong> Homarr's
encryption key, BookStack's APP_KEY, Zipline's CORE_SECRET and OpenSign's
MASTER_KEY are not in any volume. They are in your .env file. Lose that and a
perfect data backup still will not start.</div>
""",

"examples": """
<p>Three stacks that make sense together, sized honestly.</p>

<div class="card teal">
<p><strong>The small one. 4GB, any machine that stays on.</strong></p>
<p>BookStack, Forgejo, PairDrop, Dashy. A wiki, your code, a way to move
files around the house, and one page that links it all. Runs comfortably on a
Raspberry Pi 5 or an older NAS. No OCR, so nothing is CPU-bound.</p>
</div>

<div class="card">
<p><strong>The usual one. 8GB, a second-hand mini PC.</strong></p>
<p>Everything above plus Paperless-ngx with Redis and PostgreSQL,
Stirling-PDF, PsiTransfer and Homarr. This is the stack most people who read
this site end up with. OCR is fast enough that scanning becomes a habit
rather than a chore.</p>
</div>

<div class="card peach">
<p><strong>The large one. 16GB and a real domain.</strong></p>
<p>Everything above plus CryptPad on its two domains, Jitsi Meet with UDP
open, and either AppFlowy or Huly deployed from its own repository. At this
point you are running infrastructure rather than a few containers, and the
<a href="hardware.html#backups">backup section</a> stops being optional.</p>
</div>

<p>Notice what is missing from all three: you do not need two wikis, two
forges or three PDF tools. Pick one per job and add the second only when you
have a reason. <a href="documentation.html">Docs</a> has the comparison for
each pair.</p>
"""
}

# --------------------------------------------------------------------------
CONTENT["faq.html"] = {

"first": """
<p class="lead">Four checks, in this order. They resolve most problems before
you have to think hard about any of them.</p>

<ol class="steps">
<li><strong>Read the logs.</strong>
<code>docker compose logs -f servicename</code>. The answer is in there far
more often than people expect, and reading it takes less time than
guessing.</li>
<li><strong>Check the container is not just pretending.</strong>
<code>docker compose ps</code> showing <code>Up</code> only means the process
started. A container can be running while the application inside it is
wedged, waiting on a database that never came up.</li>
<li><strong>Check what it depends on.</strong> If an app needs PostgreSQL or
Redis, look at those first. An app that cannot reach its database usually
reports something vague about its own startup rather than naming the
database.</li>
<li><strong>Check the URL variable.</strong> Half of all "it loads but
nothing works" reports are an app that does not know its own address.
APP_URL, PAPERLESS_URL, ROOT_URL, PUBLIC_URL, SERVER_URL. Different name in
every app, same problem.</li>
</ol>

<div class="tip"><strong>Restarting is not diagnosis.</strong> It fixes
transient startup ordering and nothing else. If a restart fixes it twice, the
real problem is that something starts before its dependency is ready, and the
fix is a healthcheck rather than a habit.</div>
""",

"perms": """
<p>Permission errors are the most common first-run failure, and the error
message rarely says "permissions".</p>

<p>What you usually see instead: the app starts and immediately exits, or it
starts and reports that it cannot write to a directory, or it comes up with
an empty database every restart.</p>

<p>The cause is a mismatch between the user inside the container and the
owner of your bind-mount directory. Two fixes, depending on the image:</p>

<ul>
<li><strong>Images with PUID and PGID</strong>, which includes everything from
LinuxServer: set them to your own IDs from <code>id -u</code> and
<code>id -g</code>.</li>
<li><strong>Images with a fixed internal user</strong>: change the directory
to match. PsiTransfer is the clearest case on this site. Upstream requires
its data volume to be owned by UID 1000, so
<code>chown -R 1000 ./data</code> before the first start.</li>
</ul>

<div class="warning"><strong>Create bind-mount directories yourself.</strong>
If Docker creates a missing directory, it creates it owned by root, and the
app then cannot write to it. Chibisafe documents this explicitly: make the
database, uploads and logs directories before the first start.</div>
""",

"ports": """
<p>Two services wanting the same host port will not start, and the error
names the port rather than the app, which is why it reads as mysterious.</p>

<p>The clash you will hit is port 3000. On this site alone, Forgejo, Gogs,
CryptPad, PairDrop, PsiTransfer, Zipline and OpenSign's client all default to
it. Port 8080 is the second most crowded.</p>

<p>Find out what is holding a port with <code>docker compose ps</code>, or on
the host with <code>ss -tulpn | grep 3000</code>.</p>

<div class="tip"><strong>Change the host side, not the container
side.</strong> In <code>"4000:8080"</code> the left number is yours to pick
freely. The right number is what the application listens on inside the
container, and changing it usually requires also changing a configuration
variable. The <a href="generator.html">Generator</a> assigns unique host
ports so this does not come up.</div>

<p>Remember that other containers do not use your host port. They reach the
service on its container port by service name. Publishing a port is for you,
not for them, and a database needs no published port at all.</p>
""",

"upgrades": """
<p>The generic advice is on the <a href="guide.html#updates">Guide</a>: pin
major versions, read release notes, take a backup. These are the traps
specific to modules on this site.</p>

<div class="tbl">
<table>
<thead><tr><th>Module</th><th>What bites</th></tr></thead>
<tbody>
<tr><td>Wiki.js</td><td>Pulling <code>latest</code> moves you toward version 3, which upstream says is an unstable beta not for production. Pin <code>:2</code></td></tr>
<tr><td>Dashy</td><td>v3 moved config to <code>/app/user-data</code> and the port from 80 to 8080. v4 removed the <code>build-and-start</code> entrypoint</td></tr>
<tr><td>Zipline</td><td>v3 to v4 is a rewrite with no in-place upgrade. Variables were renamed: CORE_DATABASE_URL to DATABASE_URL, CORE_HOST to CORE_HOSTNAME</td></tr>
<tr><td>Huly</td><td>0.6 to 0.7 needs upstream's dedicated migration steps, not a pull</td></tr>
<tr><td>Homarr</td><td>The v1 rewrite required manual reconfiguration</td></tr>
<tr><td>PdfDing</td><td>The GitHub repo is archived. Development moved to Codeberg</td></tr>
</tbody>
</table>
</div>

<div class="warning"><strong>Automatic updaters are a poor fit for this
stack.</strong> Watchtower and similar tools will happily pull a major
version overnight and migrate a database you have no backup of. Every entry
in the table above is something an unattended update would have done to you
without asking.</div>
""",

"data": """
<p>Every module on this site has a way out. Knowing which one, before you
need it, is the difference between switching tools and being stuck.</p>

<div class="fields"><dl>
<dt>Paperless-ngx</dt><dd>Document export, which writes originals plus metadata to the export volume</dd>
<dt>Docspell</dt><dd>Documents remain in its storage, with a documented API for bulk retrieval</dd>
<dt>BookStack and Wiki.js</dt><dd>Content export. Wiki.js can also keep everything mirrored to Git continuously</dd>
<dt>Forgejo and Gogs</dt><dd>Git repositories are already portable. Clone them. Issues need the API</dd>
<dt>Wekan</dt><dd>Board export as JSON, attachments included</dd>
<dt>PdfDing</dt><dd>The PDFs are files on disk in your media directory</dd>
<dt>Kiwix</dt><dd>The ZIM files are yours already</dd>
<dt>CryptPad</dt><dd>Export per document. The server cannot do it for you, by design</dd>
</dl></div>

<div class="warning"><strong>CryptPad is the one to think about
early.</strong> Its encryption means the server genuinely cannot recover your
documents if you lose access to them. That is the feature. It also means
there is no administrator who can help, including you.</div>

<p>Test one export while everything is working. An export path you have never
run is a claim, not a plan.</p>
"""
}


# --------------------------------------------------------------------------
CONTENT["generator.html"] = {

"modules": """
<p class="lead">Pick what you want. Dependencies are added for you and marked,
host ports are assigned so nothing collides, and secrets are generated in your
browser.</p>
<noscript><div class="warning">This page needs JavaScript. Everything runs
locally in your browser; nothing is sent anywhere.</div></noscript>
<div id="gen-modules"></div>
""",

"storage": """
<p>Where the data lives on disk. This decides every volume path in the compose
file.</p>
<div id="gen-storage"></div>
""",

"connection": """
<p>How the stack is reached, and which user it runs as.</p>
<div id="gen-connection"></div>
""",

"credentials": """
<p>Values only you can supply. Everything here is optional at this stage.</p>
<div id="gen-credentials"></div>
""",

"secrets": """
<p>Generated locally, one unique value per service, hidden by default.</p>
<div id="gen-secrets"></div>
""",

"review": """
<p>Blocking errors stop the files being usable. Warnings are things to know
about, not things to fix.</p>
<div id="gen-review"></div>
""",

"files": """
<p>Your stack. Download the ZIP, unpack it, and run <code>sh install.sh</code>.</p>
<div id="gen-files"></div>
<div class="warning"><strong>.env holds real secrets.</strong> It is listed in
the generated .gitignore. Commit .env.example instead, and back .env up
somewhere that is not a git repository: it contains keys that exist nowhere
else, and a perfect data backup will not start without them.</div>
"""
}
