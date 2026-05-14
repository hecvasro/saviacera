# Decap CMS — pasos de configuración manual

> Documento operativo para habilitar (o re-habilitar) el panel admin para tu
> esposa. El código (Worker proxy en `worker/index.ts`, bootstrap admin en
> `public/innh85dhz2/index.html`, schema en `public/innh85dhz2/config.yml`)
> ya está en el repo. Lo que falta son acciones que se hacen en las UIs de
> GitHub y Cloudflare, y que yo no puedo hacer por ti.

**URL admin**: `https://saviacera.com/innh85dhz2/`
(`innh85dhz2` es el sufijo random para ofuscar el panel — no es secreto,
pero filtra bots y curiosos.)

**Modelo de auth (importante leer antes de seguir):**

El sitio **no usa GitHub OAuth App**. Usa una **GitHub App** instalada sólo en
el repo `hecvasro/saviacera`, y el Worker actúa como **proxy bot**: cada
request del CMS al API de GitHub pasa por nuestro Worker, que monta un token
de instalación efímero (válido ~1 hora) y lo manda upstream con la
identidad de la App, no del usuario.

Consecuencias prácticas:

- **Tu esposa NO necesita cuenta de GitHub.**
- **Tu esposa NO se agrega como colaboradora del repo.**
- La identidad real de quien edita la captura Cloudflare Access (magic-link
  a su email) y queda anotada al final del mensaje de cada commit
  (`Editado por: maria@... via Cloudflare Access`).
- Si la clave privada de la App se filtra, sólo afecta a este repo (la App
  está scoped a `hecvasro/saviacera`).

---

## Qué necesitas

1. **Crear una GitHub App** y instalarla en `hecvasro/saviacera`.
2. **Generar y convertir la clave privada** a formato PKCS#8.
3. **Configurar 3 secretos** en el Worker (`GITHUB_APP_ID`,
   `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`).
4. **Configurar Cloudflare Access** (magic-link) sobre `/innh85dhz2/*`,
   `/api/auth*`, `/api/callback*`.
5. **Smoke test**.

Tiempo estimado primera vez: ~25 minutos.

---

## 1. Crear la GitHub App

Una vez por proyecto. Vives en `https://github.com/settings/apps`.

1. Ve a <https://github.com/settings/apps> → **New GitHub App**.
2. Llena el formulario:
   - **GitHub App name**: `Saviacera CMS`
   - **Homepage URL**: `https://saviacera.com`
   - **Webhook**: desmarca **Active** (no usamos webhooks).
   - **Repository permissions**:
     - **Contents**: `Read and write` — necesario para que Decap pueda crear
       commits y subir imágenes.
     - **Metadata**: `Read-only` (se marca solo al pedir Contents).
     - El resto: `No access`. Cuanto más estrecho, mejor.
   - **Account permissions**: todo `No access`.
   - **Where can this GitHub App be installed?**: **Only on this account**.
3. Click **Create GitHub App**.
4. En la pantalla de la App recién creada, anota el **App ID** que aparece
   arriba (un número, e.g. `3713303`). Lo necesitarás como
   `GITHUB_APP_ID`.
5. Scroll abajo → **Private keys** → **Generate a private key**. Te
   descarga un `.pem`. Guárdalo en un lugar seguro (lo borraremos del disco
   después de copiarlo al Worker).

### Instalar la App en el repo

1. En la sidebar izquierda de la App → **Install App** → click **Install**
   junto a tu cuenta `hecvasro`.
2. **Only select repositories** → marca `saviacera` → **Install**.
3. La URL después del install termina en `/installations/<NUMERO>` —
   ese número es el **Installation ID**. Anótalo, va a ser
   `GITHUB_APP_INSTALLATION_ID`.

### Convertir la clave privada a PKCS#8

GitHub te entregó la clave en formato PKCS#1 (`-----BEGIN RSA PRIVATE KEY-----`).
La Web Crypto API en Workers sólo importa PKCS#8 (`-----BEGIN PRIVATE KEY-----`,
sin el `RSA`). Conviértela una vez en tu Mac:

```sh
openssl pkcs8 -topk8 -nocrypt \
  -in saviacera-cms.YYYY-MM-DD.private-key.pem \
  -out saviacera-cms.pkcs8.pem
```

El archivo `saviacera-cms.pkcs8.pem` es lo que va al Worker. Pegarás su
**contenido completo** (incluyendo las líneas `-----BEGIN PRIVATE KEY-----`
y `-----END PRIVATE KEY-----`) como el secreto `GITHUB_APP_PRIVATE_KEY`.

Después de pegarlo al Worker, **borra ambos archivos `.pem` del disco**.

---

## 2. Configurar los secretos en el Worker

Los 3 secretos van en variables del Worker, **no** en `.env.local` ni en
`wrangler.jsonc`.

1. Cloudflare Dashboard → **Workers & Pages** → **saviacera** →
   **Settings** → **Variables and Secrets**.
2. Click **+ Add variable**. Por cada uno:
   - **Type**: `Secret` (NO Plain text — esto los enmascara y los excluye
     del UI de logs)
   - **Name** / **Value**:
     - `GITHUB_APP_ID` → el número del paso 1.4
     - `GITHUB_APP_INSTALLATION_ID` → el número del paso "Instalar la App"
     - `GITHUB_APP_PRIVATE_KEY` → contenido completo del `.pkcs8.pem`
       (con las líneas `BEGIN PRIVATE KEY` / `END PRIVATE KEY` incluidas)
   - **Save** después de cada uno.
3. Cuando termines los tres, Cloudflare te pregunta "Deploy your Worker
   with these secrets?" → **Deploy**.

(Alternativa CLI con direnv:
`direnv exec . npx wrangler secret put GITHUB_APP_ID` y repite para los
otros dos.)

---

## 3. Configurar Cloudflare Access (capa de identidad humana)

Cloudflare Access es la "capa VPN": filtra todo tráfico que no sea email
allow-listed antes de que vea siquiera el HTML de Decap o pueda tocar
`/api/*`. Tier gratis cubre hasta 50 usuarios.

1. Cloudflare Dashboard → **Zero Trust** (si no lo has activado en esta
   cuenta, te pedirá un nombre para el tenant — usa algo como `saviacera`).
2. **Access** → **Applications** → **Add an application** → **Self-hosted**.
3. Llena el formulario:
   - **Application name**: `Saviacera CMS`
   - **Session Duration**: `1 month` (la cookie de Access dura 30 días —
     ideal para uso ocasional)
   - **Application domain**: `saviacera.com` + path `/innh85dhz2*`
     (incluye el wildcard `*` al final para cubrir subrutas y assets).
   - Agrega **dos** filas más con **Add → Application domain**:
     - `saviacera.com` + path `/api/auth*`
     - `saviacera.com` + path `/api/callback*` (legado del flujo anterior;
       el Worker ya no lo usa pero lo bloqueamos por defensa en
       profundidad)
4. Click **Next**.
5. **Add a policy**:
   - **Policy name**: `Editores`
   - **Action**: `Allow`
   - **Include** → **Selector**: `Emails` → **Value**: el email de tu
     esposa
   - Click **+ Include** otra vez para agregarte a ti mismo (tu propio
     email) — útil para debug.
6. **Next** → **Authentication**:
   - **Identity providers**: marca **One-time PIN** (login por código a
     email).
7. **Next** → **Add application**.

A partir de este momento, cualquiera que entre a `/innh85dhz2/*` o
`/api/auth*` o `/api/callback*` tiene que pasar primero por el magic-link
de Access.

---

## 4. Smoke test

Cuando los pasos 1–3 están listos:

1. **Tú** entras a `https://saviacera.com/innh85dhz2/` (incógnito ayuda
   para no usar tu sesión vieja).
2. Cloudflare Access intercepta → te pide email → te manda código → entras
   el código → te deja pasar.
3. Aparece Decap CMS. El "Login with GitHub" se auto-clickea (commit
   `63bfc00`) — no deberías ver el botón. Si lo ves brevemente, normal.
4. Aparece la vista de **Productos**. Click un producto existente
   (`set-san-valentin` por ejemplo), cambia algo trivial (un detalle o el
   precio), click **Publish** → **Publish now**.
5. Verifica:
   - GitHub → repo `hecvasro/saviacera` → **Commits**: hay un commit
     nuevo en `main`, autor `saviacera-cms-bot[bot]`, mensaje del estilo
     `CMS: actualizar Producto «xxx»`, body incluye
     `Editado por: tu@email via Cloudflare Access`.
   - Cloudflare Dashboard → saviacera Worker → **Deployments**: hay un
     deploy nuevo en curso o completado.
   - A los ~2 minutos, el cambio se ve en `https://saviacera.com`.
6. (Opcional) Smoke test del proxy sin GitHub:
   `curl https://saviacera.com/api/whoami` desde un terminal con tu
   sesión de Access — debe devolver tu email.
7. Repite los pasos 1–5 con tu esposa cuando esté lista (pasos 1–2 con su
   email; ella no necesita cuenta de GitHub).

---

## Operación día a día

- **Sesión de Cloudflare Access dura un mes.** Tu esposa pasa por
  magic-link aproximadamente una vez al mes.
- **Token de instalación de GitHub dura ~1 hora.** El Worker lo mintea
  automáticamente cada vez que lo necesita — invisible para el editor.
- **Imágenes**: si las fotos pesan más de 1.5 MB, Decap puede rechazar el
  upload. Comprime con TinyPNG, Squoosh o el preset "Web" de Canva antes
  de subir.
- **Errores en una edición**: si algo se rompe en producción tras un
  commit suyo, Cloudflare guarda los deploys anteriores — Dashboard →
  saviacera Worker → **Deployments** → click un deploy previo → **Rollback
  to this version**. El sitio vuelve atrás en segundos. Aparte, el commit
  malo sigue en `main`; pídele a Claude que lo revierta con `git revert`.

---

## Troubleshooting

### `/api/whoami` da 401 / Access redirige a magic-link cuando no debería
Tu sesión de Access expiró. Vuelve a entrar con magic-link. Si pasa
inmediatamente después de un login exitoso, revisa que el path en la
política de Access incluya el wildcard `*` (no es lo mismo `/api/auth`
que `/api/auth*`).

### `/api/github/*` da 500 "GitHub App credentials not configured"
Falta uno de los 3 secretos (paso 2) o tiene typo en el nombre. Los
nombres exactos son `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`,
`GITHUB_APP_PRIVATE_KEY`. Revisa en CF Dashboard → Workers → saviacera →
Variables and Secrets.

### `/api/github/*` da 502 "Failed to mint installation token"
La clave privada está en formato incorrecto. Si pegaste el `.pem` que
GitHub te dio directamente (con `-----BEGIN RSA PRIVATE KEY-----`),
falta convertirlo. Vuelve al paso "Convertir la clave privada a PKCS#8"
y pega el resultado de `openssl pkcs8 -topk8 -nocrypt`.

Otras causas posibles:
- `GITHUB_APP_INSTALLATION_ID` no corresponde a esta App (verifica en
  GitHub → App → Install App → la URL del install).
- La App fue desinstalada del repo (verifica en GitHub → repo →
  Settings → Integrations → GitHub Apps).
- La clave privada fue revocada en GitHub (genera una nueva en App →
  Private keys, conviértela a PKCS#8, actualiza el secret).

### Commit de Decap da 403 / 404
La GitHub App no tiene permiso `Contents: Read and write` en este repo,
o no está instalada. Ve a GitHub → tu App → **Permissions & events** y
confirma `Contents: Read and write`. Si lo cambias, GitHub te pide
**Accept new permissions** en la página del install antes de que se
aplique.

### Decap dice "Your account does not have access to this repo"
Ocurre cuando el Worker no reescribió `repo.permissions` en la respuesta
de `GET /repos/hecvasro/saviacera`. Está manejado en `worker/index.ts`
(commit `5f2fc2d`) — si vuelve a aparecer, revisa que el Worker
desplegado incluya ese fix.

### Login de Decap se queda colgado en el popup
Probablemente Cloudflare Access bloqueó `/api/auth*`. Revisa que el paso
3.3 incluya esa ruta con wildcard. También verifica en la consola del
browser que no haya errores de `postMessage` — Decap espera un handshake
específico (`authorizing:github` → echo → `authorization:github:success:...`)
que está implementado en `worker/index.ts`.

### Quiero ver qué está mandando Decap al Worker
CF Dashboard → Workers → saviacera → **Logs** → **Begin log stream**.
Cada request a `/api/*` aparece con su método, path y status.
