/// <reference types="@cloudflare/workers-types" />

/**
 * Saviacera Worker — GitHub App proxy for Decap CMS + static-asset fallthrough.
 *
 * Architecture (replaces the old OAuth App flow):
 *
 *   Browser (Decap) ─→ /api/auth        ─→ Worker returns a fake-token HTML
 *                                          handshake page (the "token" is just
 *                                          the CF Access JWT, used so Decap
 *                                          has *something* to put on Bearer
 *                                          headers — our proxy ignores it).
 *   Browser (Decap) ─→ /api/github/*    ─→ Worker mints a short-lived GitHub
 *                                          App installation token and proxies
 *                                          the request to api.github.com.
 *   Browser (other) ─→ /everything-else ─→ env.ASSETS.fetch(request) (static).
 *
 * Why GitHub App and not OAuth App or PAT:
 *   - The App is installed ONLY on hecvasro/saviacera. The mint endpoint
 *     refuses to issue tokens for any other repo, so even a worst-case leak
 *     of the private key only affects this one repo.
 *   - Installation tokens auto-expire after ~1 hour. No manual rotation.
 *   - No personal GitHub credentials (Hector's or María's) ever enter the
 *     system. The wife doesn't even need a GitHub account.
 *
 * The /api/* paths are protected by Cloudflare Access, so anonymous Internet
 * traffic never reaches this Worker for those routes. That gives us a clean
 * defense-in-depth model:
 *   Layer 1: obscure URL /innh85dhz2/   (filters bots)
 *   Layer 2: Cloudflare Access magic-link to wife/husband email (only humans)
 *   Layer 3: GitHub App installation scope (only this repo)
 *
 * Secrets (Worker Variables and Secrets in the CF dashboard):
 *   - GITHUB_APP_ID             — public-ish App ID (e.g. "3713303")
 *   - GITHUB_APP_INSTALLATION_ID — public-ish installation ID
 *   - GITHUB_APP_PRIVATE_KEY    — PKCS#8 PEM (the PRIVATE KEY format, not
 *                                  RSA PRIVATE KEY). Converted from GitHub's
 *                                  PKCS#1 export with:
 *                                    openssl pkcs8 -topk8 -nocrypt -in IN -out OUT
 */

export interface Env {
  ASSETS: Fetcher;
  GITHUB_APP_ID?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
}

const REPO_OWNER = "hecvasro";
const REPO_NAME = "saviacera";
const REPO_PATH_PREFIX = `/repos/${REPO_OWNER}/${REPO_NAME}`;

/* -------------------------------------------------------------------------- */
/*  Top-level router                                                          */
/* -------------------------------------------------------------------------- */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth") {
      return handleAuthHandshake(request);
    }
    if (url.pathname === "/api/whoami") {
      return handleWhoami(request);
    }
    if (url.pathname.startsWith("/api/github/")) {
      return handleGithubProxy(request, env, url);
    }
    if (url.pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};

/* -------------------------------------------------------------------------- */
/*  /api/auth — Decap login handshake                                         */
/* -------------------------------------------------------------------------- */

/**
 * Decap CMS opens this URL in a popup and expects a postMessage of the form
 *   "authorization:github:success:<JSON body>"
 * containing a token. With the bot-proxy architecture, Decap's stored token
 * is meaningless to the actual GitHub API — our /api/github/* proxy replaces
 * it with the real installation token before forwarding upstream. But Decap
 * still needs *some* string to put on Bearer headers, so we hand it the
 * Cloudflare Access JWT (already in the request headers) which is at least
 * tied to the authenticated user.
 */
function handleAuthHandshake(request: Request): Response {
  const accessJwt =
    request.headers.get("Cf-Access-Jwt-Assertion") ?? "cf-access-session";
  const payload = { token: accessJwt, provider: "github" };
  const safe = JSON.stringify(payload).replace(/</g, "\\u003c");
  const successBody = `authorization:github:success:${safe}`;
  const successBodyJs = JSON.stringify(successBody);

  // Decap's GitHub OAuth handshake protocol (see decap-cms-lib-auth):
  //   1. Popup ─→ opener: "authorizing:github"
  //   2. opener ─→ popup: "authorizing:github" (echo, confirms it's listening)
  //   3. Popup ─→ opener: "authorization:github:success:<JSON>" with the token
  //   4. Popup closes itself
  //
  // Sending the success message BEFORE the opener has echoed loses it: Decap
  // doesn't start its postMessage listener until after the popup announces
  // itself. We poll-announce every 100ms until we get the echo, in case the
  // popup loads faster than Decap can install its listener.
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Saviacera CMS — autenticando…</title>
  <meta name="robots" content="noindex" />
  <style>
    html, body { height: 100%; margin: 0; }
    body { font-family: -apple-system, system-ui, sans-serif;
           display: flex; align-items: center; justify-content: center;
           color: #2c2a26; background: #f6f4ed; }
    .box { text-align: center; max-width: 28rem; padding: 1.5rem; }
    .status { font-size: 0.95rem; color: #6b665d; }
  </style>
</head>
<body>
  <div class="box">
    <p>Autenticando…</p>
    <p class="status">Esta ventana se cierra sola.</p>
  </div>
  <script>
    (function () {
      if (!window.opener) {
        document.querySelector(".status").textContent =
          "Esta página debe abrirse desde Decap. Cierra y reintenta.";
        return;
      }
      var successBody = ${successBodyJs};
      var ready = "authorizing:github";
      var announced = false;
      var pollInterval = null;

      function sendReady() {
        window.opener.postMessage(ready, "*");
      }

      function listen(e) {
        if (typeof e.data !== "string") return;
        if (e.data !== ready) return;
        // Decap echoed back; it's now listening for the success message.
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        window.removeEventListener("message", listen, false);
        window.opener.postMessage(successBody, "*");
        setTimeout(function () { window.close(); }, 500);
      }

      window.addEventListener("message", listen, false);
      // Announce immediately, then poll every 100ms until echo (max ~5s).
      sendReady();
      var ticks = 0;
      pollInterval = setInterval(function () {
        ticks++;
        if (ticks > 50) {
          clearInterval(pollInterval);
          document.querySelector(".status").textContent =
            "Decap no respondió. Cierra esta ventana y reintenta.";
          return;
        }
        sendReady();
      }, 100);
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/* -------------------------------------------------------------------------- */
/*  /api/whoami — debug helper                                                */
/* -------------------------------------------------------------------------- */

/**
 * Returns the email of the user that came through Cloudflare Access, plus a
 * confirmation that the API surface is reachable. Useful for smoke-testing
 * without touching GitHub at all.
 */
function handleWhoami(request: Request): Response {
  const email =
    request.headers.get("Cf-Access-Authenticated-User-Email") ?? null;
  return new Response(
    JSON.stringify(
      { ok: true, email, time: new Date().toISOString() },
      null,
      2,
    ),
    {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}

/* -------------------------------------------------------------------------- */
/*  /api/github/* — proxy with installation token                             */
/* -------------------------------------------------------------------------- */

async function handleGithubProxy(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (
    !env.GITHUB_APP_ID ||
    !env.GITHUB_APP_INSTALLATION_ID ||
    !env.GITHUB_APP_PRIVATE_KEY
  ) {
    return new Response(
      "GitHub App credentials not configured. Check Worker variables.",
      { status: 500 },
    );
  }

  // Strip "/api/github" from the path; the rest is what we send upstream.
  const upstreamPath = url.pathname.replace(/^\/api\/github/, "");

  // Decap fetches /user immediately after login to render the editor's
  // identity. Installation tokens can't access /user, so we synthesize a
  // safe placeholder. The real authenticated identity is the CF Access
  // email; surface it as `name` so it appears in Decap's top-right corner.
  if (upstreamPath === "/user") {
    const email =
      request.headers.get("Cf-Access-Authenticated-User-Email") ?? "cms-bot";
    return jsonResponse({
      login: "saviacera-cms-bot[bot]",
      name: email,
      email,
      avatar_url: "https://saviacera.com/favicon.svg",
      type: "Bot",
    });
  }

  // Allow only paths that target the saviacera repo. Defense-in-depth: the
  // installation token is already scoped to this repo by GitHub, but blocking
  // unknown paths reduces the surface area in case of bugs or unexpected
  // Decap behavior.
  if (
    !upstreamPath.startsWith(REPO_PATH_PREFIX + "/") &&
    upstreamPath !== REPO_PATH_PREFIX
  ) {
    return new Response(
      `Forbidden: proxy only allows /repos/${REPO_OWNER}/${REPO_NAME}/* and /user. Got: ${upstreamPath}`,
      { status: 403 },
    );
  }

  // Mint a fresh installation token. (For now, no caching — admin traffic is
  // low and minting is ~200ms. If this becomes hot, cache via module-level
  // variable with expiry awareness, or move to Cache API.)
  let installationToken: string;
  try {
    installationToken = await getInstallationToken(env);
  } catch (err) {
    return new Response(
      `Failed to mint installation token: ${String(err)}`,
      { status: 502 },
    );
  }

  // Build upstream URL.
  const upstreamUrl = new URL(upstreamPath + url.search, "https://api.github.com");

  // Forward headers, but strip ones that shouldn't cross the boundary.
  const headers = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const lower = k.toLowerCase();
    if (
      lower === "host" ||
      lower === "cookie" ||
      lower === "authorization" ||
      lower.startsWith("cf-") ||
      lower === "x-real-ip" ||
      lower === "x-forwarded-for" ||
      lower === "x-forwarded-proto"
    ) {
      continue;
    }
    headers.set(k, v);
  }
  headers.set("Authorization", `Bearer ${installationToken}`);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("User-Agent", "saviacera-cms-proxy");
  headers.set("X-GitHub-Api-Version", "2022-11-28");

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  const upstream = await fetch(upstreamUrl.toString(), {
    method,
    headers,
    body,
  });

  // Stream the upstream response back. Strip hop-by-hop headers.
  const outHeaders = new Headers();
  for (const [k, v] of upstream.headers.entries()) {
    const lower = k.toLowerCase();
    if (lower === "content-encoding" || lower === "transfer-encoding") continue;
    outHeaders.set(k, v);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/* -------------------------------------------------------------------------- */
/*  GitHub App JWT + installation token mint                                  */
/* -------------------------------------------------------------------------- */

let cachedPrivateKey: CryptoKey | null = null;

async function getInstallationToken(env: Env): Promise<string> {
  const jwt = await signGithubAppJwt(env);

  const resp = await fetch(
    `https://api.github.com/app/installations/${env.GITHUB_APP_INSTALLATION_ID}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "saviacera-cms-proxy",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`installations/access_tokens returned ${resp.status}: ${text}`);
  }

  const data = (await resp.json()) as { token?: string };
  if (!data.token) {
    throw new Error("installations/access_tokens response missing 'token'");
  }
  return data.token;
}

async function signGithubAppJwt(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(
    new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
  );
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        // Clock-skew tolerance: GitHub recommends iat 60s in the past.
        iat: now - 60,
        // Max GitHub allows is 10 min; we use 9 to be safe.
        exp: now + 540,
        iss: env.GITHUB_APP_ID,
      }),
    ),
  );
  const message = `${header}.${payload}`;

  if (!cachedPrivateKey) {
    cachedPrivateKey = await importRsaPrivateKey(env.GITHUB_APP_PRIVATE_KEY!);
  }

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cachedPrivateKey,
    new TextEncoder().encode(message),
  );
  return `${message}.${b64url(new Uint8Array(sig))}`;
}

async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
