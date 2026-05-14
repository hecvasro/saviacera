# Decap CMS — pasos de configuración manual

> Documento operativo para terminar de habilitar el panel admin para tu esposa.
> El código (Worker auth proxy, `admin/index.html`, `config.yml`) ya está en el
> repo. Lo que falta son acciones que se hacen en las UIs de GitHub y Cloudflare
> y que yo no puedo hacer por ti.

**URL admin**: `https://saviacera.com/innh85dhz2/`
(`innh85dhz2` es el sufijo random generado para ofuscar el panel.)

---

## 1. Crear la GitHub OAuth App

Una vez por proyecto. Te da las credenciales que el Worker necesita.

1. Abre <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**.
   (Es la cuenta `hecvasro` la que será dueña del App.)
2. Llena el formulario:
   - **Application name**: `Saviacera CMS`
   - **Homepage URL**: `https://saviacera.com`
   - **Application description** (opcional): `Decap CMS admin para saviacera.com`
   - **Authorization callback URL**: `https://saviacera.com/api/callback`
   - **Enable Device Flow**: dejar **sin** marcar.
3. Click **Register application**.
4. En la pantalla que te muestra los detalles del App:
   - Copia el **Client ID** que aparece arriba (de la forma `Iv1.abc…` o `xxx…`).
   - Click **Generate a new client secret** → copia el secret (sólo se muestra una vez; guárdalo en tu password manager).

---

## 2. Configurar los secretos en el Worker de Cloudflare

El Worker necesita el `CLIENT_ID` y `CLIENT_SECRET` para completar el OAuth handshake. No los pongas en `.env.local` ni en `wrangler.jsonc` — van en variables del Worker.

1. Cloudflare Dashboard → **Workers & Pages** → **saviacera** → **Settings** → **Variables and Secrets**.
2. Click **+ Add variable**. Por cada uno:
   - **Type**: Secret (NO Plain text)
   - **Name**: `GITHUB_CLIENT_ID` → **Value**: el Client ID del paso 1
   - **Save**
3. Repite para `GITHUB_CLIENT_SECRET` con el secret del paso 1.
4. Cloudflare te pregunta "Deploy your Worker with these secrets?" → **Deploy**.

(Para CLI: `wrangler secret put GITHUB_CLIENT_ID` y `wrangler secret put GITHUB_CLIENT_SECRET`.)

---

## 3. Configurar Cloudflare Access (la capa "VPN")

Filtra todo tráfico que no sea tu esposa antes de que vea siquiera el HTML de Decap. Tier gratis cubre hasta 50 usuarios.

1. Cloudflare Dashboard → **Zero Trust** (si no lo has activado en esta cuenta, te pedirá un nombre para el tenant — usa algo como `saviacera`).
2. **Access** → **Applications** → **Add an application** → **Self-hosted**.
3. Llena el formulario:
   - **Application name**: `Saviacera CMS`
   - **Session Duration**: `1 month` (la cookie de Access dura 30 días — perfecto para una persona que entra ocasionalmente)
   - **Application domain**: `saviacera.com` y **Path**: `/innh85dhz2/*`
   - Agrega también una segunda fila (Add → Subdomain): `saviacera.com` + path `/api/auth`, y otra para `/api/callback` — así Access también protege los endpoints de OAuth proxy. (Sin esto un atacante con la URL podría tocarlos.)
4. Click **Next**.
5. **Add a policy**:
   - **Policy name**: `Solo María`
   - **Action**: `Allow`
   - **Include** → **Selector**: `Emails` → **Value**: el email de tu esposa
   - (Opcional: agrégate también con tu propio email para poder entrar para debug)
6. **Next** → **Authentication** tab:
   - **Identity providers**: marca **One-time PIN** (login por código a email).
7. **Next** → **Add application**.

A partir de este momento, cualquiera que entre a `saviacera.com/innh85dhz2/`, `/api/auth`, o `/api/callback` tiene que pasar primero por el magic-link de Access.

---

## 4. (Cuando tu esposa esté lista) Agregarla como colaboradora del repo

1. Asegúrate que ella tenga cuenta de GitHub. Si no:
   - Va a <https://github.com/join>, crea cuenta gratis con su email, verifica el email.
   - Te pasa su **username** (no su email).
2. GitHub → repo `hecvasro/saviacera` → **Settings** → **Collaborators** → **Add people** → username de ella → **Write** access.
3. GitHub le manda un email para aceptar la invitación. Ella acepta.

Sin este paso, su login en Decap pasa el OAuth pero los commits fallan con 403 — porque el GitHub OAuth scope es "puede tocar repos donde el usuario tiene acceso", y si no es colaboradora, no tiene acceso.

---

## 5. Smoke test

Cuando los pasos 1–3 están listos:

1. Tú entras a `https://saviacera.com/innh85dhz2/`.
2. Access intercepta → te pide email → te manda código → entras el código → te deja pasar.
3. Aparece Decap CMS → click **Login with GitHub**.
4. GitHub te pide autorización a la OAuth App → click **Authorize**.
5. Regresas al panel, ahora con vista de **Productos**.
6. Click un producto existente, cambia algo trivial (un detalle), click **Publish**.
7. Verifica:
   - En GitHub, hay un commit nuevo en `main` atribuido a tu cuenta con mensaje `CMS: actualizar products «xxx»`.
   - Cloudflare Workers Builds dispara un deploy nuevo (Dashboard → saviacera Worker → Deployments).
   - A los ~2 minutos, el cambio se ve en `saviacera.com`.
8. Repite con tu esposa cuando esté lista (pasos 1-2 con su email, paso 3 con su cuenta de GitHub).

---

## Operación día a día

- **Tokens de OAuth expiran a 8 horas**. Decap pide re-auth con GitHub cuando expira (un click). La sesión de Cloudflare Access dura un mes — sólo pasa por magic-link aproximadamente una vez al mes.
- **Imágenes**: si las fotos pesan más de 1.5 MB, Decap rechaza el upload. Comprime con TinyPNG, Squoosh o el preset "Web" de Canva.
- **Errores en una edición**: si algo se rompe en producción tras un commit suyo, Cloudflare guarda los deploys anteriores — Dashboard → saviacera Worker → Deployments → click un deploy previo → **Rollback to this version**. El sitio vuelve atrás en segundos.

## Si algo no funciona

- **`/api/auth` da 500 "GITHUB_CLIENT_ID is not configured"**: paso 2 no se hizo o el secret tiene typo en el nombre.
- **GitHub muestra "Redirect URI mismatch"**: el callback en la OAuth App (paso 1.2) tiene que ser literalmente `https://saviacera.com/api/callback`. Sin slash final, sin `www`.
- **Login de Decap se queda colgado**: probablemente Access bloqueó `/api/callback`. Verifica que el paso 3.3 incluya esas rutas.
- **Commit de Decap da 403**: la persona logueada no es colaboradora del repo. Paso 4.
