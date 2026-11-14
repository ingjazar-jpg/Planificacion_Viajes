# Sprint 0 — Línea base técnica aprobada

**Proyecto:** Sistema de Planificación y Control de Vacaciones Decembrinas  
**Fecha de aprobación:** 2026-11-14  
**Estado:** APROBADA  
**Repositorio:** https://github.com/ingjazar-jpg/Planificacion_Viajes

## 1. Objetivo

Fijar las versiones y convenciones del entorno de desarrollo para que la configuración sea reproducible entre GitHub y el entorno local.

Esta línea base mantiene el stack obligatorio aprobado en ARCH-001.

## 2. Versiones fijadas

Las siguientes versiones exactas se seleccionaron dentro de las familias aprobadas y se verificaron contra las fuentes oficiales consultadas el 2026-11-14.

| Componente | Versión fijada |
|---|---|
| Python | 3.14.10 |
| pip (generador de lockfile) | 26.3 |
| FastAPI | 0.142.2 |
| Pydantic | 2.14.3 |
| Uvicorn | 0.54.0 |
| Pytest | 9.2.0 |
| pytest-cov | 7.1.0 |
| HTTPX (cliente de pruebas API) | 0.28.1 |
| Node.js | 26.13.1 LTS |
| npm | 11.20.0 |
| React | 19.3.0 |
| React DOM | 19.3.0 |
| Vite | 8.3.8 |
| @vitejs/plugin-react | 6.3.0 |
| Vitest | 5.1.0 |
| jsdom | 31.0.1 |
| @testing-library/react | 16.3.3 |
| @testing-library/dom | 10.4.2 |
| @testing-library/jest-dom | 7.0.1 |

Los archivos de dependencias fijarán estas versiones exactas. Para el frontend se generará y versionará `package-lock.json` mediante npm 11.20.0. Para el backend se utilizará `pylock.toml`, generado con pip 26.3 desde `requirements-dev.txt`. La funcionalidad `pip lock` de pip 26.3 está documentada como experimental y el lock generado solo garantiza validez para la versión de Python y plataforma en que se genera; por ello se generará y validará en el equipo local Windows previsto. La instalación de entornos virtuales y dependencias no se incluirá en Git.

Python se mantiene en la rama 3.14.x aprobada, aunque exista una rama posterior de Python. FastAPI se mantiene en la serie 0.142.x aprobada. No se realizarán cambios de serie sin revisión y aprobación.

## 3. Fuentes oficiales de versiones

- Python 3.14.10: https://www.python.org/doc/versions/
- FastAPI 0.142.2: https://fastapi.tiangolo.com/release-notes/
- Pydantic 2.14.3: https://pypi.org/project/pydantic/2.14.3/
- Uvicorn 0.54.0: https://uvicorn.dev/release-notes/
- Pytest 9.2.0: https://docs.pytest.org/en/latest/changelog.html
- pytest-cov 7.1.0: https://pypi.org/project/pytest-cov/
- HTTPX 0.28.1: https://pypi.org/project/httpx/
- Node.js 26.13.1 LTS: https://nodejs.org/en/download/
- React 19.3.0: https://react.dev/versions
- Vite 8.3.8: https://github.com/vitejs/vite/releases
- Requisito Node.js de Vite 8: https://vite.dev/blog/announcing-vite8
- @vitejs/plugin-react 6.3.0: https://www.npmjs.com/package/@vitejs/plugin-react
- Vitest 5.1.0: https://vitest.dev/blog/vitest-5-1
- jsdom 31.0.1: https://www.npmjs.com/package/jsdom
- React Testing Library 16.3.3: https://www.npmjs.com/package/@testing-library/react
- DOM Testing Library 10.4.2: https://www.npmjs.com/package/@testing-library/dom
- jest-dom 7.0.1: https://www.npmjs.com/package/@testing-library/jest-dom

## 4. Puertos y direcciones locales

| Servicio | Host | Puerto | Dirección |
|---|---|---:|---|
| Frontend Vite | localhost | 5173 | http://localhost:5173 |
| Backend FastAPI | localhost | 8000 | http://localhost:8000 |
| API v1 | localhost | 8000 | http://localhost:8000/api/v1 |

Configuración obligatoria:

- Vite utilizará host `localhost` y `strictPort: true`.
- Uvicorn escuchará exclusivamente en `localhost`.
- El frontend consumirá `http://localhost:8000/api/v1`.
- FastAPI permitirá CORS únicamente desde `http://localhost:5173` durante desarrollo local.
- No se expondrán los servicios a la red local ni a interfaces públicas.

Los puertos son convenciones de desarrollo y no modifican los contratos de recursos de API-001.

## 5. Convenciones de dependencias

### Backend

- `backend/requirements.txt`: dependencias de ejecución.
- `backend/requirements-dev.txt`: dependencias de desarrollo y pruebas, incluyendo las de ejecución.
- Entorno virtual local: `.venv/`, excluido de Git.
- La versión de Python quedará registrada en `.python-version`.
- pip 26.3 se utilizará para generar e instalar `backend/pylock.toml`.
- No versionar secretos, variables locales ni datos reales.

### Frontend

- `frontend/package.json`: scripts y dependencias.
- `frontend/package-lock.json`: resolución reproducible con npm, versionada.
- `frontend/node_modules/` y `frontend/dist/`: excluidos de Git.
- La versión de Node.js quedará registrada en `.nvmrc`.
- La versión de npm quedará registrada en `.npm-version` y se validará mediante `.npmrc`.

## 6. Pruebas

- Backend: Pytest y pytest-cov.
- Pruebas de endpoints FastAPI: HTTPX mediante TestClient.
- Frontend: Vitest, jsdom y React Testing Library.
- Los tests de reglas de negocio se mantendrán independientes de la API cuando corresponda.
- Los tests de API verificarán contratos, validaciones y códigos HTTP.
- Cobertura backend mínima objetivo: 80 %, conforme a SPEC-006.
- Los flujos principales del frontend tendrán pruebas automatizadas.

## 7. Configuración de entorno

- El frontend usará `VITE_API_URL`, con valor local `http://localhost:8000/api/v1`.
- Los archivos de entorno reales se excluirán de Git.
- Se podrán versionar archivos `.env.example` sin secretos.
- Ninguna variable permitirá exponer FastAPI fuera de localhost.

## 8. Comandos locales previstos

Los comandos definitivos se documentarán en `docs/local-development.md` cuando se incorporen los manifiestos y la estructura de ejecución.

La guía priorizará PowerShell en Windows, con comandos equivalentes cuando sea necesario.

## 9. Criterios de aceptación de la línea base

1. Las versiones principales de Python y Node.js están fijadas.
2. Las versiones de dependencias directas están fijadas.
3. Los puertos y hosts locales están definidos.
4. CORS queda limitado al origen local del frontend.
5. Los archivos de dependencias permiten instalaciones reproducibles.
6. Los datos, respaldos, entornos y secretos permanecen excluidos de Git.
7. Los comandos de instalación, ejecución y pruebas quedan documentados.
8. Las pruebas iniciales pueden ejecutarse en ambos proyectos.

## 10. Control de cambios

| Versión | Fecha | Descripción | Estado |
|---|---|---|---|
| 0.1 | 2026-11-14 | Línea base técnica propuesta | Aprobada por la usuaria |
| 0.2 | 2026-11-14 | Fijación de versiones exactas verificadas | Aprobada como concreción de la línea base |
| 0.3 | 2026-11-14 | Fijación de npm 11.20.0 y pip 26.3; definición de pylock.toml y package-lock.json | Aprobada como procedimiento de generación local |

**Fin de la línea base técnica aprobada.**
