# Portada

**Reporte técnico: Integración Continua (CI) vinculada al sistema de control de versiones**  
**Proyecto:** dctoralia  
**Herramienta CI:** GitHub Actions  
**Sistema de control de versiones:** Git (repositorio en GitHub)  
**Fecha:** 13 de marzo de 2026  

---

# Introducción

La Integración Continua (CI) es una práctica de ingeniería de software donde los cambios de código se integran frecuentemente en una rama compartida y se validan automáticamente mediante procesos de compilación, pruebas y verificaciones técnicas.

En este proyecto se implementó una configuración real de CI usando GitHub Actions para automatizar la validación del código en cada cambio relevante del repositorio.

## ¿Qué es la integración continua?

Es una práctica DevOps que busca detectar errores tempranamente, asegurar que el código sea integrable en todo momento y reducir riesgos en despliegues.

## Objetivo del reporte

Documentar la configuración de una herramienta de CI vinculada al repositorio del proyecto, demostrar su ejecución automática y justificar técnicamente su aporte a la calidad del software.

---

# Descripción del repositorio

## Plataforma utilizada

- GitHub (repositorio con control de versiones Git)

## Flujo de trabajo de desarrollo

1. El desarrollador realiza cambios en una rama.
2. Se hace push o se abre Pull Request hacia ramas principales.
3. GitHub Actions ejecuta automáticamente el pipeline.
4. El pipeline valida el proyecto en tres etapas: validación, pruebas y build.
5. Con resultados correctos, los cambios son aptos para integración.

## Captura del repositorio

- Evidencia sugerida: captura de pantalla del repositorio en GitHub mostrando ramas y pestaña Actions.
- Insertar imagen en esta sección antes de la entrega final.

## Estructura básica del proyecto

Estructura resumida del proyecto analizado:

```text
.
├── prisma/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── server/
│   └── styles/
├── docs/
├── package.json
└── .github/workflows/ci.yml
```

---

# Configuración de la herramienta de Integración Continua

## Herramienta seleccionada

- GitHub Actions

## Archivo de configuración

- `.github/workflows/ci.yml`

## Etapas implementadas

- **Validación:** `pnpm typecheck`
- **Pruebas automatizadas:** `pnpm test` (Vitest)
- **Build:** `pnpm build` (Next.js)

## Fragmento del archivo de configuración

```yaml
name: CI

on:
  push:
    branches: ["main", "master", "develop"]
  pull_request:
    branches: ["main", "master", "develop"]

jobs:
  build-test-validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

## Capturas de ejecución del pipeline

- Evidencia sugerida 1: ejecución exitosa en pestaña Actions (estado verde).
- Evidencia sugerida 2: detalle por job/step (install, typecheck, test, build).
- Insertar imágenes en esta sección antes de la entrega final.

---

# Vinculación con el sistema de control de versiones

## Evento que dispara el pipeline

El pipeline se dispara automáticamente con:

- `push` a ramas `main`, `master` o `develop`
- `pull_request` hacia ramas `main`, `master` o `develop`

## Integración automática con el repositorio

Al estar el archivo `ci.yml` en la ruta estándar de GitHub Actions, el repositorio detecta automáticamente la configuración y ejecuta el flujo sin intervención manual.

## Evidencia de ejecución automática

- Cada commit/pull request activa un workflow en la pestaña Actions.
- Se registra estado, duración y logs por etapa.

---

# Resultados obtenidos

## Evidencia de ejecución exitosa

Se ejecutaron localmente los comandos equivalentes del pipeline:

- `pnpm test` -> **Exitoso**
  - 1 archivo de pruebas
  - 8 pruebas aprobadas
- `pnpm typecheck` -> **Exitoso**
- `pnpm build` -> **Exitoso**
  - Compilación Next.js completada
  - Generación de rutas y artefactos finalizada

## Evidencia de fallo (prueba de falla)

Durante la implementación se probó inicialmente una validación más estricta con `pnpm check` (lint + typecheck), la cual falló por errores de lint preexistentes en varios módulos.

Esto permitió comprobar que la CI detecta fallas reales y evita integrar código con incumplimientos de calidad.

## Interpretación de resultados

- El pipeline sí ejecuta build y pruebas de manera confiable.
- La fase de validación es sensible al estado de calidad del código.
- La automatización reduce el riesgo de integrar cambios defectuosos.

---

# Justificación técnica

## Por qué GitHub Actions es adecuada

- Está integrada nativamente con GitHub.
- Permite definir pipelines como código (YAML) versionado junto al proyecto.
- No requiere infraestructura propia para comenzar.

## Beneficios al proyecto

- Validación automática en cada cambio.
- Detección temprana de errores.
- Estandarización del proceso de integración.
- Mejor trazabilidad de calidad por commit.

## Cómo mejora la calidad del software

- Fuerza verificación de pruebas unitarias antes de integrar.
- Asegura que el proyecto compile continuamente.
- Reduce regresiones al detectar errores temprano.

## Relación con enfoque DevOps

- CI es una práctica central de DevOps.
- Favorece ciclos cortos de retroalimentación.
- Integra desarrollo y aseguramiento de calidad en flujo continuo.

---

# Conclusiones

## Reflexión personal

### Ventajas de implementar CI

- Mayor confianza en cada integración.
- Menor tiempo de detección de fallos.
- Estandarización técnica del equipo.

### Dificultades encontradas

- Existencia de validaciones estrictas que revelaron deuda técnica previa.
- Ajuste inicial de scripts para alinear etapas de pipeline con el estado actual del proyecto.

### Aprendizajes obtenidos

- Configurar CI no es solo ejecutar comandos: también exige comprender el estado real del código.
- Es recomendable introducir validaciones progresivas para elevar calidad de manera sostenible.
- Documentar evidencia es clave para auditoría técnica y académica.

---

# Referencias (APA 7)

GitHub Docs. (2026). *Understanding GitHub Actions*. GitHub. https://docs.github.com/en/actions/about-github-actions/understanding-github-actions

Fowler, M. (2006). *Continuous Integration*. Martin Fowler. https://martinfowler.com/articles/continuousIntegration.html

Atlassian. (2026). *What is continuous integration (CI)?* Atlassian. https://www.atlassian.com/continuous-delivery/continuous-integration

Amazon Web Services. (2026). *What is DevOps?* AWS. https://aws.amazon.com/devops/what-is-devops/

Git. (2026). *Git - Fast Version Control System*. https://git-scm.com/
