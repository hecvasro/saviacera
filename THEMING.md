# Theming Saviacera

Toda la apariencia del sitio (colores, tipografías, esquinas redondeadas, sombras) se define en **un solo archivo**:

```
src/styles/tokens.css
```

Si cambias algo ahí, el sitio entero se actualiza. No hay que tocar componentes.

---

## Cambiar un color

Cada color es una variable que empieza con `--color-`. Por ejemplo:

```css
/* en tokens.css */
--color-accent: oklch(62% 0.135 40); /* terracotta */
```

Para probar otro color, reemplaza el valor. Puedes usar:

- formato moderno: `oklch(62% 0.135 40)` (recomendado, más fácil ajustar luminosidad)
- formato hex de toda la vida: `#c2683f`
- nombres CSS: `tomato`, `peru`, etc.

Después de guardar, el navegador refresca solo (`npm run dev` corriendo).

### ¿Qué color hace qué?

| Variable                  | Dónde aparece                                                           |
| ------------------------- | ----------------------------------------------------------------------- |
| `--color-background`      | Color de fondo de toda la página                                        |
| `--color-surface`         | Tarjetas de productos, footer, áreas elevadas                           |
| `--color-border`          | Líneas finitas (entre secciones, alrededor de botones secundarios)      |
| `--color-text`            | Texto principal (negro/marrón)                                          |
| `--color-text-muted`      | Texto gris (descripciones, leyendas, "Subtotal")                        |
| `--color-accent`          | Botones principales, enlaces activos, badges destacados                 |
| `--color-accent-hover`    | Estado hover del botón principal                                        |
| `--color-accent-contrast` | Texto sobre el accent (normalmente crema)                               |
| `--color-beige`           | Chips/etiquetas suaves ("Catálogo", "Temporada"), fondo de botón hover  |
| `--color-beige-contrast`  | Texto dentro del beige                                                  |
| `--color-success`         | Mensaje "Agregado al carrito"                                           |
| `--color-danger`          | Botón "Quitar" / vaciar carrito (estado hover)                          |

**Regla:** los componentes nunca usan colores literales (`#ffffff`). Si ves un color en el sitio que no puedes cambiar desde aquí, eso es un bug — avísame.

---

## Cambiar la tipografía

Hay dos fuentes:

```css
--font-display: "Cormorant Garamond", Georgia, serif; /* títulos */
--font-body: "Inter", system-ui, sans-serif;          /* texto */
```

Para cambiar la fuente:

1. Edita la variable en `tokens.css` con el nuevo nombre.
2. Si la fuente nueva viene de Google Fonts, abre `src/layouts/BaseLayout.astro` y reemplaza el `<link>` que carga las fuentes (busca `fonts.googleapis.com`).

Eso es todo — todo lo que sea título usa `--font-display`, todo lo que sea texto usa `--font-body`.

---

## Esquinas redondeadas, espacios y sombras

También están en `tokens.css`:

- `--radius-sm/md/lg/pill`: redondez de bordes (botones, tarjetas, chips).
- `--space-1` a `--space-12`: tamaños de espaciado consistente.
- `--shadow-sm/md/lg`: sombras de tarjetas y modales.

Tocar un radius cambia todas las tarjetas a la vez. Tocar un shadow afecta a todas las tarjetas con sombra.

---

## ¿Y si quiero algo totalmente nuevo?

Si necesitas un color que no existe (por ejemplo `--color-promo`), avísame: lo agregamos a `tokens.css` y al "tema" que vive en `src/styles/global.css` y queda disponible como utilidad de Tailwind (`bg-promo`, `text-promo`, …).
