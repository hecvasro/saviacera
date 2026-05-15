# Saviacera

Sitio web para Saviacera — velas de soya, jabones, ambientadores y sets artesanales hechos a mano en República Dominicana.

Stack: [Astro](https://astro.build) + TypeScript + [Tailwind CSS v4](https://tailwindcss.com). Catálogo en Markdown via Astro Content Collections (Zod). Sin pasarela de pagos: el "checkout" registra el pedido en una hoja de Google y abre WhatsApp con el resumen prellenado.

Producción: **https://saviacera.com**.

---

## Administrar el sitio

Hay **dos formas** de actualizar el catálogo. La idea es que la dueña use el **panel web (Decap CMS)** desde el navegador. Hector tiene como respaldo **Claude Code** desde su computadora.

### Opción A — Panel web (Decap CMS)

Entras a **https://saviacera.com/innh85dhz2/** (esa dirección rara al final es a propósito — la mantenemos discreta para que no aparezca en buscadores).

Cómo funciona:

1. Te aparece una pantalla que dice "Iniciar sesión" — escribes tu correo (el que tienes autorizado).
2. Te llega un código de 6 dígitos al correo. Lo pegas y entras.
3. Te aparece la lista de productos con botones para crear, editar y borrar.
4. Llenas el formulario (nombre, precio, fotos, etc.) y le das a **Publish**.
5. En menos de 1–2 minutos el cambio queda vivo en saviacera.com.

Notas:

- **No necesitas cuenta de GitHub** ni instalar nada. Todo se hace desde el navegador.
- Los cambios quedan registrados con tu correo, así que en el historial se ve quién hizo qué.
- Si dejas un campo de número vacío (por ejemplo "Orden") sin querer, el sitio puede no actualizarse. En ese caso entras al panel, abres el producto y completas el número.

### Opción B — Claude Code (para Hector, o como respaldo)

Si Hector tiene Claude Code abierto en la carpeta del proyecto, puede usar estos comandos. Cada comando guía paso a paso, en español:

| Comando              | Para qué                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| `/agregar-producto`  | Crear un producto nuevo (vela, jabón, ambientador, set, etc.). Pregunta nombre, precio, descripción, foto, etc. |
| `/editar-producto`   | Cambiar algo de un producto existente — precio, descripción, orden, disponibilidad, etc. |
| `/actualizar-foto`   | Reemplazar o agregar la foto de un producto.                             |
| `/borrar-producto`   | Despublicar (quitar del sitio) o eliminar un producto.                   |
| `/cambiar-tema`      | Cambiar colores, tipografías (fuentes), o tamaños del tema visual del sitio. |
| `/publicar`          | Publicar al sitio cualquier cambio pendiente que tengas guardado.        |

Para usarlos:

1. Abrir Claude Code en la carpeta `saviacera`.
2. Escribir el comando, ej. `/agregar-producto`.
3. Responder las preguntas que Claude hace, una por una.
4. Al final Claude muestra el resultado y pregunta si publicar — si dices sí, queda en línea en saviacera.com en menos de un minuto.

Si en cualquier momento no estás seguro de algo, escribe **"explícame esto"** o **"no entiendo"** y Claude responde sin tecnicismos.

#### Si algo sale mal usando Claude

- **"Me dio un error"** → cópialo y pásaselo a Claude tal cual. Casi siempre lo resuelve solo o te explica qué hacer.
- **"Hice un cambio que no quería hacer"** → di "deshaz el último cambio" y Claude lo revierte.
- **"Necesito algo que no está en la lista de comandos"** → escríbelo en español tal como lo piensas. Claude entiende. Por ejemplo: "subí mal la foto del jabón, cámbiala por esta otra URL".

---

## Desarrollo local

```bash
npm install
cp .env.example .env.local           # variables públicas del sitio (PUBLIC_*)
cp .envrc.local.example .envrc.local # credenciales de Cloudflare para deploy manual
direnv allow                         # carga ambos archivos en el shell
npm run dev
```

El servidor de desarrollo corre en `http://localhost:4321`.

Sólo Hector necesita `.envrc.local` (es para el `npm run deploy` de respaldo). En producción, las variables `PUBLIC_*` se configuran en el dashboard de Cloudflare; lo que está en `.env.local` no llega al sitio en vivo, sólo al `npm run dev`/`npm run build` local. Detalles en [CLAUDE.md](./CLAUDE.md).

Comandos útiles:

| Comando            | Para qué                                              |
| ------------------ | ----------------------------------------------------- |
| `npm run dev`      | Servidor local con recarga                            |
| `npm run build`    | `astro check` + build de producción a `dist/`         |
| `npm run preview`  | Sirve `dist/` localmente                              |
| `npm run format`   | Formatea con Prettier                                 |
| `npm run lint`     | Corre ESLint                                          |

---

## Estructura

```
.
├── apps-script/
│   └── Code.gs                    # Google Apps Script que recibe los pedidos
├── public/                        # archivos estáticos servidos tal cual
│   ├── innh85dhz2/                # panel admin de Decap CMS (URL obscurecida)
│   │   ├── index.html             # cargador de Decap (auto-clic al login)
│   │   └── config.yml             # esquema del CMS (debe ir parejo con content.config.ts)
│   └── uploads/                   # fotos subidas desde Decap, commiteadas al repo
├── src/
│   ├── components/                # piezas de UI Astro
│   ├── content/
│   │   └── products/              # un .md por producto (catálogo)
│   ├── content.config.ts          # Zod schema (compatible con Decap CMS)
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   ├── cart.ts                # carrito en localStorage
│   │   ├── checkout.ts            # POST + wa.me deep link
│   │   └── format.ts              # formato DOP (es-DO)
│   ├── pages/
│   │   ├── index.astro            # /
│   │   ├── aromaticos.astro       # /aromaticos (velas, ambientadores, difusores)
│   │   ├── cuidado-personal.astro # /cuidado-personal (jabones, etc.)
│   │   ├── sets.astro             # /sets
│   │   ├── personalizados.astro   # /personalizados (souvenirs / corporativo, vía WhatsApp)
│   │   ├── productos/
│   │   │   ├── index.astro        # /productos (catálogo completo)
│   │   │   └── [slug].astro       # /productos/<slug>
│   │   ├── carrito.astro          # /carrito
│   │   └── 404.astro
│   └── styles/
│       ├── tokens.css             # variables de marca (colores, tipo, etc.)
│       └── global.css             # entrada Tailwind + tema
├── worker/
│   └── index.ts                   # Cloudflare Worker: auth + proxy GitHub para Decap
├── wrangler.jsonc                 # config del Worker (assets + worker script)
├── astro.config.mjs
├── eslint.config.js
├── package.json
├── tsconfig.json
└── THEMING.md                     # cómo cambiar la marca (para no-devs)
```

---

## Agregar un producto

1. Crea un archivo Markdown en `src/content/products/` con el nombre que quieras como slug (ej. `vela-rosas-cardamomo.md`). El nombre del archivo se convierte en la URL: `/productos/vela-rosas-cardamomo`.
2. Copia el frontmatter de un producto existente y ajusta los campos:

   ```yaml
   ---
   name: "Vela Rosas & Cardamomo"
   tagline: "Floral con un toque especiado"
   description: |
     Texto largo que describe el producto.
   category: "velas"          # "velas" | "ambientadores" | "difusores" | "jabones" | "sets" | "otros"
   tags: ["floral"]            # libres; en sets úsalos para temporada
   priceDOP: 850
   sku: "VEL-ROS-CAR-200"
   available: true
   images:
     - "https://picsum.photos/seed/vela-rosas/800/800"
   includes: []                # solo para sets: lista de cosas dentro del set
   details:
     - "Aroma: rosas + cardamomo"
     - "Duración: ~40h"
   featured: true              # aparece en la home
   order: 10                   # menor = más arriba en listados
   createdAt: 2026-04-01
   ---
   ```

3. Si quieres usar fotos reales en lugar de placeholders, ponlas en `public/uploads/` (Decap también las pone ahí cuando subes desde el panel). En el frontmatter referéncialas con path desde la raíz: `/uploads/mi-foto.jpg`. El schema acepta tanto URLs completas (picsum y similares) como rutas `/uploads/...`.

4. Reinicia `npm run dev` si recién creaste la carpeta del producto.

### Cómo mover / reordenar un producto

Cada producto tiene un campo `order` en su frontmatter:

```yaml
order: 20    # número entero. Menor = más arriba en la grilla.
```

Para mover una vela arriba de otra, baja su `order`. Si tienes dos productos con `order: 10` y `order: 20`, y quieres que un nuevo producto quede en medio, ponle `order: 15`. No hay que renumerar todo.

El campo `featured: true` controla otra cosa distinta: si el producto aparece destacado en la home (`/`). Puedes tener varios productos destacados; entre ellos también respetan `order`.

### Categorías

El catálogo está organizado en **6 categorías** (valor permitido en `category:` en el frontmatter) agrupadas en **4 "paraguas"** (cada paraguas tiene su página de listado):

| Categoría        | Paraguas / página              | Notas                                                                 |
| ---------------- | ------------------------------ | --------------------------------------------------------------------- |
| `velas`          | Aromáticos → `/aromaticos`     | Velas de soya.                                                        |
| `ambientadores`  | Aromáticos → `/aromaticos`     | Room sprays, aceites, etc.                                            |
| `difusores`      | Aromáticos → `/aromaticos`     | Difusores de varilla / cerámica.                                      |
| `jabones`        | Cuidado personal → `/cuidado-personal` | Jabones artesanales. Acá entran a futuro: aceites faciales, bálsamos. |
| `sets`           | Sets → `/sets`                 | Bundles. Usa `tags` para temporada (`san-valentin`, `dia-de-las-madres`, etc.) y `includes:` para listar qué viene dentro. |
| `otros`          | (sin página dedicada)          | Comodín para algo nuevo que aún no encaje en un paraguas. Sale en `/productos` y nada más.        |

Aparte está **Souvenirs y Corporativos** en `/personalizados` — pero ése no es un producto del catálogo, es una página de contacto/cotización por WhatsApp.

#### Cómo agregar una categoría nueva

Agregar un valor nuevo al schema (digamos `aceites`) requiere tres cambios pequeños en el código — no se puede hacer sólo desde un `.md` ni desde Decap. Si quieres una categoría nueva, dímelo y la dejamos lista en un solo PR. Los tres cambios son:

1. Añadir `"aceites"` al `z.enum([...])` en `src/content.config.ts` (y al `select` de `public/innh85dhz2/config.yml` en paralelo, sino Decap no la deja escoger).
2. Decidir bajo qué paraguas vive: si entra en uno existente (p. ej. Aromáticos), basta con incluirla en el filtro de `src/pages/aromaticos.astro`. Si necesita paraguas propio, crear `src/pages/<paraguas>.astro` copiando uno existente como base.
3. Agregar el link al menú en `src/components/Header.astro` y al footer en `src/components/Footer.astro` si abriste paraguas nuevo.

Cuando exista el CMS de Google Sheets (ver "Futuro" abajo), agregar categorías será literalmente añadir una fila a una hoja — sin tocar código.

---

## Configurar el flujo de pedidos (Apps Script + Sheet + WhatsApp)

El sitio no tiene pasarela de pagos. Cuando un cliente confirma su pedido:

1. El navegador genera un **OrderID** con formato `SAV-YYYYMMDD-NNNN`.
2. Hace `POST` al endpoint del Apps Script con el JSON del pedido.
3. Te lleva a `wa.me/<número>` con un mensaje en español ya redactado: pedido + items + total + "¿Cómo coordinamos pago y entrega?".

### Crear la hoja y el script

1. Crea una nueva hoja de cálculo en Google Sheets, p. ej. **"Saviacera — Pedidos"**.
2. Renombra la primera pestaña a `Orders`.
3. **Extensiones → Apps Script**. Borra el contenido por defecto y pega el contenido de `apps-script/Code.gs`.
4. Guarda con `Ctrl/Cmd + S` y dale un nombre al proyecto (p. ej. `saviacera-orders`).
5. **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Descripción: `v1`
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
6. Acepta los permisos. Copia la URL **/exec** que sale.
7. En tu `.env` local (y en las variables de entorno de producción) pega:

   ```
   PUBLIC_ORDER_ENDPOINT="https://script.google.com/macros/s/.../exec"
   ```

8. (Opcional) Abre la URL `/exec` en una pestaña del navegador — debería responder `{"ok":true,"service":"saviacera-orders"}`.

> Cada vez que actualices `Code.gs` y quieras que tenga efecto en la URL existente, en Apps Script: **Implementar → Administrar implementaciones → editar (lápiz) → Versión: nueva versión → Implementar**.

### Configurar WhatsApp

En `.env`:

```
PUBLIC_WHATSAPP_NUMBER="18295286271"
```

Sólo dígitos (código de país + número). El sitio arma `https://wa.me/<número>?text=<mensaje>` y abre WhatsApp con el resumen del pedido prellenado — el cliente sólo le da Enviar.

### Si el POST falla

El checkout es **fail-open**: si el Apps Script está caído o la URL no responde, igual te llevamos a WhatsApp. La info del pedido viaja en el mensaje, así que nada se pierde — sólo no queda registrada en la hoja.

---

## Cambiar la marca (colores, tipografías)

Todo el sistema de marca vive en CSS variables dentro de `src/styles/tokens.css`. Cambia un valor → todo el sitio cambia.

Lee **[THEMING.md](./THEMING.md)** — escrito para no-developers.

---

## Despliegue (Cloudflare Workers Static Assets)

El sitio está en producción en **https://saviacera.com** (y `www.saviacera.com`). Hosting en **Cloudflare Workers Static Assets** (Worker `saviacera`, configurado en `wrangler.jsonc`).

**Auto-deploy desde GitHub está vivo.** Cada push a la rama `main` dispara un build en Cloudflare Workers Builds que corre `npm run build && npx wrangler deploy`. En 1–2 minutos el sitio queda actualizado. En la práctica esto significa que **publicar es hacer commit + push** — y eso pasa solo cuando la dueña le da "Publish" en Decap, o cuando una skill termina su flujo con `/publicar`.

### Workflow para publicar cambios

Para la dueña vía Decap (camino normal):

1. Editar en `saviacera.com/innh85dhz2/`, le da Publish, listo.
2. En 1–2 minutos el cambio está vivo.

Para Hector vía Claude Code / skills:

1. Correr el skill que aplique (`/agregar-producto`, `/editar-producto`, etc.) o hacer cambios manuales.
2. La skill termina con commit + push automático. Si editaste a mano, corre `/publicar`.
3. Igual que arriba — el push a `main` dispara el build y deploy.

Para Hector con cambios técnicos (componentes, schema, infra):

1. Editar.
2. `npm run dev` para verlo en local.
3. **Importante: `npm run build` localmente antes de pushear**, sobre todo si tocaste `src/content.config.ts` o `public/innh85dhz2/config.yml`. Es el mismo comando que corre Cloudflare — si pasa local, pasa en el deploy.
4. Commit + push a `main`.

### Despliegue manual (respaldo)

Si el auto-deploy está caído o quieres saltarte el flujo de GitHub:

```bash
npm run deploy           # build + wrangler deploy directo a producción
npm run deploy:preview   # sube una versión del Worker sin promoverla
```

`deploy:preview` deja una URL temporal para mostrarle el cambio a alguien sin tocar la versión que sirve `saviacera.com`.

### Variables de entorno

Las variables `PUBLIC_*` (endpoint de Apps Script, número de WhatsApp) **viven en el dashboard de Cloudflare** — Settings → Variables and Secrets → Build vars. Esas son las que el build de producción ve. El `.env.local` local sólo afecta `npm run dev` / `npm run build` en la máquina de Hector. Si necesitas cambiar una variable de producción, cámbiala en el dashboard y dispara un nuevo build (basta con cualquier push a `main`, aunque sea un commit vacío).

### Detalles técnicos

Si necesitas tocar la infra (credenciales, dominio, scopes del token de Cloudflare, setup de Decap), eso vive en [CLAUDE.md](./CLAUDE.md) y [DECAP-SETUP.md](./DECAP-SETUP.md). El estado actual y lo que falta vive en [ROADMAP.md](./ROADMAP.md).

---

## Futuro — gestión de productos desde Google Sheets

Hoy en día agregar un producto requiere editar un archivo Markdown y correr `npm run deploy`. Eso funciona, pero la idea a mediano plazo es que el catálogo se maneje desde **Google Sheets** (igual que ya hacemos con los pedidos), para que no haya que tocar código ni terminal cada vez.

El plan está esbozado en [ROADMAP.md](./ROADMAP.md) → "Google Sheets-backed CMS". Mientras tanto el flujo actual (un `.md` por producto) sigue siendo la forma oficial de actualizar el catálogo.

---

## Decisiones que vale la pena revisar

- **Carrito en localStorage**: si el cliente cambia de dispositivo pierde el carrito. Asumimos OK por el flujo "uno se sienta a comprar de un tirón".
- **Order ID generado en cliente**: random 4-digit suffix. Colisión rarísima pero posible — la hoja debería tolerar duplicados.
- **`mode: "no-cors"`**: el POST no podemos leerlo, sólo "fire and forget". Si en algún momento queremos confirmar que el pedido sí llegó, hay que cambiar el deploy de Apps Script para soportar CORS o pasar a un endpoint propio.
- **Imágenes**: ahora son placeholders de picsum — para producción hay que subir fotos reales y referenciarlas en cada `.md`.
