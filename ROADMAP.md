# Saviacera roadmap

Status snapshot, what's done, what's pending, and what needs a decision before it can proceed. The wife-facing how-to lives in [README.md](./README.md) (Spanish). The technical/operating reference lives in [CLAUDE.md](./CLAUDE.md). This file is the **handoff doc** — kept terse and actionable so a future Claude session (or you, returning a week later) can pick up cold.

Last updated: 2026-05-11.

## Status snapshot

- **Code lives at** `github.com/hecvasro/saviacera` (private remote, branch `main`).
- **Production site**: https://saviacera.com (apex canonical) and https://www.saviacera.com — both serve the live build with auto-issued certs.
- **Hosting**: Cloudflare Pages, project `saviacera`, deployed via `wrangler pages deploy ./dist` (direct upload). GitHub→CF auto-deploy is not yet wired (next priority).
- **CI**: none. Deploys are manual via `npm run deploy` from a machine with the API token loaded.
- **Content**: 3 example products in `src/content/products/` (all with picsum placeholder images).
- **Order flow**: NOT YET FUNCTIONAL in production — see "Blocking production go-live" below.
- **Wife-facing workflow**: six Spanish skills in `.claude/skills/` (`/agregar-producto`, `/editar-producto`, `/borrar-producto`, `/actualizar-foto`, `/cambiar-color`, `/publicar`) ready to use. Each skill ends by pushing to `main`. With auto-deploy not yet wired, Hector still has to run `npm run deploy` after the wife's pushes for changes to appear on the live site.

## Done

- [x] Initial Astro 5 + Tailwind v4 scaffold with content collections, cart, WhatsApp checkout flow (commit `7e39fec`).
- [x] Push to GitHub over SSH with noreply email author identity (`8771303+hecvasro@users.noreply.github.com`).
- [x] Cloudflare API token created with Pages/Account/User read + DNS edit + Zone read scopes, stored in `.envrc.local`.
- [x] direnv-based credential flow (`.envrc` loads `.env.local` + `.envrc.local`), documented in CLAUDE.md.
- [x] `wrangler` installed as devDep, `npm run deploy` / `npm run deploy:preview` scripts.
- [x] Cloudflare Pages project `saviacera` created, first deploy succeeded.
- [x] Custom domain `saviacera.com` attached (apex + `www`), CNAMEs created in Cloudflare-managed zone, certs issued and active (commit `e1c0e57`).
- [x] Wife-facing Spanish skills authored under `.claude/skills/`. CLAUDE.md documents skill design principles; README.md has a wife-facing "cómo administrar el sitio" section listing the slash commands.

## In-flight / decision needed

### Priority 1 — GitHub → Cloudflare Pages auto-deploy (one-time setup)

Once this is wired, `git push origin main` triggers a Cloudflare-side build + deploy, and the wife's skill workflow becomes truly end-to-end (no `npm run deploy` step needed). Until then, every wife-driven push still needs Hector to manually deploy.

Requires interactive OAuth in the dashboard (Cloudflare authorizes against GitHub), can't be done via API token alone. Full procedure is in CLAUDE.md → "Setting up GitHub auto-deploy". Summary:

1. Cloudflare Dashboard → `saviacera` Pages project → Settings → Builds & deployments → Connect to Git → authorize repo `hecvasro/saviacera`.
2. Configure build: framework `Astro`, build command `npm run build`, output `dist`, branch `main`, `NODE_VERSION=20`.
3. Set production env vars in the dashboard: `PUBLIC_ORDER_ENDPOINT`, `PUBLIC_WHATSAPP_NUMBER`, `NODE_VERSION`.

**Caveat**: production env vars then live in the Cloudflare dashboard, not `.env.local`. Keep them in sync mentally or treat the dashboard as canonical for production builds.

### Priority 2 — Wife setup (one-time per machine)

For the wife to actually use the skills:

1. Install Claude Code on her Mac.
2. Generate an SSH key on her machine and add it to her GitHub account (or use Hector's account for git access — TBD).
3. Grant her push access to `hecvasro/saviacera` (add as collaborator).
4. Clone the repo to her machine.
5. `npm install` (one time, so `npm run dev` works for local preview if she wants it).

Once auto-deploy (P1) is wired, she does **not** need `.envrc.local`, the Cloudflare token, or wrangler. Just git access + Claude Code.

### Priority 3 — `www` → apex redirect (canonical hardening)

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

- [ ] **Real product photos** to replace `picsum.photos` placeholders. Upload to `src/assets/products/<slug>/` and reference as relative paths in each `.md` (`/actualizar-foto` skill walks through this for the wife). Schema already supports both URL and local image refs.
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
