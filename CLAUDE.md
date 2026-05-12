# Saviacera

Astro 5 + Tailwind v4 static site. Spanish (DR) primary, English wired up for later. Catalog + WhatsApp checkout (orders POST to a Google Apps Script Web App that appends to a sheet).

**Docs map**:

- [README.md](./README.md) — wife-facing how-to, in Spanish. Stack overview, "cómo agregar un producto", Apps Script + Sheet setup, etc.
- [THEMING.md](./THEMING.md) — wife-facing theming guide, in Spanish.
- [ROADMAP.md](./ROADMAP.md) — handoff doc: what's done, what's pending, what needs a decision. Read this first when picking up a session cold.
- This file (CLAUDE.md) — technical/operating reference for Claude sessions: stack, deploy plumbing, credentials, conventions.

**Content-management strategy** — two interfaces, same markdown files:

1. **Decap CMS (primary, for the non-technical owner) — not yet built.** Web admin panel at `saviacera.com/admin/`. She logs in (GitHub OAuth, optionally fronted by Cloudflare Access magic link) and edits products through forms. Decap commits to `main`; GH auto-deploy fires; site updates. She doesn't install or learn any tooling. The schema in `src/content.config.ts` is structured for this (flat scalars, simple arrays, no relations). Implementation plan in "Building Decap" below.
2. **Claude Code skills (for Hector, and as a fallback)** — six skills under `.claude/skills/` drive guided Spanish Q&A flows (`/agregar-producto`, `/editar-producto`, `/borrar-producto`, `/actualizar-foto`, `/cambiar-tema`, `/publicar`). Both interfaces edit the same files; they coexist as long as edits don't overlap in time.

**Long-term direction**: even simpler — products managed via **Google Sheets** with a build hook that pulls the sheet into the site. Design not started; open questions in ROADMAP.md → "Long-term direction".

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

## Deployment — Cloudflare Pages

Production: **`https://saviacera.com`** (apex, canonical). Also serves at `https://www.saviacera.com`. Pages backend URL `saviacera.pages.dev` works too but isn't user-facing. Pages project name: `saviacera`. Production branch: `main`. Cloudflare account: `hecvasro` (`75ec2b0c985f290ad848d43116bc32e7`). Zone tag for `saviacera.com`: `e62d1de2811789a1d744737a22148b42`.

### Deploy modes (current state: manual direct-upload; auto-deploy pending)

**Today (manual)**: deploys happen via wrangler direct upload from a machine with the API token loaded. Two npm scripts:

- `npm run deploy` — build + push to production. Updates `saviacera.com`.
- `npm run deploy:preview` — build + push as a preview. Gets its own `<hash>.saviacera.pages.dev` URL, does not move production.

Both call `wrangler pages deploy ./dist --project-name=saviacera` under the hood.

**Planned (GitHub → Cloudflare Pages auto-deploy)**: connect the GitHub repo to the Pages project so every push to `main` triggers a Cloudflare-side build + deploy. This is the target state — it unblocks the wife-facing workflow (she just pushes; no wrangler, no token, no direnv). Setup procedure below.

### Setting up GitHub auto-deploy (one-time, user action)

This step requires interactive OAuth in the dashboard (Cloudflare needs to authorize against GitHub), so it can't be done end-to-end via API token. Procedure:

1. Cloudflare Dashboard → **Workers & Pages** → `saviacera` project → **Settings** → **Builds & deployments** → **Connect to Git**.
2. Authorize Cloudflare's GitHub app against `hecvasro/saviacera`. Choose "Only select repositories" → `saviacera`.
3. Configure the build:
   - **Production branch**: `main`
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (default)
   - **Node version**: set via env var `NODE_VERSION=20` (or higher).
4. Set production env vars (Settings → Environment variables, Production scope):
   - `PUBLIC_ORDER_ENDPOINT` = the deployed Apps Script `/exec` URL
   - `PUBLIC_WHATSAPP_NUMBER` = `18295286271` (or whatever the canonical number is)
   - `NODE_VERSION` = `20`
5. Save. The first auto-deploy fires on the next push to `main`.

**Important**: once auto-deploy is active, `.env.local` is no longer the source of truth for production builds — the Cloudflare dashboard env vars are. Local `.env.local` only affects `npm run dev` / `npm run build` on Hector's machine. Keep them in sync manually, or trust the dashboard as canonical.

**After this is set up**: the `npm run deploy` script becomes a fallback for emergency manual deploys. Day-to-day, push to `main` is the deploy.

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

**Minimum — wrangler auth + Pages deploy:**

- Account → Cloudflare Pages → **Edit** — create projects, deploy, attach custom domains.
- Account → Account Settings → **Read** — lets wrangler resolve the account from `CLOUDFLARE_ACCOUNT_ID`.
- User → Memberships → **Read** — lets `wrangler whoami` identify which account the user belongs to.

**Required for DNS / custom domain management:**

- Zone → DNS → **Edit** — create CNAMEs for Pages custom domains, manage records.
- Zone → Zone → **Read** — list zones, look up `zone_tag` for a given hostname. Without this, `GET /zones?name=...` silently returns an empty array instead of an auth error, which is misleading.

**Optional:**

- User → User Details → Read — only makes `wrangler whoami` show your email; cosmetic.

**Resource scoping:**

- Account resources: `Include → Specific account → hecvasro`, **not** "All accounts".
- Zone resources: `Include → All zones from an account → hecvasro` is the simplest if you'll add more sites later. `Include → Specific zone → saviacera.com` is tighter if you want one-zone-per-token discipline.

**Gotcha — API silently filters, doesn't always error.** If the token lacks a read scope, list endpoints like `GET /zones?name=foo.com` return `{"result": []}` with `"success": true`. Empty results from a Cloudflare API list call are ambiguous: could mean "doesn't exist" or "you can't see it." For verification, also check public DNS (`dig +short NS foo.com`) — if it resolves to `*.ns.cloudflare.com`, the zone exists on someone's CF account regardless of what your token can see.

### Custom domains

The `saviacera.com` zone is registered through Cloudflare Registrar, so DNS is fully on Cloudflare. Both apex and `www` are attached to the Pages project as CNAMEs (proxied / orange-cloud) pointing at `saviacera.pages.dev`. Cloudflare auto-issues + renews the TLS cert (currently Google CA, HTTP-01 validation).

Apex CNAME flattening is handled transparently by Cloudflare — we set a CNAME at the apex via the API and CF serves it as A/AAAA at query time.

**To attach a new custom domain** (e.g. a future subdomain):

```sh
# 1. Attach to the Pages project (Pages:Edit on token).
direnv exec . sh -c 'curl -s -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"sub.saviacera.com\"}" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/saviacera/domains"'

# 2. Create the DNS record (Zone:DNS:Edit on token).
direnv exec . sh -c 'curl -s -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"CNAME\",\"name\":\"sub\",\"content\":\"saviacera.pages.dev\",\"proxied\":true,\"ttl\":1}" \
  "https://api.cloudflare.com/client/v4/zones/e62d1de2811789a1d744737a22148b42/dns_records"'

# 3. Poll status until both validation_data.status and verification_data.status flip to "active":
direnv exec . sh -c 'curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/saviacera/domains"'
```

Validation typically takes 30–180s end-to-end. Until Pages flips the domain to `active`, the edge serves HTTP 522 (Cloudflare doesn't know which Pages project to route the hostname to yet) — this is expected and clears on its own.

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

Each skill ends by pushing to `main`. Once GitHub auto-deploy is set up (see "Setting up GitHub auto-deploy" above), the push **is** the deploy. Until then, Hector still needs to run `npm run deploy` after the wife's skill-driven changes — the `publicar` skill has a note about that and reads CLAUDE.md to decide what message to show the user.

**Skill design principles** (apply when adding or editing skills):

- **One question at a time.** Never bundle ("name, price, category?") — easier to lose track and harder for non-technical users.
- **Validate as you go.** Catch obvious errors (negative price, wrong category, malformed URL) immediately, with a friendly suggestion.
- **Show a preview before writing.** The user should see the final frontmatter before any file is touched.
- **Confirm before pushing.** Editing the file and pushing are two separate confirmation gates.
- **Spanish, warm tone.** The audience is a small-business owner, not a developer. Avoid jargon; explain when you must.
- **No surprise side effects.** Don't touch files outside the obvious scope. Don't reformat the whole frontmatter when only `priceDOP` changed — use `Edit` for the single field.

When updating skills, keep the SKILL.md description tight (one sentence in Spanish, with verbs that match how the user might phrase the request — "agregar producto", "subir un jabón", "nuevo kit", etc.). The description is what Claude uses to decide which skill matches a freeform request.

## Building Decap CMS (planned, not yet implemented)

Decap is the **primary content-management interface for the non-technical owner**. Status: not built yet. This section is the implementation plan for the session that builds it.

### Architecture

Decap is a single-page React app loaded from a CDN. It lives at `/admin/` on the site, reads `/admin/config.yml`, and commits content changes directly to git through a backend (GitHub OAuth is the simplest). No server, no database.

```
public/admin/index.html        # Two-line file: loads Decap from CDN.
public/admin/config.yml        # The CMS schema — collections, fields, auth backend.
public/uploads/                # Decap-managed image uploads (committed to git).
```

### Auth

**Recommended**: GitHub OAuth via the **Decap GitHub backend**. Requires:

1. A GitHub OAuth App. Cloudflare provides a free OAuth proxy for Decap via Cloudflare Pages Functions (alternative to running your own — Decap docs link the example).
2. The owner has a GitHub account and is added as a **collaborator with write access** to `hecvasro/saviacera`. That collaborator membership is the only authorization gate — Decap delegates entirely to GitHub.
3. Optional extra layer: **Cloudflare Access** in front of `/admin/*`. Free for ≤50 users. Magic-link to email. Filters out drive-by traffic before even reaching the GitHub login.

The combination = the "password protection" mentioned in conversation: email-magic-link to reach `/admin/`, then GitHub OAuth to authenticate the actual edit session.

### Collections to define

Map the Zod schema in `src/content.config.ts` to Decap. The current schema is intentionally flat for this:

```yaml
collections:
  - name: products
    label: Productos
    folder: src/content/products
    format: yaml-frontmatter
    create: true
    slug: '{{slug}}'                       # filename = slug (Astro convention)
    fields:
      - { name: name,        label: Nombre,        widget: string }
      - { name: tagline,     label: Frase corta,   widget: string, required: false }
      - { name: description, label: Descripción,   widget: text }
      - name: category
        label: Categoría
        widget: select
        options: [velas, jabones, kits]
      - { name: tags,        label: Etiquetas,     widget: list, required: false }
      - { name: priceDOP,    label: Precio (DOP),  widget: number, value_type: int, min: 0 }
      - { name: sku,         label: SKU,           widget: string, required: false }
      - { name: stock,       label: Inventario,    widget: number, value_type: int, min: 0, required: false }
      - { name: available,   label: Disponible,    widget: boolean, default: true }
      - name: images
        label: Fotos
        widget: list
        field: { name: image, label: Imagen, widget: image }
      - name: includes
        label: "Incluye (solo kits)"
        widget: list
        required: false
        field: { name: item, label: Item, widget: string }
      - name: details
        label: Detalles
        widget: list
        required: false
        field: { name: detail, label: Detalle, widget: string }
      - { name: featured,    label: Destacado,     widget: boolean, default: false }
      - { name: order,       label: Orden,         widget: number, value_type: int, default: 100 }
      - { name: createdAt,   label: Fecha,         widget: datetime, required: false }
      - { name: body,        label: Texto largo,   widget: markdown }
```

### Theme/config collection (for fonts + colors via Decap)

A second collection for site-wide theme settings. Single-file collection backed by a JSON or YAML config that the build reads at build time and injects into `tokens.css` (or as inline CSS variables in `BaseLayout.astro`):

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
          # ... etc per the tokens.css palette
          - { name: logoImage,   label: "Imagen del logo (opcional)", widget: image, required: false }
```

Build wiring: a small Astro integration or pre-build script reads `src/content/theme/site.json` and writes the relevant `:root { --color-accent: …; --font-display: …; }` overrides. The Google Fonts `<link>` in `BaseLayout.astro` becomes a template that fills in the chosen `fontDisplay` and `fontBody` names. If `logoImage` is set, `Header.astro` renders the `<img>`; otherwise it renders the wordmark text.

This means **she changes a font from a dropdown / text field in Decap, and the site picks it up** without anyone touching tokens.css.

### Logo handling

The current Header renders the wordmark as text. Two future states (the `cambiar-tema` skill documents both for the owner):

- **Wordmark only**: text in `--font-display` (today) or `--font-logo` if separated.
- **Image logo**: an SVG/PNG in `public/logo.svg` (or uploaded via Decap to `public/uploads/`). `Header.astro` conditionally renders `<img src={logoImage} alt="Saviacera" />` when set, otherwise falls back to text.

Either works. Keep both code paths so it's an asset decision, not a code change.

### Order of operations when building Decap

1. **Wire GH→CF auto-deploy first** (ROADMAP P1). Without it Decap commits go nowhere visible.
2. Create the GitHub OAuth App + the auth proxy (either via Cloudflare Pages Functions example or a hosted service).
3. Add `public/admin/index.html` + `public/admin/config.yml` with the products collection only. Smoke-test add-a-product end to end.
4. Add the `theme` collection + build wiring. Smoke-test font change end to end.
5. (Optional) Put Cloudflare Access in front of `/admin/*` with magic-link to the owner's email.
6. Onboard the owner: add as repo collaborator, send her the `/admin/` URL.
7. Update CLAUDE.md + README.md to mark Decap as "active" (replacing "próximamente").

### Coexistence with skills

Both interfaces edit the same markdown files. The risk is concurrent edits to the same product — git pull-before-edit handles 99% of it, but practically the two humans should coordinate ("I'm editing the cart kit, hands off for 10 min"). Worth flagging in the wife-onboarding chat.

## Repo conventions

- Single `main` branch. Commits authored as `hecvasro <8771303+hecvasro@users.noreply.github.com>` (GitHub noreply form — enforced by `~/.gitconfig` global, not repo-local).
- GitHub remote: `git@github.com:hecvasro/saviacera.git` over SSH.
- `dist/`, `.astro/`, `.wrangler/`, `node_modules/` all gitignored. So are all `.env*` and `.envrc.local`.
- `push.command` and `.push.log` at repo root are leftover scaffolding-sandbox helpers — leave them alone (untracked).
