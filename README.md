# Saviacera

Sitio web para Saviacera — velas de soya, jabones y kits artesanales hechos a mano en República Dominicana.

Stack: [Astro](https://astro.build) + TypeScript + [Tailwind CSS v4](https://tailwindcss.com). Catálogo en Markdown via Astro Content Collections (Zod). Sin pasarela de pagos: el "checkout" registra el pedido en una hoja de Google y abre WhatsApp con el resumen prellenado.

Producción: **https://saviacera.com**.

---

## Administrar el sitio

Hay **dos formas** de actualizar el catálogo. La idea es que la dueña use el **panel web (Decap CMS)** cuando esté listo — abre un formulario en `saviacera.com/admin/`, llena los campos, le da a guardar y el sitio se actualiza solo. Mientras tanto, Hector puede usar **Claude Code** desde su computadora.

### Opción A — Panel web (Decap CMS) — *próximamente*

> Esto todavía no está activo. Cuando esté listo, será la forma principal para que María administre el sitio sin instalar nada.

- Entras a https://saviacera.com/admin/
- Te pide login (con tu cuenta de GitHub o con un código que te llega por email, dependiendo de cómo lo configuremos).
- Te aparece una lista de productos con un botón "Nuevo producto" y editar/borrar para los existentes.
- Llenas el formulario (nombre, precio, foto, etc.), le das a "Publish" y listo — el sitio se actualiza solo en menos de un minuto.

Status actual: planeado pero sin construir. Ver [ROADMAP.md](./ROADMAP.md) para cuándo se hace.

### Opción B — Claude Code (para Hector, o como respaldo)

Si Hector tiene Claude Code abierto en la carpeta del proyecto, puede usar estos comandos. Cada comando guía paso a paso, en español:

| Comando              | Para qué                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| `/agregar-producto`  | Crear un producto nuevo (vela, jabón, o kit). Pregunta nombre, precio, descripción, foto, etc. |
| `/editar-producto`   | Cambiar algo de un producto existente — precio, stock, descripción, orden, etc. |
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
cp .env.example .env       # luego edita .env si quieres apuntar a un endpoint real
npm run dev
```

El servidor de desarrollo corre en `http://localhost:4321`.

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
│   │   ├── velas.astro            # /velas (con filtro por tag)
│   │   ├── jabones.astro          # /jabones
│   │   ├── kits.astro             # /kits (agrupado por temporada)
│   │   ├── carrito.astro          # /carrito
│   │   ├── 404.astro
│   │   └── productos/[slug].astro # /productos/<slug>
│   └── styles/
│       ├── tokens.css             # variables de marca (colores, tipo, etc.)
│       └── global.css             # entrada Tailwind + tema
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
   category: "velas"          # "velas" | "jabones" | "kits"
   tags: ["floral"]            # libres; en kits úsalos para temporada
   priceDOP: 850
   sku: "VEL-ROS-CAR-200"
   stock: 24
   available: true
   images:
     - "https://picsum.photos/seed/vela-rosas/800/800"
   includes: []                # solo para kits: lista de cosas dentro del kit
   details:
     - "Aroma: rosas + cardamomo"
     - "Duración: ~40h"
   featured: true              # aparece en la home
   order: 10                   # menor = más arriba en listados
   createdAt: 2026-04-01
   ---
   ```

3. Si quieres usar imágenes locales en lugar de placeholders, ponlas en `src/assets/products/<slug>/` y en el frontmatter usa rutas relativas (`./hero.jpg`). El schema acepta strings (URLs) y refs locales.

4. Reinicia `npm run dev` si recién creaste la carpeta del producto.

### Cómo mover / reordenar un producto

Cada producto tiene un campo `order` en su frontmatter:

```yaml
order: 20    # número entero. Menor = más arriba en la grilla.
```

Para mover una vela arriba de otra, baja su `order`. Si tienes dos productos con `order: 10` y `order: 20`, y quieres que un nuevo producto quede en medio, ponle `order: 15`. No hay que renumerar todo.

El campo `featured: true` controla otra cosa distinta: si el producto aparece destacado en la home (`/`). Puedes tener varios productos destacados; entre ellos también respetan `order`.

### Categorías

Las categorías activas hoy son tres y están "cableadas" en el código (cada una tiene su página propia y un valor permitido en el schema):

- **velas** → aparecen en `/velas` (con filtro por tag).
- **jabones** → aparecen en `/jabones`.
- **kits** → aparecen en `/kits`. Los kits son productos normales: misma forma, sólo con `category: "kits"` y un tag de temporada (`san-valentin`, `dia-de-las-madres`, `dia-del-maestro`, `navidad`, `regalo`). El campo `includes` es una lista de strings — qué viene dentro del kit.

#### Cómo agregar una categoría nueva

Agregar una categoría completamente nueva (digamos `aceites`) requiere tres cambios pequeños en el código — no se puede hacer sólo desde un `.md`. Si quieres una categoría nueva, dímelo y la dejamos lista en un solo PR. Los tres cambios son:

1. Añadir `"aceites"` al `z.enum([...])` en `src/content.config.ts`.
2. Crear `src/pages/aceites.astro` (copiando `jabones.astro` como base y cambiando el filtro `category`).
3. Agregar el link "Aceites" al menú en `src/components/Header.astro` y al footer en `src/components/Footer.astro`.

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

## Despliegue (Cloudflare Pages)

El sitio está en producción en **https://saviacera.com** (y `www.saviacera.com`). Hosting en Cloudflare Pages, proyecto `saviacera`. Los despliegues son manuales por ahora — un solo comando desde la terminal:

```bash
npm run deploy
```

Eso corre `astro check && astro build` y luego sube `dist/` a Cloudflare. La nueva versión queda viva en `saviacera.com` en pocos segundos.

También hay `npm run deploy:preview` que sube una versión a una URL `<hash>.saviacera.pages.dev` sin tocar la producción — útil para mostrarle algo a alguien sin publicarlo a todo el mundo.

### Workflow para publicar cambios

1. Editar lo que sea (un producto, el theme, un componente).
2. `npm run dev` para verlo en local (`http://localhost:4321`).
3. Cuando estés conforme: `npm run deploy`.
4. Listo — saviacera.com sirve la nueva versión.

Importante: las variables de entorno (Apps Script endpoint, número de WhatsApp) se leen del archivo `.env.local` **al momento del build**. Si cambias esos valores tienes que correr `npm run deploy` para que la producción los recoja.

### Detalles técnicos

Si necesitas tocar la infra (credenciales, dominio, scopes del token de Cloudflare), eso vive en [CLAUDE.md](./CLAUDE.md). El estado actual y lo que falta vive en [ROADMAP.md](./ROADMAP.md).

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
