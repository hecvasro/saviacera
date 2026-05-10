# Saviacera

Sitio web para Saviacera — velas de soya, jabones y kits artesanales hechos a mano en República Dominicana.

Stack: [Astro](https://astro.build) + TypeScript + [Tailwind CSS v4](https://tailwindcss.com). Catálogo en Markdown via Astro Content Collections (Zod). Sin pasarela de pagos: el "checkout" registra el pedido en una hoja de Google y abre WhatsApp con el resumen prellenado.

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

### Categorías

- **velas** → aparecen en `/velas` (con filtro por tag).
- **jabones** → aparecen en `/jabones`.
- **kits** → aparecen en `/kits`. Los kits son productos normales: misma forma, sólo con `category: "kits"` y un tag de temporada (`san-valentin`, `dia-de-las-madres`, `dia-del-maestro`, `navidad`, `regalo`). El campo `includes` es una lista de strings — qué viene dentro del kit.

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

## Despliegue (Cloudflare Pages — borrador)

Pendiente conectar. El plan:

1. Crear repositorio en GitHub y subir este proyecto.
2. En Cloudflare → Pages → **Create a project** → conectar el repo.
3. Ajustes de build:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: `20` o superior
4. Variables de entorno (Production y Preview):
   - `PUBLIC_ORDER_ENDPOINT` → URL del Apps Script
   - `PUBLIC_WHATSAPP_NUMBER` → número en formato dígitos
5. Conectar el dominio `saviacera.do` (o el que se defina) en **Custom domains**.

> El proyecto es estático (`output: "static"` por defecto en Astro), así que cualquier host estático funciona — Pages, Netlify, S3+CloudFront, etc.

---

## Decisiones que vale la pena revisar

- **Carrito en localStorage**: si el cliente cambia de dispositivo pierde el carrito. Asumimos OK por el flujo "uno se sienta a comprar de un tirón".
- **Order ID generado en cliente**: random 4-digit suffix. Colisión rarísima pero posible — la hoja debería tolerar duplicados.
- **`mode: "no-cors"`**: el POST no podemos leerlo, sólo "fire and forget". Si en algún momento queremos confirmar que el pedido sí llegó, hay que cambiar el deploy de Apps Script para soportar CORS o pasar a un endpoint propio.
- **Imágenes**: ahora son placeholders de picsum — para producción hay que subir fotos reales y referenciarlas en cada `.md`.
