---
name: cambiar-tema
description: Cambia algún aspecto visual del sitio Saviacera — colores, tipografías (fuentes), tamaños, esquinas redondeadas, sombras. Invocar cuando la persona diga "cambiar color", "cambiar tipografía", "cambiar fuente", "cambiar la letra de los títulos", "modificar el tema", "que se vea más X", "fondo más oscuro", "redondear más las tarjetas", etc.
---

# Cambiar la apariencia del sitio

Toda la apariencia (colores, fuentes, espacios, sombras, esquinas) vive en **un solo archivo**: `src/styles/tokens.css`. Cambiar un valor ahí cambia el sitio entero.

Conversación en español, una pregunta a la vez. Antes de tocar nada, leer `tokens.css` para conocer los valores actuales y explicar qué hace cada variable si la persona pregunta. La tabla completa con descripciones está en [THEMING.md](../../../THEMING.md).

## Paso 1 — Qué quiere cambiar

Preguntar: **¿Qué parte de la apariencia del sitio quieres cambiar?** Las opciones más comunes:

**Colores:**
- Color de acento (botones, enlaces, badges) — `--color-accent`
- Color de fondo del sitio — `--color-background`
- Color de las tarjetas — `--color-surface`
- Color del texto principal — `--color-text`
- Color del texto secundario (descripciones) — `--color-text-muted`
- Color "beige" (etiquetas suaves) — `--color-beige`

**Tipografías (fuentes):**
- Fuente de los **títulos** (incluye el wordmark "Saviacera" en la cabecera) — `--font-display`
- Fuente del **texto** del sitio — `--font-body`

**Forma y espacio:**
- Esquinas redondeadas — `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-pill`
- Espaciado general — `--space-1` hasta `--space-12`
- Sombras de tarjetas — `--shadow-sm` / `--shadow-md` / `--shadow-lg`

Si lo que pide no encaja directamente en una variable, leer `tokens.css` y proponer la variable más cercana, o avisar que es un cambio más grande que requiere mover código (en cuyo caso pedirle ayuda a Hector).

## Paso 2 — Cuál es el valor nuevo

### Para colores

Aceptar cualquiera de estos formatos:
- Hex tradicional: `#c2683f`
- Nombres CSS: `tomato`, `peru`, `coral`, etc.
- OKLCH (formato moderno, recomendado): `oklch(62% 0.135 40)`
- Descripción en lenguaje natural: "un poco más oscuro", "más naranja", "más terroso" — en ese caso proponer un valor concreto y preguntar: "¿Algo así (`#a45530`)?"

### Para fuentes (tipografías)

Preguntar: **¿Cuál fuente quieres usar?** y de dónde viene:

- **Google Fonts** (lo más común y gratis): pedir el nombre exacto, ej. "Playfair Display", "Inter", "Montserrat", "Lora". Si no está segura del nombre, sugerir abrir https://fonts.google.com y buscar.
- **Fuente del sistema** (sin descarga): nombres como `Georgia`, `Helvetica`, `Times New Roman`, `system-ui`, `serif`, `sans-serif`.

Si es de Google Fonts, **además de cambiar la variable en tokens.css, hay que actualizar el `<link>` en `src/layouts/BaseLayout.astro`** para que cargue la fuente. Buscar el bloque que tiene `fonts.googleapis.com` y reemplazar el nombre de la fuente vieja por la nueva. Si la persona quiere variantes (negrita, cursiva), pedir cuáles (típicamente `400;600;700` cubre la mayoría de casos).

Ejemplo de cómo se ve la URL de Google Fonts:
```
https://fonts.googleapis.com/css2?family=<NombreDeFuente>:wght@400;600;700&display=swap
```

### Para esquinas, espacios, sombras

Aceptar valores en `rem`, `px`, o multiplicadores. Si dicen "más redondo", proponer un valor (ej. `12px` → `16px`).

## Paso 3 — Aplicar el cambio

Usar Edit para cambiar **solo** las variables mencionadas en `src/styles/tokens.css`. **No reescribir todo el archivo** — preservar comentarios y orden de las variables.

Si fue cambio de fuente Google Fonts: también editar `src/layouts/BaseLayout.astro`. Solo el `<link>` que carga la fuente vieja — no tocar nada más del layout.

## Paso 4 — Vista previa

Avisar: "Para ver el cambio antes de publicarlo, abre otra ventana y corre `npm run dev` (te lo abre Hector si no tienes la terminal a mano), y mira en http://localhost:4321. Si quieres, lo publicamos directo y lo vemos en saviacera.com — el sitio se actualiza en menos de un minuto."

## Paso 5 — Publicar

Mismo patrón que los otros skills:
1. `git add src/styles/tokens.css` (y `src/layouts/BaseLayout.astro` si se cambió fuente)
2. `git commit -m "Tema: <descripción corta>"` — ej. "Tema: color de acento a terracota más oscura" o "Tema: fuente de títulos a Playfair Display"
3. `git push origin main`
4. Confirmar: "Publicado. El sitio se actualiza en ~30 segundos a 1 minuto."

## Caso especial: el logo de la marca

El logo de Saviacera actualmente es solo texto ("Saviacera") usando la fuente de los títulos (`--font-display`). Cuando cambias `--font-display`, el logo también cambia automáticamente.

Si en el futuro la dueña quiere:

- **Un logo separado con su propia fuente** (distinta a la de los títulos): hay que agregar `--font-logo` como variable nueva en `tokens.css` y aplicarla en `src/components/Header.astro`. Avisar que esto requiere un cambio más estructural y se lo deja a Hector o a una sesión más técnica de Claude.
- **Una imagen de logo** (SVG/PNG con la marca dibujada, en vez de texto): subir el archivo a `public/logo.svg` (o el formato que sea), y modificar `src/components/Header.astro` para usar `<img>` en lugar del texto. Esto también es un cambio que se le deja a Hector.

## Reglas

- **No hardcodear valores en componentes.** Si la persona pide algo que requeriría poner un color o fuente literal en un `.astro` o `.css` que no sea `tokens.css`, decir: "Eso requiere agregar una variable nueva al tema primero. Lo hacemos así: …" — y agregar la variable a `tokens.css` Y al theme block en `src/styles/global.css` (donde Tailwind expone los tokens).
- **Cambios complejos** (rediseño, mover secciones, nuevos componentes) — esto NO es de este skill. Decir: "Eso es un cambio más grande, mejor pedírselo a Hector o a una sesión de Claude más profunda."
- **Si quiere ver muchas opciones de fuentes**, sugerir https://fonts.google.com y dejar que explore. No proponer una lista exhaustiva — abrumar al usuario es peor que dar dos o tres opciones concretas.
