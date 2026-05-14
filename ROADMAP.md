# Saviacera roadmap

Status snapshot, what's done, what's pending, and what needs a decision before it can proceed. The wife-facing how-to lives in [README.md](./README.md) (Spanish). The technical/operating reference lives in [CLAUDE.md](./CLAUDE.md). This file is the **handoff doc** — kept terse and actionable so a future Claude session (or you, returning a week later) can pick up cold.

Last updated: 2026-05-14.

## Status snapshot

- **Code lives at** `github.com/hecvasro/saviacera` (private remote, branch `main`).
- **Production site**: https://saviacera.com (apex canonical) and https://www.saviacera.com — both serve the live build with auto-issued certs.
- **Hosting**: Cloudflare Workers Static Assets, Worker name `saviacera`, configured by `wrangler.jsonc`. Migrated off Cloudflare Pages on 2026-05-12.
- **CI/Deploy**: GitHub → Cloudflare Workers Builds auto-deploy is **live**. Every push to `main` triggers a Cloudflare-side build + `wrangler deploy`. `npm run deploy` remains as a manual fallback.
- **Order flow**: **live**. `src/lib/checkout.ts` reads `PUBLIC_ORDER_ENDPOINT` and `PUBLIC_WHATSAPP_NUMBER` from `import.meta.env`. The Apps Script `/exec` endpoint is deployed and smoke-tested (`SAV-TEST-0001` appended to the Google Sheet). `Footer.astro` reads the env-driven WhatsApp number.
- **Decap CMS**: **live and in testing**. Admin at `https://saviacera.com/innh85dhz2/` (obscured path). Auth model is a **GitHub App bot proxy** in the Worker — the wife does **not** need a GitHub account and is **not** a repo collaborator. All writes flow through the Worker as the App bot, with the editor's Cloudflare Access email annotated into each commit message. Wife is currently running smoke tests.
- **Content**: 3 sample products in `src/content/products/` — `jabon-cafe-cacao`, `set-san-valentin`, `vela-coco-vainilla` (placeholder photos pending real shoot).
- **Content-management strategy**: two interfaces sharing the same markdown files.
  - **Decap CMS** at `saviacera.com/innh85dhz2/` — primary path for the non-technical owner.
  - **Claude Code skills** in `.claude/skills/` — Hector's tool and fallback (`/agregar-producto`, `/editar-producto`, `/borrar-producto`, `/actualizar-foto`, `/cambiar-tema`, `/publicar`).

## Done

- [x] Initial Astro 5 + Tailwind v4 scaffold with content collections, cart, WhatsApp checkout flow.
- [x] Push to GitHub over SSH with noreply email author identity (`8771303+hecvasro@users.noreply.github.com`).
- [x] Cloudflare API token created, stored in `.envrc.local`, scopes documented in CLAUDE.md.
- [x] direnv-based credential flow (`.envrc` loads `.env.local` + `.envrc.local`).
- [x] `wrangler` installed as devDep, `npm run deploy` / `npm run deploy:preview` scripts.
- [x] **Migrated hosting to Cloudflare Workers Static Assets** (off Pages). `wrangler.jsonc` declares `workers_dev: false` and `preview_urls: false` so the only public surface is `saviacera.com` / `www.saviacera.com`.
- [x] Custom domain `saviacera.com` attached (apex + `www`), Cloudflare-managed DNS, certs issued and active.
- [x] **GitHub → Cloudflare Workers Builds auto-deploy is live.** Push to `main` is the deploy.
- [x] Wife-facing Spanish skills authored under `.claude/skills/` (six skills, one-question-at-a-time pattern, commit + push at the end).
- [x] **Order flow live end-to-end.** Apps Script Web App deployed, build vars set in CF dashboard (`PUBLIC_ORDER_ENDPOINT`, `PUBLIC_WHATSAPP_NUMBER`, `NODE_VERSION`), Footer + checkout read from env, smoke test row landed in Google Sheet.
- [x] **Decap CMS shipped end-to-end** (commit `09b04ca` pivoted from OAuth App to GitHub App bot proxy).
  - GitHub App `Saviacera CMS` installed on `hecvasro/saviacera` only, with Contents read/write + Metadata read permissions.
  - Worker secrets configured in CF dashboard: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY` (PKCS#8 PEM).
  - Worker proxies `/api/github/*` to `api.github.com` with short-lived (~1h) installation tokens minted on demand.
  - Cloudflare Access protects `/innh85dhz2/*`, `/api/auth*`, `/api/callback*` via one-time PIN magic-link to allow-listed emails.
  - Commit messages annotated with editor's CF Access email so `git log` shows who made each change.
  - "Login with GitHub" button auto-clicked on admin entry so the wife never sees it.
- [x] **4-umbrella catalog taxonomy** live: Aromáticos / Cuidado personal / Sets / Personalizados. Old `velas` / `jabones` / `kits` pages replaced; Header, Footer, and home intro updated to match.

## In-flight

- **Wife testing Decap CMS** — smoke tests in progress (edit existing product, save, verify commit + redeploy land on the live site). She's already made successful CMS commits to `main` (see `1da4203` and `9cd3a6d`, `CMS: actualizar Producto «set-san-valentin»`).

## Pending

### `www` → apex 301 redirect (canonical hardening, low priority)

Both apex and `www` currently serve the same content with 200. For real SEO canonical behavior, `www` should 301 → apex. Three paths open (you picked apex as canonical, so direction is set; only the **mechanism** is undecided):

1. **Cloudflare Redirect Rule via the dashboard** (~60s, **recommended**). Cloudflare → `saviacera.com` zone → Rules → Redirect Rules → Create. Match: `Hostname equals www.saviacera.com`. Action: Dynamic redirect, `concat("https://saviacera.com", http.request.uri.path)`, 301, preserve query string. No token-scope change required.
2. **Add `Zone → Config Rules → Edit`** to the API token, and the next Claude session creates the redirect via API.
3. **Skip the 301**, add `<link rel="canonical" href="https://saviacera.com{path}" />` in `BaseLayout.astro` so search engines still know which is primary. Weaker signal but zero infra.

Recommendation: 1. Lowest total effort.

### Theme collection in Decap (fonts / colors / logo via CMS)

Right now `cambiar-tema` is the only way to touch `src/styles/tokens.css` and `BaseLayout.astro`'s Google Fonts `<link>`. The next polish step is to expose the same knobs as a second Decap collection so the wife can change a font from a dropdown without anyone touching code. Design sketch in CLAUDE.md → "Building Decap CMS — theme collection". Needs:

- A `theme` files-collection in `public/innh85dhz2/config.yml` writing to `src/content/theme/site.json`.
- A small Astro integration or pre-build step that reads `site.json` and injects CSS variables + the Google Fonts `<link>` URL into `BaseLayout.astro`.
- Conditional logo rendering in `Header.astro`: if `logoImage` is set, render `<img>`; else fall back to wordmark text.

Not blocking; do after the wife is comfortable editing products.

### Real product photography + catalog content

The three sample products use placeholder images. Replace once real photos exist (Decap handles uploads through `/api/github/*` → `public/uploads/`). Wife should also flesh out the actual catalog beyond samples.

## Short-term backlog (after wife signs off on Decap testing)

- [ ] **Sitemap + robots.txt**. Astro has `@astrojs/sitemap` integration — one-liner setup. (Currently the `/innh85dhz2/` page has its own `noindex` meta — site-wide sitemap should explicitly exclude that path.)
- [ ] **Basic SEO**: per-page `<title>` / `<meta description>` / OG tags. `BaseLayout.astro` likely already takes a `title` prop; audit.
- [ ] **Analytics**. Cloudflare Web Analytics (free, no cookie banner) is the lowest-friction option.

## Long-term direction

### Google Sheets-backed CMS

The intent (per Hector): extend the existing Apps Script + Google Sheets setup so that **products are managed via Sheets**, not markdown. Wife edits a "Products" tab, adds rows, uploads images to a Drive folder; a build step or runtime hook pulls the sheet contents into the site. Planned, not designed yet — and now lower urgency because Decap is doing the job.

Open questions to resolve before designing it:

- **Pull vs push**: does a build script fetch the sheet at build time (re-deploy whenever Sheet changes) or does the site read from the Sheet at runtime (always-fresh but a Sheets API call per page view)?
- **Build trigger**: who decides when to deploy after a Sheet edit? Webhook from Apps Script on `onEdit`? Manual button? Scheduled cron?
- **Image handling**: Sheets isn't great for binary uploads — likely a Drive folder convention with the Sheet referencing filenames.
- **Schema mapping**: how does the current Zod schema in `src/content.config.ts` translate to columns? Categories enum, image arrays, includes-as-list-of-strings.
- **Source of truth conflict**: if both markdown files and Sheets exist, which wins? Probably a hard cut over with markdown files removed at the same time.

None of this is blocking.

### Other long-term items

- Bilingual content (`en` locale already scaffolded in `astro.config.mjs` but no English content yet).
- Newsletter signup / email capture for repeat customers.
- Stock-aware UI (`stock` and `available` fields exist in the schema but aren't surfaced).
- Maybe: real payment (Azul, CardNet, or similar DR processor) — explicitly excluded for v1.

## Operating notes for future Claude sessions

- **Docs map**: this file (status), [CLAUDE.md](./CLAUDE.md) (technical/operating reference for future Claude sessions), [DECAP-SETUP.md](./DECAP-SETUP.md) (one-time Decap manual setup, Spanish), [README.md](./README.md) (wife-facing, Spanish), [THEMING.md](./THEMING.md) (wife-facing theming, Spanish).
- **Decap auth model**: GitHub App bot proxy in `worker/index.ts` mints installation tokens scoped to `hecvasro/saviacera` only. Wife is **not** a repo collaborator. Cloudflare Access magic-link is the human-identity gate.
- **Wife-facing skills** live in `.claude/skills/`. CLAUDE.md → "Content management — wife-facing skills" documents the design principles. When asked to add or change a skill, follow those principles (one question at a time, Spanish, validate as you go, preview before write, confirm before push).
- **Credentials**: live in `.envrc.local` (gitignored). Run wrangler / Cloudflare API calls with `direnv exec .` prefix because the Bash tool is non-interactive. See CLAUDE.md → "Working from Claude Code".
- **Token scope policy**: minimum required scopes for each operation listed in CLAUDE.md → "API token scopes". If a list endpoint returns empty + `success: true`, suspect missing read scope before concluding the resource doesn't exist.
- **Commit identity**: `hecvasro <8771303+hecvasro@users.noreply.github.com>` — enforced by `~/.gitconfig` global, not repo-local. Decap-driven commits come through the GitHub App bot, attributed to `saviacera-cms-bot[bot]` with the editor's email noted in the commit body.
- **Production env vars live in the Cloudflare dashboard**, not `.env.local`. Local `.env.local` only affects `npm run dev` / `npm run build` on Hector's machine. Don't assume `.env.local` reflects what's deployed.
