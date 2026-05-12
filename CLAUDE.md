# Saviacera

Astro 5 + Tailwind v4 static site. Spanish (DR) primary, English wired up for later. Catalog + WhatsApp checkout (orders POST to a Google Apps Script Web App that appends to a sheet).

**Docs map**:

- [README.md](./README.md) — wife-facing how-to, in Spanish. Stack overview, "cómo agregar un producto", Apps Script + Sheet setup, etc.
- [THEMING.md](./THEMING.md) — wife-facing theming guide, in Spanish.
- [ROADMAP.md](./ROADMAP.md) — handoff doc: what's done, what's pending, what needs a decision. Read this first when picking up a session cold.
- This file (CLAUDE.md) — technical/operating reference for Claude sessions: stack, deploy plumbing, credentials, conventions.

**Content-management strategy**: products are markdown files (Astro content collections). The non-technical owner (Hector's wife) doesn't edit files directly — instead she **uses Claude Code as the interface**. Six project-local skills in `.claude/skills/` drive guided Q&A flows in Spanish for each common task (`/agregar-producto`, `/editar-producto`, `/borrar-producto`, `/actualizar-foto`, `/cambiar-color`, `/publicar`). When she's done with a task, the skill commits + pushes; Cloudflare Pages auto-deploys on push to `main` (see "Deployment" below). She never touches wrangler, the API token, or `.envrc.local`.

**Alternative considered, not chosen**: Decap CMS (free static admin panel that commits to git). The schema in `src/content.config.ts` is intentionally Decap-friendly (flat scalars, simple arrays, no relations) so this remains a viable fallback if the Claude-as-interface approach doesn't fit. If Decap is added later, see "Alternative: Decap CMS path" below.

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
| `/cambiar-color`      | Walk through a `src/styles/tokens.css` change (color, font, radius, spacing). Adds Google Fonts `<link>` to `BaseLayout.astro` when font changes. |
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

## Alternative: Decap CMS path (not active)

The current direction is Claude-as-interface (skills above). If that ever feels wrong — e.g. the wife prefers a structured form over conversation, or there are multiple non-technical editors — Decap CMS is the documented fallback. Decap is a static admin panel that runs at `/admin/` and commits directly to the git repo. Free, no server, no DB.

To enable Decap later:

1. Install: `npm i -D decap-cms-app` (or use the CDN-hosted version — one HTML file).
2. Create `public/admin/index.html` and `public/admin/config.yml`. The `config.yml` maps the Zod schema in `src/content.config.ts` to Decap's collection format. The schema was designed for this — flat scalars, simple arrays, no relations.
3. Auth: GitHub OAuth via Cloudflare Pages Functions, or Netlify Identity (free), or the simpler "git-gateway" approach.
4. Result: wife opens `https://saviacera.com/admin/`, logs in, fills a form per product. Decap commits to `main` → auto-deploy fires → site updates.

The Claude-driven and Decap paths are **not mutually exclusive** — both edit the same markdown files. But running both invites confusion (which is canonical when they're edited in different ways minutes apart?), so commit to one.

## Repo conventions

- Single `main` branch. Commits authored as `hecvasro <8771303+hecvasro@users.noreply.github.com>` (GitHub noreply form — enforced by `~/.gitconfig` global, not repo-local).
- GitHub remote: `git@github.com:hecvasro/saviacera.git` over SSH.
- `dist/`, `.astro/`, `.wrangler/`, `node_modules/` all gitignored. So are all `.env*` and `.envrc.local`.
- `push.command` and `.push.log` at repo root are leftover scaffolding-sandbox helpers — leave them alone (untracked).
