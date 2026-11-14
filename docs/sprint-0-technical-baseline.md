# Sprint 0 — Propuesta de línea base técnica

**Proyecto:** Sistema de Planificación y Control de Vacaciones Decembrinas  
**Fecha:** 2026-11-14  
**Estado:** PROPUESTA — PENDIENTE DE APROBACIÓN  
**Repositorio:** https://github.com/ingjazar-jpg/Planificacion_Viajes

## 1. Objetivo

Fijar las versiones principales del entorno de desarrollo y sus convenciones de ejecución local para que la configuración sea reproducible entre GitHub y el equipo local.

Esta propuesta no modifica el stack obligatorio aprobado en ARCH-001.

## 2. Versiones propuestas

| Componente | Versión objetivo | Criterio |
|---|---|---|
| Python | 3.14.x | Rama de correcciones activas y ecosistema maduro |
| FastAPI | 0.142.x | Versión estable vigente consultada |
| Pydantic | 2.14.x | Rama 2.x compatible con Python 3.14 |
| Uvicorn | 0.54.x | Versión estable vigente consultada |
| Pytest | 9.2.x | Versión estable vigente consultada |
| Node.js | 26.x LTS | Rama Active LTS |
| npm | Incluido con Node.js 26 | Gestor único del frontend |
| React | 19.3.x | Versión estable vigente |
| Vite | 8.3.x | Rama vigente con mantenimiento regular |

Las versiones menores y de parche se verificarán nuevamente al generar los manifiestos. Se fijarán versiones exactas en los archivos de dependencias/lock para que las instalaciones posteriores reproduzcan el mismo entorno.

## 3. Referencias oficiales consultadas

- Python: https://www.python.org/doc/versions/
- Estado y ciclo de vida de Python: https://devguide.python.org/versions/
- Node.js Releases: https://nodejs.org/en/about/previous-releases
- FastAPI Release Notes: https://fastapi.tiangolo.com/release-notes/
- Pydantic Changelog: https://pydantic.dev/docs/validation/latest/get-started/changelog/
- Uvicorn Releases: https://github.com/Kludex/uvicorn/releases
- Pytest Changelog: https://docs.pytest.org/en/stable/changelog.html
- React Versions: https://react.dev/versions
- Vite Releases: https://vite.dev/releases
- Vite Node.js compatibility: https://vite.dev/guide/

## 4. Puertos y direcciones locales propuestos

| Servicio | Host | Puerto | Dirección |
|---|---|---:|---|
| Frontend Vite | localhost | 5173 | http://localhost:5173 |
| Backend FastAPI | localhost | 8000 | http://localhost:8000 |
| API v1 | localhost | 8000 | http://localhost:8000/api/v1 |

Configuración propuesta:

- Vite utilizará host localhost y strictPort true.
- Uvicorn escuchará exclusivamente en localhost.
- El frontend consumirá http://localhost:8000/api/v1.
- FastAPI permitirá CORS únicamente desde http://localhost:5173 durante desarrollo local.
- No se expondrán los servicios a la red local ni a interfaces públicas.

Los puertos son convenciones de desarrollo; no alteran los contratos de recursos de API-001.

## 5. Convenciones de dependencias

### Backend

- requirements.txt para dependencias directas de ejecución.
- requirements-dev.txt para herramientas de desarrollo y pruebas, si se requiere separación.
- Versiones fijadas o acotadas y reproducibles.
- Entorno virtual local .venv/, excluido de Git.
- No versionar secretos, variables locales ni datos reales.

### Frontend

- package.json para scripts y dependencias.
- package-lock.json versionado para reproducibilidad con npm.
- node_modules/ y dist/ excluidos de Git.

## 6. Convenciones de pruebas

- Backend: Pytest.
- Frontend: Vitest y React Testing Library, previa verificación de compatibilidad entre versiones.
- Los tests de servicios y reglas de negocio serán independientes de la API cuando corresponda.
- Los tests de API verificarán contratos, validaciones y códigos HTTP.
- El objetivo de cobertura backend será mínimo 80 %, conforme a SPEC-006.

## 7. Variables y configuración

Se utilizarán archivos de ejemplo sin secretos:

- backend/.env.example
- frontend/.env.example

La URL de API del frontend será configurable mediante variable VITE_API_URL, con valor local propuesto http://localhost:8000/api/v1.

Los archivos .env reales permanecerán excluidos del control de versiones.

## 8. Comandos locales propuestos

Los comandos definitivos de instalación, ejecución, pruebas y compilación se documentarán después de aprobar esta línea base y crear los manifiestos de dependencias.

La documentación priorizará PowerShell para facilitar el uso en Windows y podrá incluir equivalentes para otros terminales si son necesarios.

## 9. Criterios de aceptación de la línea base

1. Versiones principales de Python y Node están decididas.
2. Versiones compatibles de backend y frontend están identificadas.
3. Puertos y hosts locales están definidos.
4. CORS está restringido al origen local del frontend.
5. Los manifiestos de dependencias son reproducibles.
6. Los archivos de datos, respaldos, entornos y secretos permanecen excluidos de Git.
7. Los comandos de instalación, ejecución y pruebas quedan documentados.
8. Se pueden ejecutar las pruebas iniciales en ambos proyectos.

## 10. Estado y aprobación

La presente línea base es una propuesta. No se crearán todavía manifiestos de dependencias ni código funcional hasta recibir aprobación.

---
**Fin de la propuesta.**