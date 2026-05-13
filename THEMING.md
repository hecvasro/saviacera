# Theming Saviacera

Toda la apariencia del sitio (colores, tipografías, esquinas redondeadas, sombras) se define en **un solo archivo**:

```
src/styles/tokens.css
```

Si cambias algo ahí, el sitio entero se actualiza. No hay que tocar componentes.

---

## La paleta actual (mayo 2026)

El sitio toma sus colores del logo de Saviacera: un verde sage suave sobre crema cálido. La idea es que la banda del header (verde sage) se conecta visualmente con el logo, y el resto del sitio respira en crema con detalles terracota.

| Variable                  | Color                  | Dónde aparece                                                              |
| ------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `--color-background`      | `#faf7f1` crema cálido | Fondo de toda la página                                                    |
| `--color-surface`         | `#ffffff` blanco       | Tarjetas de productos (fondo limpio para que las fotos resalten)           |
| `--color-surface-muted`   | `#f3eee2` crema suave  | Bandas suaves (footer, sección "Nuestra historia"), chips, hover de botón  |
| `--color-border`          | `#e8e3d8` crema gris   | Líneas finitas entre secciones y bordes de botones                         |
| `--color-text`            | `#2c2a26` tinta oscura | Texto principal                                                            |
| `--color-text-muted`      | `#6b665d` gris cálido  | Descripciones, leyendas, subtotales                                        |
| `--color-primary`         | `#b8c49d` verde sage   | Banda del header — el mismo verde del logo                                 |
| `--color-primary-hover`   | sage más oscuro        | Hover de botón secundario sage                                             |
| `--color-primary-contrast`| blanco                 | Texto y enlaces de navegación sobre la banda sage                          |
| `--color-accent`          | `#c87a55` terracota    | Botones principales ("Confirmar pedido"), enlaces, badge del carrito       |
| `--color-accent-hover`    | terracota más oscuro   | Hover del botón principal                                                  |
| `--color-accent-contrast` | blanco                 | Texto sobre terracota                                                      |
| `--color-beige`           | `#f3eee2`              | Alias suave de `surface-muted` (chips antiguos)                            |
| `--color-success`         | verde                  | Mensaje "Agregado al carrito"                                              |
| `--color-danger`          | rojo                   | "Quitar" / "Vaciar carrito" (hover)                                        |

**Por qué el header es sage y el resto crema:** el logo tiene fondo sage incorporado (es parte del diseño, no se puede separar). Para que se vea limpio, el header completo es una banda sage donde el logo "encaja" sin recortes. El resto del sitio descansa en crema para no saturar.

---

## Cambiar un color

Cada color es una variable que empieza con `--color-`. Por ejemplo:

```css
/* en tokens.css */
--color-accent: #c87a55; /* terracota */
```

Para probar otro color, reemplaza el valor. Puedes usar:

- hex de toda la vida: `#c87a55`
- nombres CSS: `tomato`, `peru`, etc.
- formato moderno: `oklch(62% 0.135 40)` (más fácil ajustar luminosidad)

Después de guardar, el navegador refresca solo (con `npm run dev` corriendo).

**Regla:** los componentes nunca usan colores literales (`#ffffff`). Si ves un color en el sitio que no puedes cambiar desde aquí, eso es un bug — avísame.

---

## El logo

El logo vive en:

```
public/logo.svg
```

Es un archivo de imagen fijo (los textos "SAVIA & CERA" son trazos vectoriales, no texto editable). Para cambiar el logo, hay que generar un nuevo SVG y reemplazar el archivo con el mismo nombre. La banda sage del header tiene el mismo verde que el fondo del SVG (`#b8c49d`), por eso se ve continuo: si en el futuro cambias el verde del logo, también hay que actualizar `--color-primary` en `tokens.css` al mismo tono.

---

## Cambiar la tipografía

Hay dos fuentes, ambas gratis de Google Fonts:

```css
--font-display: "Cormorant Garamond", Georgia, serif; /* títulos */
--font-body: "Inter", system-ui, sans-serif;          /* texto */
```

- **Cormorant Garamond** es un serif elegante, sustituto libre del estilo "Simple Serenity" usado en el logo.
- **Inter** es un sans-serif limpio y muy legible para texto corrido.

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
