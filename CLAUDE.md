# Saviacera

Astro 5 + Tailwind v4 static site. Spanish (DR) primary, English wired up for later. Catalog + WhatsApp checkout (orders POST to a Google Apps Script Web App that appends to a sheet).

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

### Deploy commands

- `npm run deploy` — build + push to production. Updates `saviacera.pages.dev`.
- `npm run deploy:preview` — build + push as a preview. Gets its own `<hash>.saviacera.pages.dev` URL, does not move production.

Both scripts call `wrangler pages deploy ./dist --project-name=saviacera` under the hood (with/without `--branch=main`).

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

## Repo conventions

- Single `main` branch. Commits authored as `hecvasro <8771303+hecvasro@users.noreply.github.com>` (GitHub noreply form — enforced by `~/.gitconfig` global, not repo-local).
- GitHub remote: `git@github.com:hecvasro/saviacera.git` over SSH.
- `dist/`, `.astro/`, `.wrangler/`, `node_modules/` all gitignored. So are all `.env*` and `.envrc.local`.
- `push.command` and `.push.log` at repo root are leftover scaffolding-sandbox helpers — leave them alone (untracked).
