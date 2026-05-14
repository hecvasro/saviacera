/// <reference types="@cloudflare/workers-types" />

/**
 * Saviacera Worker — OAuth proxy for Decap CMS + static-asset fallthrough.
 *
 * Routes:
 *   GET /api/auth        — Start OAuth flow. Redirects to GitHub with CSRF state.
 *   GET /api/callback    — GitHub redirects here with `code`. We exchange it for
 *                          a user access token, then return an HTML page that
 *                          posts the token back to the Decap admin window via
 *                          window.opener.postMessage (the protocol Decap expects).
 *
 *   Everything else      — Falls through to the static-asset binding (./dist).
 *
 * Secrets (set via `wrangler secret put` or the CF dashboard under the Worker's
 * "Variables and Secrets" panel — NOT in this file, NOT in `.env.local`):
 *   GITHUB_CLIENT_ID     — OAuth App's client ID. Public-ish, but easier to
 *                          rotate alongside the secret if it's a secret too.
 *   GITHUB_CLIENT_SECRET — OAuth App's client secret. Never expose.
 *
 * CSRF protection: a one-time `state` cookie is set on /api/auth and verified
 * on /api/callback. Prevents an attacker from tricking the user's browser into
 * completing an OAuth flow they didn't initiate.
 */

export interface Env {
  ASSETS: Fetcher;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

const SITE_ORIGIN = "https://saviacera.com";
// GitHub returns the user a token with the OAuth App's configured scopes. The
// wife's GitHub account is only a collaborator on `hecvasro/saviacera`, so the
// blast radius of this token is naturally limited to that one repo even though
// the scope literal is broad. (Decap requires `repo` to read+write content.)
const OAUTH_SCOPE = "repo";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth") {
      return handleAuthStart(env);
    }
    if (url.pathname === "/api/callback") {
      return handleAuthCallback(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

/* -------------------------------------------------------------------------- */
/*  /api/auth                                                                 */
/* -------------------------------------------------------------------------- */

function handleAuthStart(env: Env): Response {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response(
      "GITHUB_CLIENT_ID is not configured on the Worker. " +
        "Set it via Cloudflare → Workers → saviacera → Variables and Secrets.",
      { status: 500 },
    );
  }

  // 128-bit CSRF state, kept in a short-lived HttpOnly cookie.
  const state = crypto.randomUUID();

  const redirectUri = `${SITE_ORIGIN}/api/callback`;
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: OAUTH_SCOPE,
    state,
    allow_signup: "false",
  });

  const headers = new Headers();
  headers.set(
    "Location",
    `https://github.com/login/oauth/authorize?${params.toString()}`,
  );
  headers.append(
    "Set-Cookie",
    `decap_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; ` +
      `Path=/api; Max-Age=600`,
  );
  return new Response(null, { status: 302, headers });
}

/* -------------------------------------------------------------------------- */
/*  /api/callback                                                             */
/* -------------------------------------------------------------------------- */

async function handleAuthCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("OAuth proxy is not configured.", { status: 500 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return decapResponseHtml("error", {
      message: `GitHub returned an error: ${error}`,
    });
  }
  if (!code || !state) {
    return new Response("Missing code or state.", { status: 400 });
  }

  // Verify CSRF state cookie.
  const cookieState = parseCookie(
    request.headers.get("Cookie"),
    "decap_oauth_state",
  );
  if (!cookieState || cookieState !== state) {
    return decapResponseHtml("error", {
      message: "CSRF state mismatch. Try logging in again.",
    });
  }

  // Exchange the code for an access token.
  let tokenJson: { access_token?: string; error?: string };
  try {
    const tokenResp = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "saviacera-decap-oauth-proxy",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    );
    tokenJson = (await tokenResp.json()) as typeof tokenJson;
  } catch (err) {
    return decapResponseHtml("error", {
      message: `Token exchange failed: ${String(err)}`,
    });
  }

  if (!tokenJson.access_token) {
    return decapResponseHtml("error", {
      message: tokenJson.error || "GitHub did not return an access token.",
    });
  }

  // Hand the token back to the Decap admin window via the postMessage protocol
  // Decap CMS expects (see decap-cms-lib-auth).
  return decapResponseHtml("success", {
    token: tokenJson.access_token,
    provider: "github",
  });
}

/* -------------------------------------------------------------------------- */
/*  postMessage handshake page                                                */
/* -------------------------------------------------------------------------- */

type DecapPayload =
  | { token: string; provider: "github" }
  | { message: string };

/**
 * Build the HTML page that talks to the opener window (Decap CMS) via
 * window.postMessage. Decap's auth lib (decap-cms-lib-auth) listens for a
 * message body of the form:
 *
 *   "authorization:<provider>:<status>:<json>"
 *
 * where status is "success" or "error". The opener also sends back an
 * "authorizing:<provider>" probe — we wait for that before posting, to make
 * sure Decap is ready.
 */
function decapResponseHtml(
  status: "success" | "error",
  payload: DecapPayload,
): Response {
  // SECURITY: payload is serialized into an inline script. Sanitize hard.
  // The fields we serialize are constrained (access_token from GitHub, plus
  // our own error strings), but defense-in-depth: refuse anything weird and
  // escape script-closing sequences.
  const safe = JSON.stringify(payload).replace(/</g, "\\u003c");
  const body = `authorization:github:${status}:${safe}`;
  // Embed `body` via JSON.stringify so it round-trips safely as a JS literal.
  const bodyJs = JSON.stringify(body);

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Saviacera CMS — autenticando…</title>
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
    <p>Autenticando con GitHub…</p>
    <p class="status">Esta ventana se cierra sola.</p>
  </div>
  <script>
    (function () {
      var body = ${bodyJs};
      function send() {
        if (!window.opener) return;
        window.opener.postMessage(body, "*");
      }
      // Decap probes with "authorizing:github" — reply when we hear it.
      function listen(e) {
        if (typeof e.data !== "string") return;
        if (e.data.indexOf("authorizing:github") !== 0) return;
        send();
        window.removeEventListener("message", listen, false);
        setTimeout(function () { window.close(); }, 250);
      }
      window.addEventListener("message", listen, false);
      // Belt-and-suspenders: also post immediately in case the opener is ready.
      send();
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: status === "success" ? 200 : 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Drop the CSRF cookie now that it's used.
      "Set-Cookie":
        "decap_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0",
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Cookie helper                                                             */
/* -------------------------------------------------------------------------- */

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
