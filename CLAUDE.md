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

Hosted at **`saviacera.pages.dev`** (custom domain `saviacera.do` not yet wired). Pages project name: `saviacera`. Production branch: `main`. Cloudflare account: `hecvasro` (`75ec2b0c985f290ad848d43116bc32e7`).

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

Token created at https://dash.cloudflare.com/profile/api-tokens (Custom Token). Required scopes:

- Account → Cloudflare Pages → **Edit**
- Account → Account Settings → **Read**
- User → Memberships → **Read**

Optional (just makes `wrangler whoami` show your email): User → User Details → Read.

Scope account resources to `hecvasro` only, not "All accounts".

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
