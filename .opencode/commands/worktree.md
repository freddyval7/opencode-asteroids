---
description: Crea un git worktree en .worktrees/<nombre> basado en el contexto dado
agent: build
---

El usuario ejecutó /worktree con el siguiente argumento:

$ARGUMENTS

Analiza ese texto (que puede tener espacios, ser una descripción o frase de contexto)
y deriva un nombre corto, descriptivo y en formato kebab-case para un worktree de git.
Solo el nombre, sin ruta. Aplica estas reglas de transformación:

- Minúsculas.
- Acentos y diacríticos eliminados (á -> a, ñ -> n).
- Palabras separadas por guiones `-`.
- Sin caracteres especiales ni espacios.
- Máximo 3-5 palabras.
- Sin prefijos como `feature/` o `bugfix/`, solo el nombre plano.

Ejemplos:

- "agregar sistema de partículas" -> `sistema-particulas`
- "fix login bug" -> `fix-login-bug`
- "WIP experimento audio" -> `experimento-audio`
- "refactor navegador y pestañas" -> `refactor-navegador-pestanas`

Caso de argumento vacío: si `$ARGUMENTS` está vacío, NO ejecutes nada. En su lugar,
pídele al usuario un nombre o descripción para el worktree y termina. No inventes un
nombre por defecto.

Cuando tengas el nombre derivado, ejecuta EXACTAMENTE este comando y nadie más:

!`git worktree add .worktrees/<nombre-derivado>`

Reglas estrictas:

- No cambies de directorio (no cd / Set-Location / Push-Location).
- No crees la carpeta `.worktrees` manualmente; `git worktree add` la crea.
- No agregues pasos adicionales: no commit, no branch extra, no abrir editor,
  no inicializar nada.
- No edites ni crees archivos del proyecto.
- No imprimas resúmenes ni explicaciones; solo confirma la creación del worktree.
- Si `git worktree add` falla, reporta el error textual del comando y termina.
- Si los argumentos son muy largo, simplificalo a un nombre significativo.
