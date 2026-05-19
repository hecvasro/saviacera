---
name: editar-producto
description: Edita un producto existente del catálogo de Saviacera (cambiar precio, descripción, variaciones, orden, etc.). Invocar cuando la persona diga "cambiar producto", "editar producto", "actualizar precio", "modificar descripción", "agregar/quitar aroma", "cambiar variaciones", o algo similar.
---

# Editar un producto existente

Este skill ayuda a modificar un producto del catálogo. **Conversación en español, una pregunta a la vez.**

## Paso 1 — Identificar el producto

Si la persona ya mencionó qué producto quiere editar, ir al paso 2. Si no:

1. Listar los productos disponibles. Leer todos los `.md` en `src/content/products/` y mostrar nombre + categoría + precio:
   ```
   Velas:
     - Vela de Coco y Vainilla (RD$850)
   Jabones:
     - Jabón de Café & Cacao (RD$350)
   Sets:
     - Set de Día de las Madres (RD$1.500)
   ```
2. Preguntar: **¿Cuál producto quieres editar?**

Aceptar el nombre exacto o aproximado. Buscar coincidencia "fuzzy" — si dicen "vela coco" → coincide con `vela-coco-vainilla.md`.

## Paso 2 — Qué quieren cambiar

Leer el archivo y mostrar los valores actuales. Preguntar: **¿Qué quieres cambiar?**

Sugerir las opciones más comunes:

- Precio (`priceDOP`)
- Disponibilidad (`available`)
- Nombre o tagline
- Descripción
- Foto(s)
- Variaciones (agregar / quitar / renombrar opciones, cambiar precio por opción)
- Orden en la lista (`order`)
- Destacado en home (`featured`)
- Detalles
- Si es set: qué incluye

## Paso 3 — Hacer el cambio

Para cada campo que quieran cambiar, mostrar el valor actual y preguntar el nuevo. Ej:

> Actualmente el precio es RD$850. ¿A cuánto quieres ponerlo?

Validar como en `agregar-producto`:

- Precio: número entero positivo.
- Categoría: solo `velas`, `ambientadores`, `difusores`, `jabones`, `sets`, `otros`.
- Imágenes: URLs válidas (o `picsum.photos` placeholder).

### Variaciones — sub-flujo

Si quieren tocar variaciones, ofrecer estos sub-cambios uno a la vez:

1. **Agregar una opción nueva** → pedir nombre; preguntar si cuesta igual o distinto (mismo manejo que el paso 5 de `/agregar-producto`).
2. **Quitar una opción** → mostrar la lista actual, pedir cuál borrar.
3. **Renombrar una opción** o cambiar su precio.
4. **Cambiar el nombre del grupo** (`variantLabel`): ej. de "Aroma" a "Fragancia".
5. **Eliminar todas las variaciones** del producto → borrar `variantLabel` y `variants` enteros.

Reglas:

- El precio por opción es opcional. Si una opción cuesta igual que el precio base, **omitir** la línea `priceDOP` de esa opción — nunca dejar `priceDOP: ""`.
- Si quedan cero opciones, eliminar también la línea `variantLabel`.

## Paso 4 — Vista previa del cambio

Mostrar un diff resumido:

```
Cambios:
  priceDOP: 850 → 950
  variants: agregar "Sándalo" (RD$1.000)
```

Preguntar: **¿Aplicamos estos cambios?**

## Paso 5 — Guardar

Usar el Edit tool para cambiar solo los campos modificados en el frontmatter. **No reescribir todo el archivo** — preservar comentarios, orden de campos, y el cuerpo del markdown.

## Paso 6 — Publicar

Decir: "Cambios guardados en `src/content/products/<slug>.md`. ¿Publicamos al sitio?"

Si sí:

1. `git add src/content/products/<slug>.md`
2. `git commit -m "Editar producto: <nombre> (<resumen del cambio>)"` — ej: "Editar producto: Vela de Coco y Vainilla (precio y nueva variación)"
3. `git push origin main`
4. Confirmar: "Publicado. Actualización en línea en ~30s a 1min."

Si no: "OK, guardado localmente. Usa `/publicar` cuando quieras enviarlo."

## Casos especiales

**Cambiar foto:** preferir el skill `/actualizar-foto`. Si la persona ya está en este flujo, está OK manejarlo aquí, pero ofrecer: "Para cambiar fotos hay un comando más directo, `/actualizar-foto`. ¿Lo prefieres?"

**Cambio masivo (varios productos):** procesar uno por uno; no batchear. Después del primero, preguntar: "¿Quieres editar otro producto?"

**Si el producto no existe:** decir cuáles encontraste y sugerir corregir el nombre o usar `/agregar-producto`.
