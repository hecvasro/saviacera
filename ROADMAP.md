# Saviacera roadmap

Status snapshot, what's done, what's pending, and what needs a decision before it can proceed. The wife-facing how-to lives in [README.md](./README.md) (Spanish). The technical/operating reference lives in [CLAUDE.md](./CLAUDE.md). This file is the **handoff doc** — kept terse and actionable so a future Claude session (or you, returning a week later) can pick up cold.

Last updated: 2026-05-11.

## Status snapshot

- **Code lives at** `github.com/hecvasro/saviacera` (private remote, branch `main`).
- **Production site**: https://saviacera.com (apex canonical) and https://www.saviacera.com — both serve the live build with auto-issued certs.
- **Hosting**: Cloudflare Workers Static Assets, Worker name `saviacera`, configured by `wrangler.jsonc`, deployed via `wrangler deploy`. (Migrated off Cloudflare Pages on 2026-05-12.) GitHub→CF auto-deploy is not yet wired (next priority).
- **CI**: none. Deploys are manual via `npm run deploy` from a machine with the API token loaded.
- **Content**: 3 example products in `src/content/products/` (all with picsum placeholder images).
- **Order flow**: NOT YET FUNCTIONAL in production — see "Blocking production go-live" below.
- **Content-management strategy**: two interfaces sharing the same markdown files.
  - **Decap CMS** at `saviacera.com/admin/` — primary path for the non-technical owner. Web form, GitHub OAuth login, no install. **NOT YET BUILT.** Implementation plan in CLAUDE.md → "Building Decap CMS".
  - **Claude Code skills** at `.claude/skills/` — Hector's tool and fallback. Six Spanish skills (`/agregar-producto`, `/editar-producto`, `/borrar-producto`, `/actualizar-foto`, `/cambiar-tema`, `/publicar`) ready and tested.

## Done

- [x] Initial Astro 5 + Tailwind v4 scaffold with content collections, cart, WhatsApp checkout flow (commit `7e39fec`).
- [x] Push to GitHub over SSH with noreply email author identity (`8771303+hecvasro@users.noreply.github.com`).
- [x] Cloudflare API token created with Pages/Account/User read + DNS edit + Zone read scopes, stored in `.envrc.local`.
- [x] direnv-based credential flow (`.envrc` loads `.env.local` + `.envrc.local`), documented in CLAUDE.md.
- [x] `wrangler` installed as devDep, `npm run deploy` / `npm run deploy:preview` scripts.
- [x] Cloudflare Pages project `saviacera` created, first deploy succeeded.
- [x] Custom domain `saviacera.com` attached (apex + `www`), CNAMEs created in Cloudflare-managed zone, certs issued and active (commit `e1c0e57`).
- [x] Wife-facing Spanish skills authored under `.claude/skills/` (six skills, conversational Q&A pattern, commit + push at the end).
- [x] Strategy pivot decision (2026-05-11 PM): Decap CMS becomes the primary content-management interface for the non-technical owner. Skills become Hector's tool / fallback. Detailed Decap implementation plan captured in CLAUDE.md.

## In-flight / decision needed

### Priority 1 — GitHub → Cloudflare Workers Builds auto-deploy (one-time setup)

Once this is wired, `git push origin main` triggers a Cloudflare-side build + `wrangler deploy`, and the wife's skill workflow becomes truly end-to-end (no `npm run deploy` step needed). Until then, every wife-driven push still needs Hector to manually deploy.

Now that the project is on **Workers Static Assets** (not Pages), this is configured from the unified **Workers & Pages → saviacera Worker → Settings → Builds** UI rather than the old Pages-only flow. The old caveat that this "must be done via Pages dashboard OAuth and can't be scripted" is no longer relevant — Workers Builds is the same unified surface, and `wrangler.jsonc` declares the build target, so config drift between the dashboard and the repo is minimized. Full procedure is in CLAUDE.md → "Setting up GitHub auto-deploy". Summary:

1. Cloudflare Dashboard → `saviacera` Worker → Settings → Builds → Connect → authorize repo `hecvasro/saviacera`.
2. Configure build: build command `npm run build`, deploy command `npx wrangler deploy` (auto-filled from `wrangler.jsonc`), branch `main`, `NODE_VERSION=20`.
3. Set production **build** vars in the dashboard: `PUBLIC_ORDER_ENDPOINT`, `PUBLIC_WHATSAPP_NUMBER`, `NODE_VERSION`. (Build vars, not runtime secrets — `PUBLIC_*` is baked in at `astro build` time.)
4. Re-attach the custom domains (`saviacera.com`, `www.saviacera.com`) to the new Worker via Settings → Domains & Routes → Add Custom Domain. The Pages-side attachments can then be removed.

**Caveat**: production build vars then live in the Cloudflare dashboard, not `.env.local`. Keep them in sync mentally or treat the dashboard as canonical for production builds.

### Priority 2 — Build Decap CMS  *(code shipped, manual setup pending)*

Code is in place — Worker auth proxy (`worker/index.ts`), admin bootstrap
(`public/innh85dhz2/index.html`), schema mapping (`public/innh85dhz2/config.yml`).
Admin URL is intentionally obscured: `saviacera.com/innh85dhz2/`.

**Remaining work is operational, not coding** — see
[DECAP-SETUP.md](./DECAP-SETUP.md) for the click-by-click steps:

1. Create the GitHub OAuth App (callback URL: `https://saviacera.com/api/callback`).
2. Set `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` as Worker secrets in the CF dashboard.
3. Set up Cloudflare Access (Zero Trust) on `/innh85dhz2/*` + `/api/auth` + `/api/callback`, magic-link to wife's email.
4. (When she's ready) Add wife as collaborator with write access on `hecvasro/saviacera`.
5. End-to-end smoke test: edit a product through Decap, verify commit → CF Build → site update.

Future polish (after MVP works):
- Add the `theme` collection (fonts, colors, optional logo image) + the build wiring that translates the JSON into CSS variables and Google Fonts `<link>`.
- Flip CLAUDE.md + README.md mentions of "próximamente" to "active".

### Priority 3 — Wife setup (one-time)

After Decap (P2) is live, she needs almost nothing local:

1. Create a GitHub account (free) if she doesn't have one.
2. Hector adds her as a collaborator on `hecvasro/saviacera` with write access.
3. (If using Cloudflare Access) Confirm her email is allow-listed.
4. Send her the `/admin/` URL.

No Claude Code, no SSH keys, no `npm install`, no terminal. If at some later point she wants the conversational Claude flow as well, the skills are there waiting.

### Priority 4 — `www` → apex redirect (canonical hardening)

Both apex and www currently serve the same content with 200. For real SEO canonical behavior, www should 301 → apex. Three paths open (you picked apex as canonical, so direction is set; only the **mechanism** is undecided):

1. **You create the rule in the dashboard** (~60s). Cloudflare → `saviacera.com` zone → Rules → Redirect Rules → Create. Match: `Hostname equals www.saviacera.com`. Action: Dynamic redirect, `concat("https://saviacera.com", http.request.uri.path)`, 301, preserve query string. No token change required.
2. **Add `Zone → Config Rules → Edit`** to the token, and the next Claude session creates the redirect via API.
3. **Skip the 301**, add `<link rel="canonical" href="https://saviacera.com{path}" />` in `BaseLayout.astro` so search engines still know which is primary. Weaker signal but zero infra.

Recommendation: 1. Lowest total effort.

## Blocking production go-live

These need to be resolved before the site can actually take orders. Currently the visual site is up but the order pipeline is broken.

- [ ] **Create `.env.local`** with real values for `PUBLIC_ORDER_ENDPOINT` and `PUBLIC_WHATSAPP_NUMBER`. Today the file doesn't exist locally, so the build embeds an undefined endpoint and the WhatsApp number defaults to the hardcode in `Footer.astro` (see next item).
- [ ] **Deploy the Google Apps Script Web App** that receives orders. Follow the steps already documented in `README.md` → "Configurar el flujo de pedidos". Output is the `/exec` URL that goes into `PUBLIC_ORDER_ENDPOINT`.
- [ ] **Fix `src/components/Footer.astro:26`** — the WhatsApp link hardcodes `18295286271` instead of reading from `import.meta.env.PUBLIC_WHATSAPP_NUMBER`. Replace with the env-driven value (with a sensible fallback or build-time assertion if empty).
- [ ] **Redeploy** (`npm run deploy`) after the above three.
- [ ] **End-to-end smoke test**: add a candle to cart, "checkout", confirm (a) WhatsApp opens with the prefilled message and (b) the order appears as a row in the Google Sheet.

## Short-term backlog (after go-live)

- [ ] **Real product photos** to replace `picsum.photos` placeholders. Upload to `src/assets/products/<slug>/` and reference as relative paths in each `.md` (`/actualizar-foto` skill walks through this; Decap will handle upload + commit once built). Schema already supports both URL and local image refs.
- [ ] **Wire the brand logo asset** when the wife provides it. Two code paths to keep open in `Header.astro`: (a) wordmark text in `--font-display` or a new `--font-logo` variable, (b) `<img src="/logo.svg" alt="Saviacera" />` if the logo is a baked image. The `cambiar-tema` skill documents both for the owner; we'll need to actually implement the conditional in Header when she's ready.
- [ ] **Sitemap + robots.txt**. Astro has `@astrojs/sitemap` integration — one-liner setup.
- [ ] **Basic SEO**: per-page `<title>`/`<meta description>`/OG tags. `BaseLayout.astro` likely already takes a `title` prop; audit.
- [ ] **Analytics**. Cloudflare Web Analytics (free, no cookie banner) is the lowest-friction option.

## Long-term direction

### Google Sheets-backed CMS

The intent (per Hector): extend the existing Apps Script + Google Sheets setup so that **products are managed via Sheets**, not markdown. Wife edits a "Products" tab, adds rows, uploads images to a Drive folder; a build step or runtime hook pulls the sheet contents into the site. This is **planned, not designed yet**.

Open questions to resolve before designing it:

- **Pull vs push**: does a build script fetch the sheet at build time (re-deploy whenever Sheet changes) or does the site read from the Sheet at runtime (always-fresh but a Sheets API call per page view)?
- **Build trigger**: who decides when to deploy after a Sheet edit? Webhook from Apps Script on `onEdit`? Manual button? Scheduled cron?
- **Image handling**: Sheets isn't great for binary uploads — likely a Drive folder convention with the Sheet referencing filenames.
- **Schema mapping**: how does the current Zod schema in `src/content.config.ts` translate to columns? Categories enum, image arrays, includes-as-list-of-strings.
- **Source of truth conflict**: if both markdown files and Sheets exist, which wins? Probably a hard cut over with markdown files removed at the same time.

These can be designed when prioritized. None of this is blocking go-live.

### Other long-term items

- Bilingual content (`en` locale already scaffolded in `astro.config.mjs` but no English content yet).
- Newsletter signup / email capture for repeat customers.
- Stock-aware UI (`stock` and `available` fields exist in the schema but aren't surfaced).
- Maybe: real payment (Azul, CardNet, or similar DR processor) — explicitly excluded for v1.

## Operating notes for future Claude sessions

- **Docs map**: this file (status), [CLAUDE.md](./CLAUDE.md) (technical/operating reference for future Claude sessions), [README.md](./README.md) (wife-facing, Spanish), [THEMING.md](./THEMING.md) (wife-facing theming, Spanish).
- **Wife-facing skills** live in `.claude/skills/`. CLAUDE.md → "Content management — wife-facing skills" documents the design principles. When asked to add or change a skill, follow those principles (one question at a time, Spanish, validate as you go, preview before write, confirm before push).
- **Credentials**: live in `.envrc.local` (gitignored). Run wrangler / Cloudflare API calls with `direnv exec .` prefix because the Bash tool is non-interactive. See CLAUDE.md → "Working from Claude Code".
- **Token scope policy**: minimum required scopes for each operation listed in CLAUDE.md → "API token scopes". If a list endpoint returns empty + `success: true`, suspect missing read scope before concluding the resource doesn't exist.
- **Commit identity**: `hecvasro <8771303+hecvasro@users.noreply.github.com>` — enforced by `~/.gitconfig` global, not repo-local.
- **Don't deploy with `--commit-dirty=true`** unless you've checked the diff. Keeping the warning is the safer default.
- **After GH auto-deploy is wired**: production env vars live in the Cloudflare dashboard, not `.env.local`. Don't assume `.env.local` reflects what's deployed.
