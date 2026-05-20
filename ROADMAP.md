# Saviacera roadmap

Status snapshot, what's done, what's pending, and what needs a decision before it can proceed. The wife-facing how-to lives in [README.md](./README.md) (Spanish). The technical/operating reference lives in [CLAUDE.md](./CLAUDE.md). This file is the **handoff doc** — kept terse and actionable so a future Claude session (or you, returning a week later) can pick up cold.

Last updated: 2026-05-20.

## Status snapshot

- **Code lives at** `github.com/hecvasro/saviacera` (private remote, branch `main`).
- **Production site**: https://saviacera.com (apex canonical), auto-issued certs. `https://www.saviacera.com` now 301s to the apex via a Cloudflare Redirect Rule (live 2026-05-20).
- **Hosting**: Cloudflare Workers Static Assets, Worker name `saviacera`, configured by `wrangler.jsonc`. Migrated off Cloudflare Pages on 2026-05-12.
- **CI/Deploy**: GitHub → Cloudflare Workers Builds auto-deploy is **live**. Every push to `main` triggers a Cloudflare-side build + `wrangler deploy`. `npm run deploy` remains as a manual fallback.
- **Order flow**: **live**. `src/lib/checkout.ts` reads `PUBLIC_ORDER_ENDPOINT` and `PUBLIC_WHATSAPP_NUMBER` from `import.meta.env`. The Apps Script `/exec` endpoint is deployed and smoke-tested (`SAV-TEST-0001` appended to the Google Sheet). `Footer.astro` reads the env-driven WhatsApp number.
- **Decap CMS**: **live and in real use**. Admin at `https://saviacera.com/innh85dhz2/` (obscured path). Auth model is a **GitHub App bot proxy** in the Worker — the wife does **not** need a GitHub account and is **not** a repo collaborator. All writes flow through the Worker as the App bot, with the editor's Cloudflare Access email annotated into each commit message. Edit + create both validated end-to-end after the schema-brittleness fix on 2026-05-15. On 2026-05-16 the original 3 sample products were deleted and the real catalog began (see "Content" below).
- **Content**: real catalog in flight. As of 2026-05-19, `src/content/products/` holds 8 real products (`calendula-chamomile`, `french-clay-charcoal-facial-reset-soap`, `pink-clay-rosehip`, `trinket-dish-personalizado`, `drift-bloom-edición-mamá`, `morning-brew`, `set-esencia-de-mama`, `set-san-valentin`) with real photos uploaded via Decap, plus one leftover garbage-named file from the pre-fix schema-brittleness era still pending cleanup (see Pending → "Data-integrity cleanup").
- **Product variations**: **live** as of 2026-05-19. Single-axis variations (`variantLabel` + `variants[]` in `src/content.config.ts` and `public/innh85dhz2/config.yml`) — the wife names the axis (Aroma, Tipo de cera, Tamaño) and lists options. Per-option price is optional (`z.preprocess` coerces blank → undefined to dodge the Decap brittleness class). PDP forces explicit selection; chosen option appears in cart, WhatsApp message, and Apps Script sheet row.
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
- [x] **Schema brittleness fix** (commit `783a4c4`, 2026-05-15). The first wave of Decap edits committed to `main` but never reached production because `astro check && astro build` was failing every build. Two unrelated Zod constraints didn't match what Decap actually serializes: (a) `stock: z.number().optional()` rejected the empty-input `stock: ""` (string) that Decap writes when a non-required number widget is left blank, and (b) `images: z.union([z.string().url(), image()])` rejected Decap's root-relative `/uploads/foo.jpg` paths (not full URL, not relative import). Removed `stock` entirely (no inventory tracking) and loosened the image union to `z.string()`. See Operating notes → "Decap-Zod schema brittleness".
- [x] **Site images collection in Decap** (commit `0bdbfce`, 2026-05-16). Files-collection in `public/innh85dhz2/config.yml` writing to `src/content/site/images.json`. The wife can now change the home hero, footer image, and Personalizados gallery from the admin panel — no skill or code touch required. `Footer.astro` and the relevant pages import the JSON directly.
- [x] **Product variations** (2026-05-19). Schema (`src/content.config.ts`) and Decap config got a single-axis `variantLabel` + `variants[]` (each option has `name`, optional `priceDOP`, optional `sku`). Cart keys lines by `slug::variant` so two scents stay as two cart lines. PDP renders a `<select>` that forces explicit choice and updates the displayed price on change. WhatsApp message + Apps Script payload include the chosen option. `Code.gs` updated to add the variant in parentheses on the sheet — **manual Apps Script redeploy required** to pick up the sheet-side change; the WhatsApp message side works without redeploy. `agregar-producto` and `editar-producto` skills updated in the same pass and a stale `kits`/`stock` reference from before the taxonomy and brittleness fixes was scrubbed at the same time.
- [x] **Instagram in footer** (2026-05-19). `Footer.astro` Contacto column links to `https://instagram.com/sabiasera` as `@sabiasera`.
- [x] **`www` → apex 301 redirect** (2026-05-20). Previously `www.saviacera.com` had no DNS record and wasn't reachable. Created via the Cloudflare API: (a) a proxied `CNAME www → saviacera.com` DNS record on the zone, and (b) a Redirect Rule named `www → apex` in the `http_request_dynamic_redirect` ruleset entrypoint — expression `(http.host eq "www.saviacera.com")`, action 301 redirect to `concat("https://saviacera.com", http.request.uri.path)` preserving the query string. Verified: `https://www.saviacera.com/aromaticos?utm=test` → 301 → `https://saviacera.com/aromaticos/?utm=test`. The rule is pure Cloudflare config — not committed to the repo.

## In-flight

- **Real catalog build-out** — wife is past the smoke-test phase. As of 2026-05-19 there are 8 real products with real photos managed via Decap. She has full control over the editor without coaching for the basic edit/create flows. Remaining content work and any new variations setups are her ongoing work, not a blocker.

## Pending

### Theme collection in Decap (fonts / colors / logo via CMS)

Right now `cambiar-tema` is the only way to touch `src/styles/tokens.css` and `BaseLayout.astro`'s Google Fonts `<link>`. The next polish step is to expose the same knobs as a second Decap collection so the wife can change a font from a dropdown without anyone touching code. Design sketch in CLAUDE.md → "Building Decap CMS — theme collection". Needs:

- A `theme` files-collection in `public/innh85dhz2/config.yml` writing to `src/content/theme/site.json`.
- A small Astro integration or pre-build step that reads `site.json` and injects CSS variables + the Google Fonts `<link>` URL into `BaseLayout.astro`.
- Conditional logo rendering in `Header.astro`: if `logoImage` is set, render `<img>`; else fall back to wordmark text.

Not blocking; do after the wife is comfortable editing products.

### Data-integrity cleanup — `morning-brew.md` swap

A leftover artifact from the pre-2026-05-15 schema-brittleness era: there are two product files with crossed identities.

- `src/content/products/map-details-list-notas-café-vainilla-y-caramelo-...-morning-brew-...md` — garbage filename (from before `identifier_field: name` was set on the products collection), but its `name:` frontmatter is **"Morning Brew"**.
- `src/content/products/morning-brew.md` — clean filename, but its `name:` frontmatter is **"Drift & Bloom"**.

So the URL `/productos/morning-brew` serves a product called "Drift & Bloom", and "Morning Brew" lives at a long mangled URL. Both build fine — the schema doesn't notice — but it's confusing in the catalog and unreviewable in `git log`. Resolution needs an owner decision (which file is canonical, do we keep both, are there duplicate photos, etc.) and then a manual `git mv` + frontmatter cleanup. Decap won't rename files, so this has to be done by hand. Not blocking, but worth resolving before more orders come in attached to ambiguous slugs.

### Apps Script redeploy to surface variant column in the sheet

`apps-script/Code.gs` was updated 2026-05-19 to append the chosen variant in parentheses on each item row (`2 × Vela X (Lavanda) (RD$1500)`). The file is committed but the **live Web App is a separately-deployed artifact** — Apps Script "Deploy → Manage deployments" needs a "New version" deployment of the existing Web App to pick up the change. The WhatsApp message displays the variant regardless (the site does that on its own), so this is sheet-side polish, not a blocker.

### Real product photography — partly done

Originally tracked as fully pending. As of 2026-05-19 the wife has uploaded real photos for the 8 real products via Decap. Whatever placeholder content remains (or future products without a final shoot) follows the same `/uploads/` upload-via-Decap path; no further infrastructure work needed.

## Short-term backlog

- [ ] **Build-failure alerting.** The 2026-05-15 incident hid a broken pipeline for ~9h because nobody was watching. Decap reports "Published" the moment the commit lands; whether Cloudflare's subsequent build actually deployed is invisible to her. Options, cheapest first: (a) Cloudflare Workers Builds email-on-failure (dashboard toggle, free); (b) a tiny GitHub Actions job on `push: main` that pings a webhook if `astro build` fails; (c) a status pill on the Decap admin page that polls the latest CF deploy time and warns if it's lagging behind `main`'s tip. Pick one.
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
- Maybe: real payment (Azul, CardNet, or similar DR processor) — explicitly excluded for v1.

## Operating notes for future Claude sessions

- **Docs map**: this file (status), [CLAUDE.md](./CLAUDE.md) (technical/operating reference for future Claude sessions), [DECAP-SETUP.md](./DECAP-SETUP.md) (one-time Decap manual setup, Spanish), [README.md](./README.md) (wife-facing, Spanish), [THEMING.md](./THEMING.md) (wife-facing theming, Spanish).
- **Decap auth model**: GitHub App bot proxy in `worker/index.ts` mints installation tokens scoped to `hecvasro/saviacera` only. Wife is **not** a repo collaborator. Cloudflare Access magic-link is the human-identity gate.
- **Wife-facing skills** live in `.claude/skills/`. CLAUDE.md → "Content management — wife-facing skills" documents the design principles. When asked to add or change a skill, follow those principles (one question at a time, Spanish, validate as you go, preview before write, confirm before push).
- **Credentials**: live in `.envrc.local` (gitignored). Run wrangler / Cloudflare API calls with `direnv exec .` prefix because the Bash tool is non-interactive. See CLAUDE.md → "Working from Claude Code".
- **Token scope policy**: minimum required scopes for each operation listed in CLAUDE.md → "API token scopes". If a list endpoint returns empty + `success: true`, suspect missing read scope before concluding the resource doesn't exist.
- **Commit identity**: `hecvasro <8771303+hecvasro@users.noreply.github.com>` — enforced by `~/.gitconfig` global, not repo-local. Decap-driven commits come through the GitHub App bot, attributed to `saviacera-cms-bot[bot]` with the editor's email noted in the commit body.
- **Production env vars live in the Cloudflare dashboard**, not `.env.local`. Local `.env.local` only affects `npm run dev` / `npm run build` on Hector's machine. Don't assume `.env.local` reflects what's deployed.
- **Decap-Zod schema brittleness.** Decap's number / date widgets with `required: false` serialize an empty input as `""` (string), not as an omitted key. A `z.number().optional()` rejects that and the build dies silently on Cloudflare. When adding a new optional numeric or datetime field to `src/content.config.ts`, either (a) make it truly required in Decap so the editor enforces a value, or (b) wrap the Zod field in `z.preprocess((v) => v === "" ? undefined : v, ...)` so empties coerce to `undefined`. Image-path fields: prefer plain `z.string()` over `z.string().url()` because Decap writes `/uploads/foo.jpg` (root-relative, served from `public/`), which is neither a full URL nor a relative import for `image()`. Always run `npm run build` locally after touching the schema or `public/innh85dhz2/config.yml` — same command Cloudflare runs.
