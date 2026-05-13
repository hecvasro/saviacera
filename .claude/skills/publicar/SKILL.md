---
name: publicar
description: Publica al sitio web los cambios pendientes del repositorio. Invocar cuando la persona diga "publicar", "subir cambios", "actualizar el sitio", "hacer push", o quiera enviar trabajo local al sitio en vivo.
---

# Publicar los cambios al sitio

Este skill toma todo lo que está pendiente en el repositorio local y lo publica al sitio https://saviacera.com.

## Paso 1 — Ver qué hay pendiente

Correr `git status` y mostrar a la persona qué archivos están modificados o sin commitear. Si no hay nada pendiente, decir: "No hay cambios para publicar — el sitio ya tiene la última versión." y terminar.

Si hay cambios sin stagear, también correr `git diff --stat` para mostrar un resumen.

## Paso 2 — Confirmar

Preguntar: **¿Publicamos estos cambios?** y listar los archivos. Esperar confirmación.

Si dice no: "OK, los cambios quedan guardados en tu computadora. Cuando estés lista, vuelve a decirme '/publicar'."

## Paso 3 — Stagear, commitear, pushear

Si hay archivos sin stagear:
1. Preguntar **¿Quieres un mensaje corto que describa los cambios?** — aceptar respuesta o sugerir uno basado en el `git status` (ej. "Actualizar producto: Vela de Coco" si solo hay un `.md` modificado).
2. `git add <archivos>` — agregar por nombre, **no usar `git add -A`** (más seguro).
3. `git commit -m "<mensaje>"`

Si hay commits locales pero ya estaban hechos (caso después de skills anteriores): saltar a push.

`git push origin main`.

## Paso 4 — Confirmar el deploy

Decir: "Cambios publicados. Cloudflare está desplegando el sitio — debería estar en línea en https://saviacera.com en 30 segundos a 1 minuto."

Si el push falla por algún motivo (conflicto con remoto, autenticación, etc.), explicar el error en lenguaje claro y sugerir el próximo paso:
- Si es conflicto: "Alguien hizo cambios en el repo desde la última vez. Corre `git pull origin main` antes de pushear de nuevo. Si te pide resolver algo, mejor llama a Hector."
- Si es auth: "Parece que tu computadora no está autorizada para pushear. Llama a Hector para revisar las llaves SSH."

## Variables importantes

Este skill asume que el repositorio está conectado a Cloudflare Workers Builds con auto-deploy desde la rama `main`. Si **no** está conectado todavía, decir al final: "El push fue exitoso pero todavía no tenemos auto-deploy configurado. Hector tiene que correr `npm run deploy` para que el sitio se actualice."

Para saber si el auto-deploy está configurado, leer `CLAUDE.md` → sección "Deployment". Si dice que el auto-deploy está activo, todo en automático; si dice que sigue manual, avisar como arriba.
