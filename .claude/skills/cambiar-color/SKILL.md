---
name: cambiar-color
description: Cambia un color, tipografía, o tamaño del tema visual de Saviacera. Invocar cuando la persona diga "cambiar color", "cambiar tipografía", "modificar el tema", "que se vea más X", "fondo más oscuro", etc.
---

# Cambiar la apariencia del sitio (colores, tipografía, espacios)

Toda la apariencia vive en **un solo archivo**: `src/styles/tokens.css`. Cambiar un valor ahí cambia el sitio entero.

Conversación en español. Antes de tocar nada, **mostrarle a la persona la tabla de [THEMING.md](../../../THEMING.md)** o explicarle qué hace cada variable si pregunta.

## Paso 1 — Qué quiere cambiar

Preguntar: **¿Qué parte del sitio quieres cambiar?** Sugerir las opciones más comunes:
- Color principal (el de los botones / acento) — `--color-accent`
- Color de fondo — `--color-background`
- Color del texto — `--color-text`
- Tipografía de títulos — `--font-display`
- Tipografía del texto — `--font-body`
- Esquinas redondeadas (radios) — `--radius-sm/md/lg`
- Espaciado general — `--space-*`

Si menciona algo que no se mapea directo, leer `tokens.css` para ver qué variable encaja mejor.

## Paso 2 — Cuál es el valor nuevo

Para colores, aceptar:
- Hex: `#c2683f`
- Nombre CSS: `tomato`, `peru`, etc.
- OKLCH moderno: `oklch(62% 0.135 40)` (recomendado)
- Descripción de la persona ("un poco más oscuro", "más rojo") — en ese caso, proponer un valor concreto y preguntar: "¿Algo así (`#a45530`)?"

Para tipografías, aceptar nombres de Google Fonts (ej. "Playfair Display"). Recordar que también hay que actualizar el `<link>` en `src/layouts/BaseLayout.astro` si la fuente nueva es de Google Fonts.

## Paso 3 — Aplicar el cambio

Usar Edit para cambiar **solo** la variable mencionada en `src/styles/tokens.css`. No tocar nada más.

Si es un cambio de fuente y viene de Google Fonts: también editar `src/layouts/BaseLayout.astro` para cargar la fuente nueva (buscar `fonts.googleapis.com` y reemplazar el nombre).

## Paso 4 — Vista previa

Avisar: "Para ver el cambio antes de publicarlo, corre `npm run dev` en otra ventana y abre http://localhost:4321. Si no tienes eso a mano, lo publicamos y lo vemos directo en saviacera.com."

## Paso 5 — Publicar

Mismo patrón:
1. `git add src/styles/tokens.css` (y `src/layouts/BaseLayout.astro` si fue fuente)
2. `git commit -m "Tema: cambiar <descripción> (ej. 'color de acento a terracota más oscura')"`
3. `git push origin main`
4. Confirmar publicación.

## Reglas

- **No hardcodear colores en componentes.** Si la persona pide algo que requeriría poner un color literal en un `.astro` o `.css` que no sea `tokens.css`, decir: "Eso requiere agregar una variable nueva al tema primero. Lo hacemos así: …" — y agregar la variable a `tokens.css` Y al theme block en `src/styles/global.css` (donde Tailwind expone los colores).
- **Cambios complejos** (rediseño, nuevo layout, mover secciones) — esto NO es lo de este skill. Decir: "Eso es un cambio más grande, mejor pedírselo a Hector o a una sesión de Claude más profunda."
