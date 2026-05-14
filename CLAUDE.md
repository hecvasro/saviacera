# Saviacera

Astro 5 + Tailwind v4 static site. Spanish (DR) primary, English wired up for later. Catalog + WhatsApp checkout (orders POST to a Google Apps Script Web App that appends to a sheet).

**Docs map**:

- [README.md](./README.md) — wife-facing how-to, in Spanish. Stack overview, "cómo agregar un producto", Apps Script + Sheet setup, etc.
- [THEMING.md](./THEMING.md) — wife-facing theming guide, in Spanish.
- [ROADMAP.md](./ROADMAP.md) — handoff doc: what's done, what's pending, what needs a decision. Read this first when picking up a session cold.
- [DECAP-SETUP.md](./DECAP-SETUP.md) — one-time Decap manual setup (GitHub App + Worker secrets + Cloudflare Access), in Spanish. Reference if any of those pieces need to be re-created or rotated.
- This file (CLAUDE.md) — technical/operating reference for Claude sessions: stack, deploy plumbing, credentials, conventions.

**Current state (2026-05-14)**:

- Site live at `https://saviacera.com` (apex canonical) and `https://www.saviacera.com`.
- Order flow live: cart → Apps Script `/exec` → Google Sheet row + WhatsApp deep link, all driven by build-time env vars in the Cloudflare dashboard.
- Decap CMS live and in testing at `https://saviacera.com/innh85dhz2/`. Wife is running smoke tests.
- GitHub → Workers Builds auto-deploy is live: push to `main` is the deploy.

**Content-management strategy** — two interfaces, same markdown files:

1. **Decap CMS (primary, for the non-technical owner) — live, in testing.** Web admin panel at `saviacera.com/innh85dhz2/` (obscured path). Auth is a **GitHub App bot proxy** in the Worker, gated by **Cloudflare Access** magic-link. The wife does **not** need a GitHub account and is **not** a repo collaborator — all writes are made by the App bot, with her email (from CF Access) annotated into the commit message body. Decap commits to `main`; GH auto-deploy fires; site updates. The schema in `src/content.config.ts` is structured for this (flat scalars, simple arrays, no relations). Architecture details in "Building Decap CMS" below; one-time setup procedure in DECAP-SETUP.md.
2. **Claude Code skills (for Hector, and as a fallback)** — six skills under `.claude/skills/` drive guided Spanish Q&A flows (`/agregar-producto`, `/editar-producto`, `/borrar-producto`, `/actualizar-foto`, `/cambiar-tema`, `/publicar`). Both interfaces edit the same files; they coexist as long as edits don't overlap in time.

**Long-term direction**: even simpler — products managed via **Google Sheets** with a build hook that pulls the sheet into the site. Lower urgency now that Decap is working. Open questions in ROADMAP.md → "Long-term direction".

## Stack

- Astro 5, static output (no SSR adapter). Build → `./dist/`.
- Tailwind v4 via `@tailwindcss/vite`.
- Content collections under `src/content/products/` (markdown).
- `prettier`, `eslint`, `astro check`.
- Node ≥ 20.

## Local dev

- `npm run dev` — astro dev server.
- `npm run build` — runs `astro check` then `astro build`. `dist/` is the deploy artifact.
- `npm run preview` — serve the built `dist/` locally.
- `npm run lint` / `npm run format` — eslint / prettier.

## Site env vars (Astro/Vite)

Public site env lives in `.env.local` (gitignored). Template in `.env.example`. Anything `PUBLIC_*` is exposed to the browser. Current keys:

- `PUBLIC_ORDER_ENDPOINT` — Google Apps Script Web App URL receiving orders.
- `PUBLIC_WHATSAPP_NUMBER` — `wa.me` deep-link target (digits only, country code first).

Apps Script source: `apps-script/Code.gs`. README has the sheet-setup steps.

## Deployment — Cloudflare Workers Static Assets

Production: **`https://saviacera.com`** (apex, canonical). Also serves at `https://www.saviacera.com`. The Workers default `saviacera.<account-subdomain>.workers.dev` URL works too but isn't user-facing. Worker name: `saviacera`. Production branch: `main`. Cloudflare account: `hecvasro` (`75ec2b0c985f290ad848d43116bc32e7`). Zone tag for `saviacera.com`: `e62d1de2811789a1d744737a22148b42`.

The deploy target is **Workers Static Assets**, not Cloudflare Pages. The site is purely static (`./dist` from `astro build`), so there's no `main` worker script — `wrangler.jsonc` only declares the assets binding. Configuration:

```jsonc
{
  "name": "saviacera",
  "compatibility_date": "2026-05-12",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page"
  }
}
```

### Deploy modes (current state: GitHub → Workers Builds auto-deploy is live; manual via wrangler is the fallback)

**Today (auto-deploy)**: every push to `main` triggers a Cloudflare Workers Builds run (`npm run build` → `npx wrangler deploy`) that publishes `./dist` to `saviacera.com`. No local tooling required — pushing **is** the deploy. Build vars (`PUBLIC_ORDER_ENDPOINT`, `PUBLIC_WHATSAPP_NUMBER`, `NODE_VERSION`) live in the Cloudflare dashboard (Workers & Pages → saviacera → Settings → Variables and Secrets / Build) and are the canonical source of truth for production builds. Local `.env.local` only affects `npm run dev` / `npm run build` on Hector's machine.

**Manual fallback** (for emergencies, or to preview a version without promoting it): two npm scripts read deploy creds from `.envrc.local` via direnv:

- `npm run deploy` — build + push to production. Updates `saviacera.com`. Useful when you need to deploy without going through GitHub (e.g. dashboard build is wedged).
- `npm run deploy:preview` — build + upload a new Worker **version** without promoting it to production (`wrangler versions upload`). Returns a preview URL for that version; production is unaffected until you `wrangler versions deploy` it.

Both run `astro check && astro build` first, then the wrangler step reads `wrangler.jsonc` and uploads `./dist`.

### How GitHub auto-deploy is set up (reference)

Done from the modern unified **Workers & Pages → saviacera → Settings → Builds** UI. Procedure:

1. Cloudflare Dashboard → **Workers & Pages** → `saviacera` Worker → **Settings** → **Builds** → **Connect**.
2. Authorize Cloudflare's GitHub app against `hecvasro/saviacera`. Choose "Only select repositories" → `saviacera`.
3. Configure the build:
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy` (the dashboard usually fills this in from `wrangler.jsonc`)
   - **Root directory**: `/` (default)
   - **Node version**: set via env var `NODE_VERSION=20` (or higher).
4. Set production build vars (Settings → Variables and Secrets / Build):
   - `PUBLIC_ORDER_ENDPOINT` = the deployed Apps Script `/exec` URL
   - `PUBLIC_WHATSAPP_NUMBER` = `18295286271` (or whatever the canonical number is)
   - `NODE_VERSION` = `20`
   These must be **build-time vars** (visible to `astro build`), not Worker runtime secrets, because `PUBLIC_*` is baked in at build time.
5. Save. The first auto-deploy fires on the next push to `main`.

### How credentials flow

`wrangler` reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from the shell environment. Two-file setup loaded by **direnv**:

```
.envrc                   # tracked. Loads the other two files.
.env.local               # gitignored. Astro/Vite site env (PUBLIC_*).
.envrc.local             # gitignored. Deploy secrets (Cloudflare token + account ID).
.envrc.local.example     # tracked. Template — copy + fill.
```

`.envrc` does:

```sh
dotenv_if_exists .env.local        # site env → also exported to shell
source_env_if_exists .envrc.local  # deploy secrets → shell only, never to Vite
```

Deploy secrets are deliberately in `.envrc.local` (not `.env.local`) so they never end up in `import.meta.env` during the Astro build.

**First-time setup on a new machine**:

1. `cp .envrc.local.example .envrc.local`, fill in the two values.
2. `direnv allow` once in the repo root.
3. `npm install`.
4. Verify: `npx wrangler whoami` should show account `hecvasro`.

### API token scopes (for rotation)

Token lives at https://dash.cloudflare.com/profile/api-tokens (Custom Token). The single token in `.envrc.local` is the source of truth for both wrangler and any direct API calls (`curl`-based DNS / Pages / zone management). Required scopes by category:

**Minimum — wrangler auth + Workers Static Assets deploy:**

- Account → Workers Scripts → **Edit** — deploy the Worker (assets-only), upload new versions.
- Account → Account Settings → **Read** — lets wrangler resolve the account from `CLOUDFLARE_ACCOUNT_ID`.
- User → Memberships → **Read** — lets `wrangler whoami` identify which account the user belongs to.

Legacy: the previous Pages-based setup also relied on `Account → Cloudflare Pages → Edit`. Now that deploy is via Workers, that scope is no longer required by the day-to-day deploy flow, but keeping it on the token lets you still manage the old Pages project (e.g. to detach Pages-side custom domains during the migration).

**Required for DNS / custom domain management:**

- Zone → DNS → **Edit** — manage DNS records in the `saviacera.com` zone. Note: Workers Custom Domains create their own DNS records automatically, so this scope is no longer load-bearing for routine custom-domain attachment, but it's still useful for ad-hoc records and for cleaning up CNAMEs left over from the Pages-era setup.
- Zone → Workers → **Edit** — required to attach a Worker Custom Domain via the API (the dashboard flow doesn't need this scope; only scripted attachment does).
- Zone → Zone → **Read** — list zones, look up `zone_tag` for a given hostname. Without this, `GET /zones?name=...` silently returns an empty array instead of an auth error, which is misleading.

**Optional:**

- User → User Details → Read — only makes `wrangler whoami` show your email; cosmetic.

**Resource scoping:**

- Account resources: `Include → Specific account → hecvasro`, **not** "All accounts".
- Zone resources: `Include → All zones from an account → hecvasro` is the simplest if you'll add more sites later. `Include → Specific zone → saviacera.com` is tighter if you want one-zone-per-token discipline.

**Gotcha — API silently filters, doesn't always error.** If the token lacks a read scope, list endpoints like `GET /zones?name=foo.com` return `{"result": []}` with `"success": true`. Empty results from a Cloudflare API list call are ambiguous: could mean "doesn't exist" or "you can't see it." For verification, also check public DNS (`dig +short NS foo.com`) — if it resolves to `*.ns.cloudflare.com`, the zone exists on someone's CF account regardless of what your token can see.

### Custom domains

The `saviacera.com` zone is registered through Cloudflare Registrar, so DNS is fully on Cloudflare. Both apex and `www` serve the live site with auto-issued/auto-renewed TLS certs (currently Google CA, HTTP-01 validation).

**Migration note (Pages → Workers Static Assets)**: under the old Pages setup the apex and `www` were attached as Pages custom domains with CNAMEs pointing at `saviacera.pages.dev`. After switching the deploy to Workers Static Assets (this commit), the existing Pages-side attachments need to be re-pointed at the Worker. The simplest path: in the dashboard, **Workers & Pages → saviacera (Worker) → Settings → Domains & Routes → Add Custom Domain** for both `saviacera.com` and `www.saviacera.com`. Cloudflare manages the underlying DNS records automatically for Workers Custom Domains — you don't create CNAMEs manually like with Pages. The TLS cert provisions on its own. While both old (Pages) and new (Worker) attachments exist simultaneously, traffic routes to whichever Cloudflare resolves first; remove the Pages attachments once the Worker ones go active.

**To attach a new custom domain post-migration** (e.g. a future subdomain):

```sh
# Workers Custom Domains: one API call. Cloudflare creates the DNS automatically.
# Requires Account → Workers Scripts → Edit and Zone → Workers → Edit on the token
# (a superset of what we have today — token scopes will need a refresh).
direnv exec . sh -c 'curl -s -X PUT -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"environment\":\"production\",\"hostname\":\"sub.saviacera.com\",\"service\":\"saviacera\",\"zone_id\":\"e62d1de2811789a1d744737a22148b42\"}" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains"'
```

Alternatively the modern declarative form is to add `routes` or `workers_custom_domains` entries in `wrangler.jsonc` and let `wrangler deploy` reconcile them. Either works; dashboard is simplest for one-off subdomains.

Validation typically takes 30–180s end-to-end. Until the hostname flips to `active`, the edge may serve HTTP 522 — expected, clears on its own.

### Working from Claude Code (non-interactive shells)

direnv's hook only fires in interactive shells. The Bash tool runs `zsh -c …` (non-interactive), so `.envrc` does **not** auto-load. **Always prefix wrangler/deploy commands with `direnv exec .`**:

```sh
direnv exec . npx wrangler whoami
direnv exec . npm run deploy
```

`direnv exec . <cmd>` loads `.envrc` for that one command's environment, exits cleanly. This is the canonical pattern — don't try to hook direnv into `~/.zshenv` to "fix" it for non-interactive shells.

## Content management — wife-facing skills

Six project-local skills in `.claude/skills/` drive guided Spanish Q&A flows for catalog tasks. Each skill is a directory with a `SKILL.md`. They become invocable as slash commands (`/agregar-producto`, etc.) the moment a fresh Claude Code session opens this repo.

| Slash command         | What it does                                                                 |
| --------------------- | ---------------------------------------------------------------------------- |
| `/agregar-producto`   | Guided creation of a new product `.md` file. Asks name, category, price, etc. in Spanish, validates each input, shows a preview, writes the file, and commits + pushes. |
| `/editar-producto`    | Locate an existing product, ask what to change, apply via `Edit`, commit + push. |
| `/borrar-producto`    | Offers two paths: despublish (`available: false`) or hard delete (`git rm`). Defaults to despublish. |
| `/actualizar-foto`    | Replace, add, remove, or reorder the `images:` array on a product.            |
| `/cambiar-tema`       | Walk through a `src/styles/tokens.css` change (color, font, radius, spacing, shadow). Adds Google Fonts `<link>` to `BaseLayout.astro` when font changes. Documents logo-font wiring path for future. |
| `/publicar`           | Inspect pending changes, commit, push. Fallback when a skill above left changes unpublished. |

Each skill ends by pushing to `main`. GitHub auto-deploy is configured, so the push **is** the deploy — no extra `npm run deploy` step needed after a skill-driven change.

**Skill design principles** (apply when adding or editing skills):

- **One question at a time.** Never bundle ("name, price, category?") — easier to lose track and harder for non-technical users.
- **Validate as you go.** Catch obvious errors (negative price, wrong category, malformed URL) immediately, with a friendly suggestion.
- **Show a preview before writing.** The user should see the final frontmatter before any file is touched.
- **Confirm before pushing.** Editing the file and pushing are two separate confirmation gates.
- **Spanish, warm tone.** The audience is a small-business owner, not a developer. Avoid jargon; explain when you must.
- **No surprise side effects.** Don't touch files outside the obvious scope. Don't reformat the whole frontmatter when only `priceDOP` changed — use `Edit` for the single field.

When updating skills, keep the SKILL.md description tight (one sentence in Spanish, with verbs that match how the user might phrase the request — "agregar producto", "subir un jabón", "nuevo kit", etc.). The description is what Claude uses to decide which skill matches a freeform request.

## Building Decap CMS — live, in testing

Decap is the **primary content-management interface for the non-technical owner**.

**Status**: shipped and in testing. The admin URL is intentionally obscured to `saviacera.com/innh85dhz2/` (10-char crypto-random suffix). The pivot from OAuth App to GitHub App bot proxy happened in commit `09b04ca`. If any of the dashboard-side pieces (GitHub App, Worker secrets, CF Access) need to be re-created or rotated, follow [DECAP-SETUP.md](./DECAP-SETUP.md).

### Architecture

Three layers of defense, all live:

1. **Obscure URL** `/innh85dhz2/` — filters bots / drive-by scanners. Not secret, but raises the bar above zero.
2. **Cloudflare Access** magic-link (one-time PIN to allow-listed emails) gates `/innh85dhz2/*`, `/api/auth*`, `/api/callback*`. Anonymous Internet traffic never reaches the Worker for those routes. Session duration: 30 days.
3. **GitHub App** (`Saviacera CMS`) installed only on `hecvasro/saviacera`, with `Contents: read/write` + `Metadata: read`. The Worker mints short-lived (~1h) installation tokens scoped to this one repo. The wife has no GitHub account and is not a repo collaborator — all writes go through the App bot.

The Worker (`worker/index.ts`) handles three routes; everything else falls through to `env.ASSETS.fetch(request)`:

- **`/api/auth`** — returns an HTML page that completes Decap's OAuth handshake protocol (`authorizing:github` echo → `authorization:github:success:<token>` postMessage). The "token" handed to Decap is just the CF Access JWT; Decap's stored token is meaningless to upstream GitHub because the proxy replaces it on every request anyway.
- **`/api/whoami`** — debug helper that echoes the CF Access email. Useful for smoke-testing the auth chain without involving GitHub.
- **`/api/github/*`** — proxies to `api.github.com`. Strips client `Authorization`, mints a fresh installation token via `signGithubAppJwt` + `getInstallationToken`, attaches it as `Bearer`. Whitelists only paths under `/repos/hecvasro/saviacera/*` (plus a synthesized response to `/user` so Decap can render an identity).

`wrangler.jsonc` declares `main: "./worker/index.ts"` plus the assets binding with `binding: "ASSETS"`. Because the static-asset binding short-circuits unmatched paths to the 404 page **before** invoking the Worker, `/api/*` is listed under `assets.run_worker_first` to force Worker-first routing for those paths. Without this, `/api/github/*` would 404 from the asset binding before reaching the proxy.

### Editor identity in commit history

Installation tokens commit as the App bot — git log would otherwise just say `saviacera-cms-bot[bot]` for every change, losing the human identity. To preserve who edited what, the proxy intercepts commit-producing requests (`PUT/DELETE /repos/.../contents/*` and `POST /repos/.../git/commits`), parses the JSON body, and appends `\n\nEditado por: <CF Access email> via Cloudflare Access` to the `message` field. The annotation is best-effort: if parsing fails the original body passes through unchanged (commit `c31414c`).

### Repo-permissions rewrite

GitHub returns `repo.permissions` based on the user identity behind the token. With an installation token there is no user, so GitHub returns `push: false / pull: false`, and Decap concludes "your account doesn't have access to this repo." The proxy rewrites the body of `GET /repos/hecvasro/saviacera` to advertise `push: true / pull: true`, matching the real installation permissions. Commit `5f2fc2d`.

### Required Worker secrets

Set in CF Dashboard → Workers & Pages → saviacera → Settings → Variables and Secrets. **Type: Secret**, not Plain text.

- `GITHUB_APP_ID` — the numeric App ID from the GitHub App settings page.
- `GITHUB_APP_INSTALLATION_ID` — numeric installation ID (visible in the install URL).
- `GITHUB_APP_PRIVATE_KEY` — PKCS#8 PEM. GitHub exports PKCS#1 (`-----BEGIN RSA PRIVATE KEY-----`); convert with `openssl pkcs8 -topk8 -nocrypt -in IN -out OUT` because Web Crypto in Workers only imports PKCS#8.

If any of these are missing or malformed, `/api/github/*` returns 500 / 502 and Decap fails to load the editor. The full first-time setup is in DECAP-SETUP.md.

### Admin layout

```
public/innh85dhz2/index.html   # Decap loader + auto-click of "Login with GitHub"
public/innh85dhz2/config.yml   # Decap schema (collections, fields, backend)
public/uploads/                # Image uploads land here, committed to git
worker/index.ts                # The auth + GitHub proxy
```

`config.yml` maps the Zod schema in `src/content.config.ts` to Decap fields. Schema is intentionally flat (scalars, simple lists, no relations) precisely to fit Decap's widget set. Update `config.yml` and `src/content.config.ts` in lockstep when the schema changes.

### Theme collection (planned polish, not built)

The next polish step is a `theme` files-collection so the wife can change fonts, colors, and logo through the same panel rather than via the `cambiar-tema` skill. Sketch:

```yaml
  - name: theme
    label: Tema visual
    files:
      - name: site
        label: Configuración del tema
        file: src/content/theme/site.json
        fields:
          - { name: fontDisplay, label: "Fuente de títulos",     widget: string, default: "Cormorant Garamond" }
          - { name: fontBody,    label: "Fuente del texto",      widget: string, default: "Inter" }
          - { name: fontLogo,    label: "Fuente del logo",       widget: string, required: false }
          - { name: colorAccent, label: "Color de acento",       widget: color }
          - { name: colorBackground, label: "Color de fondo",    widget: color }
          - { name: logoImage,   label: "Imagen del logo (opcional)", widget: image, required: false }
```

Wiring: a small Astro integration or pre-build script reads `src/content/theme/site.json` and writes `:root { --color-accent: …; --font-display: …; }` plus a Google Fonts `<link>` URL into `BaseLayout.astro`. If `logoImage` is set, `Header.astro` conditionally renders `<img>`; else falls back to wordmark text. Not blocking — pick up after wife signs off on the products workflow.

### Coexistence with skills

Both interfaces edit the same markdown files. Concurrent edits to the same product are the only real risk — `git pull --rebase` before any skill-driven edit handles 99% of it; practically the two humans coordinate verbally for the rest. Mention this when onboarding her.

## Repo conventions

- Single `main` branch. Commits authored as `hecvasro <8771303+hecvasro@users.noreply.github.com>` (GitHub noreply form — enforced by `~/.gitconfig` global, not repo-local).
- GitHub remote: `git@github.com:hecvasro/saviacera.git` over SSH.
- `dist/`, `.astro/`, `.wrangler/`, `node_modules/` all gitignored. So are all `.env*` and `.envrc.local`.
- `push.command` and `.push.log` at repo root are leftover scaffolding-sandbox helpers — leave them alone (untracked).
