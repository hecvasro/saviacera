---
name: agregar-producto
description: Agrega un nuevo producto al catálogo de Saviacera. Invocar cuando la persona diga cosas como "agregar producto", "nuevo producto", "subir una vela / jabón / kit", "crear producto", o describa un producto que quiera publicar.
---

# Agregar un producto nuevo a Saviacera

Este skill guía a la persona (típicamente la dueña, hablando en español) a agregar un producto al catálogo. **Toda la conversación es en español.** Hacer preguntas una a la vez. Validar cada respuesta antes de continuar. No saltar pasos.

## Paso 1 — Saludo y categoría

Saludar brevemente: "¡Hola! Vamos a agregar un producto nuevo al catálogo. Te voy a hacer algunas preguntas, una por una."

Preguntar: **¿Qué tipo de producto es?** Las categorías válidas son:

- Vela (`velas`)
- Ambientador / room spray (`ambientadores`)
- Difusor (`difusores`)
- Jabón (`jabones`)
- Set / combo (`sets`)
- Otro (`otros`) — comodín si no encaja en lo anterior

## Paso 2 — Nombre

Preguntar: **¿Cómo se llama el producto?** (ejemplo: "Vela de Coco y Vainilla").

Generar el slug automáticamente:

- minúsculas, sin acentos, sin espacios (usar guiones)
- "Vela de Coco y Vainilla" → `vela-coco-vainilla`
- Decírselo: "Voy a usar `vela-coco-vainilla` como el nombre del archivo. ¿Está bien o prefieres otro?"

## Paso 3 — Descripción corta y larga

Preguntar:

1. **¿Cuál es la frase corta que describe el producto?** (tagline, opcional, 1 línea). Ej: "Aroma suave y duradero para tu sala."
2. **¿Cuál es la descripción larga?** (2-4 líneas). Si la persona da una sola línea, está bien.

## Paso 4 — Precio y SKU

Preguntar:

1. **¿Cuál es el precio en pesos dominicanos (DOP)?** — debe ser un número entero positivo. Si dan "RD$850" o "850 pesos", limpiar a `850`.
2. **¿Cuál es el SKU?** (opcional, formato libre tipo `VEL-COC-VAI-200`). Si no tienen, omitir.

No se pregunta por inventario/stock — la tienda no lo lleva.

## Paso 5 — Variaciones (opcional)

Preguntar: **¿Este producto viene en varias opciones que el cliente debe elegir?** (por ejemplo: distintos aromas, tamaños, o tipo de cera).

- Si dicen **no**: omitir, seguir al paso 6.
- Si dicen **sí**:
  1. **¿Cómo se llama el grupo de opciones?** Ej: "Aroma", "Tamaño", "Tipo de cera". Esto es `variantLabel`.
  2. Pedir las opciones **una por una**: **¿Cuál es la primera opción?** (ej. "Lavanda"). Después de cada una, preguntar **¿Hay otra opción?** hasta que diga que no.
  3. Por cada opción, preguntar: **¿Esta opción cuesta distinto al precio normal, o igual?** Si cuesta igual, dejar el precio vacío (usará el precio del paso 4). Si cuesta distinto, pedir el número entero. Esto es el `priceDOP` de la opción.
  4. SKU por opción es opcional; solo preguntarlo si la persona lo menciona.

El cliente tendrá que elegir una opción antes de agregar al carrito, y la opción aparece en el pedido de WhatsApp.

## Paso 6 — Imágenes

Preguntar: **¿Tienes una URL de la foto del producto?**

- Si dicen sí: pedir la URL. Validar que empiece con `http` y termine en `.jpg`/`.png`/`.webp`/etc.
- Si dicen no: usar `https://picsum.photos/seed/<slug>/800/800` como placeholder temporal y avisar que más tarde se reemplaza con la foto real.

Si quieren agregar más de una foto, preguntar por cada URL adicional.

## Paso 7 — Si es set, qué incluye

**Solo si el producto es un set:** preguntar **¿Qué incluye el set?** Tomar la lista como strings separados (uno por ítem). Ej: "1 vela de coco", "1 jabón de café", "tarjeta a mano".

También preguntar: **¿De qué temporada es?** Sugerir: `san-valentin`, `dia-de-las-madres`, `dia-del-maestro`, `navidad`, `regalo`. Si dicen otra cosa, usar lo que digan en formato slug. Eso va en `tags`.

## Paso 8 — Detalles adicionales

Preguntar: **¿Quieres agregar detalles que aparezcan en la página del producto?** (lista de strings tipo "Aroma: rosas + cardamomo", "Duración: ~40h", "Sin parabenos"). Si dicen "no", omitir.

## Paso 9 — Destacado y orden

Preguntar:

1. **¿Quieres que aparezca destacado en la página principal?** (sí/no — default no).
2. **¿En qué orden quieres que aparezca?** Explicar: "Número más bajo = más arriba en la lista. Por ejemplo, 10 sale antes que 20. Si no sabes, déjalo en 100." Default `100`.

## Paso 10 — Vista previa

Mostrarle el frontmatter completo en bloque de código markdown. Algo así:

```
---
name: "Vela de Coco y Vainilla"
tagline: "Aroma cálido para tu sala"
description: |
  Vela de cera de soya con notas de coco y vainilla.
  Quema limpio durante unas 40 horas.
category: velas
tags: []
priceDOP: 850
sku: "VEL-COC-VAI-200"
available: true
variantLabel: "Aroma"
variants:
  - name: "Coco y Vainilla"
  - name: "Lavanda"
  - name: "Sándalo"
    priceDOP: 950
images:
  - "https://picsum.photos/seed/vela-coco-vainilla/800/800"
details:
  - "Aroma: coco + vainilla"
  - "Duración: ~40h"
featured: false
order: 100
createdAt: 2026-05-11
---
```

Si el producto **no** tiene variaciones, omitir las líneas `variantLabel` y `variants` por completo (no poner `variants: []` ni dejar `variantLabel` vacío).

Preguntar: **¿Está bien así o quieres cambiar algo?**

Si quiere cambiar algo, volver al paso específico. Si está OK, continuar al paso 11.

## Paso 11 — Guardar el archivo

Crear el archivo `src/content/products/<slug>.md` con el frontmatter + descripción larga como cuerpo (el texto del paso 3). Usar el Write tool.

`createdAt` siempre = fecha de hoy.

## Paso 12 — Confirmar y publicar

Decir: "Listo, el producto ya está creado en el archivo `src/content/products/<slug>.md`. ¿Lo publicamos al sitio web ahora?"

Si dice sí:

1. `git add src/content/products/<slug>.md`
2. `git commit -m "Agregar producto: <nombre del producto>"`
3. `git push origin main`
4. Avisar: "Publicado. El sitio se actualiza solo en ~30 segundos a 1 minuto. Puedes verlo en https://saviacera.com."

Si dice no: "OK, queda guardado en tu computadora. Cuando estés lista, dime '/publicar' o vuelve a abrir Claude y dime 'publica los cambios'."

## Reglas importantes

- **Si en algún momento la persona no sabe qué responder**, ofrecer un ejemplo o un default sensato y seguir.
- **Nunca asumir** valores críticos (precio, nombre, categoría) — siempre preguntar.
- **Variaciones**: el precio por opción es opcional; si se deja, debe ser un entero positivo. Nunca escribir `priceDOP: ""` en una opción — si cuesta igual, omitir la línea `priceDOP` de esa opción.
- **Validar el slug** contra los archivos existentes en `src/content/products/`. Si ya existe, sugerir un sufijo (`-v2`) o un nombre diferente.
- **No tocar otros archivos** del repo. Solo crear el nuevo `.md` y hacer commit.
- **Tono cálido y conciso.** Como si fueras una asistente que ayuda con la tienda.
