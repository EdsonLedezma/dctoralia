# Deployments de Vercel

La configuración sólo permite despliegues de Git desde `main`. Los pushes a otras ramas y todos los Preview Builds —incluidos los PRs dirigidos a `main`— quedan deshabilitados. Vercel publica producción cuando recibe un push a `main` (por ejemplo, al fusionar el PR).

`git.deploymentEnabled` usa patrones de nombres de ramas; `preview` no es una clave especial para el entorno Preview. El patrón `*` desactiva las demás ramas y `main` vuelve a habilitar la de producción. `ignoreCommand` refuerza el filtro: devuelve `1` para continuar el build de `main` y `0` para omitir cualquier otra rama.

La configuración está en `vercel.json`; no requiere token adicional ni cambios al dashboard. La CLI global está instalada, pero no se autenticó ni vinculó este proyecto.
