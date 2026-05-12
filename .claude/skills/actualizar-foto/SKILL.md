---
name: actualizar-foto
description: Cambia o agrega la foto de un producto en Saviacera. Invocar cuando la persona diga "cambiar foto", "actualizar imagen", "subir nueva foto", "reemplazar imagen", o similar.
---

# Cambiar / agregar la foto de un producto

Conversación en español, una pregunta a la vez.

## Paso 1 — Identificar el producto

Si no se mencionó: listar productos y preguntar cuál. Igual que en `editar-producto`.

## Paso 2 — Mostrar las fotos actuales

Leer el archivo y mostrar la lista actual de imágenes:

```
Fotos actuales de Vela de Coco y Vainilla:
  1. https://picsum.photos/seed/vela-coco-vainilla/800/800  (placeholder)
```

## Paso 3 — Qué quiere hacer

Preguntar: **¿Qué quieres hacer?**
- (a) Reemplazar la foto principal (la #1, que es la portada)
- (b) Agregar una foto adicional
- (c) Quitar una foto
- (d) Reordenar las fotos

## Paso 4 — Obtener la nueva URL

Si la persona tiene la foto en su computadora (no es URL), pedir que primero la suba a algún lugar accesible (por ejemplo Drive con enlace público, o algún servicio de hosting de imágenes), y darle la URL resultante.

**Si está usando picsum.photos:** advertir gentilmente que es solo un placeholder y conviene reemplazarlo con la foto real cuando esté lista.

Validar la URL:
- Empieza con `http://` o `https://`
- Idealmente termina en `.jpg`, `.jpeg`, `.png`, `.webp`, o `.avif`
- Si la URL parece de Google Drive (`drive.google.com`), advertir: "Esa URL no funciona directamente. Necesitamos un link compartible público de imagen. Puedes intentar abrir la foto en Drive, botón derecho 'Obtener enlace', y compartirla pública. Si tienes problemas, dímelo y vemos otra opción."

## Paso 5 — Aplicar el cambio

Para reemplazar la foto principal: cambiar el primer elemento del array `images:` en el frontmatter.

Para agregar: poner la nueva URL al final del array.

Para quitar: borrar el elemento del array. Si solo queda una foto y es la #1, dejar al menos un placeholder.

Para reordenar: preguntar el orden deseado y reescribir el array.

Usar Edit para no tocar nada más del archivo.

## Paso 6 — Vista previa y publicar

Mostrar las imágenes actualizadas y preguntar: **¿Lo publicamos?**

Si sí:
1. `git add src/content/products/<slug>.md`
2. `git commit -m "Actualizar foto: <nombre del producto>"`
3. `git push origin main`
4. Confirmar publicación.

## Nota técnica (no decírselo a menos que pregunte)

El campo `images` es un array. El primer elemento es la foto de portada (la que aparece en las tarjetas del listado). Todas las fotos aparecen en la galería de la página del producto.
