---
name: borrar-producto
description: Quita un producto del catálogo de Saviacera. Invocar cuando la persona diga "borrar producto", "eliminar producto", "quitar producto", "ya no vendo X", o similar.
---

# Borrar / despublicar un producto

Hay **dos formas** de quitar un producto del sitio. Antes de borrar, preguntar cuál prefiere:

1. **Despublicar (recomendado)** — marca el producto como no disponible. El archivo se queda, así que si después lo quieren volver a vender, solo cambian `available: true`. Esta es la opción segura.
2. **Borrar de verdad** — elimina el archivo. No se puede recuperar fácilmente (aunque queda en el historial de git).

## Paso 1 — Identificar el producto

Si no se dijo cuál: listar productos (como en `editar-producto` paso 1) y preguntar cuál.

## Paso 2 — Preguntar la forma

> ¿Quieres **despublicarlo** (quitar del sitio pero guardar el archivo) o **borrarlo definitivamente**?

Sugerir despublicar a menos que la persona insista en borrar.

## Paso 3a — Si despublica

1. Usar Edit para cambiar `available: true` → `available: false` en el frontmatter del archivo.
2. Confirmar: "Listo, el producto ya no aparecerá en el sitio pero queda guardado. Si después quieres volver a venderlo, dime y lo activamos de nuevo."
3. Pasar al paso 4 (publicar).

## Paso 3b — Si borra

1. Confirmar una vez más: **"¿Seguro que quieres borrar `<nombre>` definitivamente? Esto no se deshace fácilmente."**
2. Si confirma: `git rm src/content/products/<slug>.md`
3. Si dice que no: cancelar y ofrecer despublicar en su lugar.

## Paso 4 — Publicar

Mismo patrón que los otros skills:
1. `git commit -m "Despublicar producto: <nombre>"` (o "Borrar producto: <nombre>")
2. `git push origin main`
3. Confirmar: "Publicado. El sitio se actualiza en ~30 segundos."

Si la persona dice que no quiere publicar todavía: dejar el cambio en local y mencionar `/publicar`.
