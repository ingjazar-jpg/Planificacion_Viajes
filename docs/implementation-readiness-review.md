# Revisión de preparación para implementación

**Proyecto:** Sistema de Planificación y Control de Vacaciones Decembrinas  
**Fecha de actualización:** 2026-11-14  
**Estado:** PARCIAL — estructura frontend validada; preparación funcional pendiente de cierre  
**Repositorio:** https://github.com/ingjazar-jpg/Planificacion_Viajes  
**Rama de referencia:** `main`  
**Último commit revisado:** `6d84b37` — `refactor(frontend): connect feature pages to application navigation`

## 1. Objetivo y alcance de esta revisión

Actualizar la evaluación de preparación con evidencia del repositorio GitHub, los avances confirmados en los chats del proyecto y las validaciones locales reportadas por la usuaria.

Esta revisión:
- No reemplaza ni modifica el contenido normativo de las especificaciones aprobadas.
- Distingue entre decisiones aprobadas, documentos publicados, implementaciones realizadas y verificaciones ejecutadas.
- Registra las discrepancias entre el estado aprobado en los chats y el contenido que todavía muestran algunos archivos versionados.
- No constituye por sí misma autorización para implementar reglas de negocio o módulos funcionales.

## 2. Estado del repositorio

### 2.1 Repositorio remoto

El repositorio ya no está vacío. La rama `main` contiene documentación, configuración técnica, estructura del frontend, navegación modular, páginas iniciales y pruebas.

Commits relevantes verificados en GitHub:

| Commit | Descripción |
|---|---|
| `aeb4ce2` | `docs: add approved technical specifications` |
| `f3e4722` | `feat(frontend): add initial React application scaffold` |
| `66f054d` | `fix(frontend): configure testing library matchers` |
| `6e1df5e` | `feat(frontend): establish modular application shell` |
| `6d84b37` | `refactor(frontend): connect feature pages to application navigation` |

El commit `6d84b37` es el último commit de `main` revisado para esta actualización.

### 2.2 Estructura frontend publicada

Se encuentran publicados, entre otros:

- Layout principal y configuración de navegación.
- Sidebar, Topbar y navegación móvil.
- Páginas iniciales para Dashboard, Calendario, Actividades, Presupuesto y gastos, Informes y Gestión de datos.
- Cliente HTTP inicial en `frontend/src/services/apiClient.js`.
- Tokens visuales y estilos globales.
- Configuración Vite/Vitest y pruebas de la aplicación.

Las páginas de los módulos todavía son placeholders. La presencia de las seis páginas y de la navegación no significa que sus operaciones de negocio estén implementadas ni conectadas al backend.

### 2.3 Documentación publicada

En `docs/` se encuentran:

- `ARCH.md`
- `DATA-001.md`
- `API-001.md`
- `UI-001.md`
- `sprint-0-technical-baseline.md`
- `local-development.md`
- `implementation-readiness-review.md`

En `specs/` se encuentran archivos para SPEC-001 a SPEC-006 y un índice.

## 3. Estado de aprobaciones y consistencia documental

Según las decisiones confirmadas en los chats del proyecto:

- SPEC-001 a SPEC-006: aprobadas.
- ARCH-001 v0.1: aprobada.
- DATA-001 v0.2: aprobada.
- API-001 v0.1: aprobada.
- UI-001 v0.1: aprobada.

ARCH-001, DATA-001, API-001 y UI-001 están publicados con sus estados de aprobación en los archivos de `docs/`.

### 3.1 Estado de aprobación reflejado en las copias versionadas

Los encabezados de SPEC-001 a SPEC-006 se actualizaron para reflejar su estado real: **Aprobada**. La aprobación ya había sido confirmada en las decisiones del proyecto; este cambio corrige únicamente los metadatos documentales para evitar interpretaciones equivocadas.

La actualización no modifica el contenido funcional, las reglas de negocio, las decisiones, ni las versiones de las especificaciones. No implica una nueva aprobación ni altera el historial de decisiones.


## 4. Decisiones y precisiones contractuales registradas

### 4.1 Actividades multidiarias — aclarada y aprobada

La actividad ocupa el intervalo continuo desde `start_date + start_time` hasta `end_date + end_time`, utilizando intervalos semiabiertos `[inicio, finalización)`. Una actividad puede comenzar exactamente cuando termina otra; cualquier intersección temporal constituye solapamiento.

Esta precisión concreta la regla de SPEC-002.

### 4.2 Año del período

DATA-001 establece que `year` corresponde al año de `start_date`.

El ejemplo de creación de período de API-001 incluye `year` en el request. La revisión técnica registró como ajuste propuesto que el backend derive ese valor y que la respuesta sí lo incluya. La discrepancia debe resolverse en una revisión controlada del contrato; no se debe cambiar DATA-001 ni sobrescribir API-001 v0.1 silenciosamente.

### 4.3 Estado inicial de actividades — aclarado y aprobado

Al crear una actividad, el backend asignará automáticamente el estado `Pendiente`. El frontend no enviará `status` en el request de creación. Los cambios posteriores respetarán las transiciones de SPEC-002.

Esta decisión debe reflejarse en los esquemas de creación y en la siguiente revisión controlada del contrato API.

### 4.4 Identificador y catálogo de copias de seguridad — aclarados y aprobados

Cada copia tendrá un UUID independiente generado por el backend. El UUID y los metadatos administrativos estarán fuera de `datos_vacaciones.json`. El frontend utilizará `backup_id` y nunca recibirá rutas físicas.

La usuaria aprobó el catálogo local `data/backups/manifest.json`, también fuera del JSON principal y excluido del control de versiones. Cada entrada incluirá como mínimo:

- `backup_id`: UUID.
- `created_at`: timestamp ISO 8601 con zona horaria.
- `type`: `weekly` o `pre_write`.
- `validation_status`: resultado de la última validación.
- `file_reference`: referencia relativa interna, no expuesta al frontend.

La reconstrucción del catálogo deberá validar los archivos del directorio local de respaldos. Los archivos inválidos se conservarán y reportarán, pero no serán restaurables. La retención de 15 copias se aplica a la serie semanal; los respaldos `pre_write` se gestionan separadamente.

### 4.5 Detalle de contratos API pendiente

API-001 v0.1 está publicada y aprobada como contrato base. Sin embargo, su propia revisión técnica identifica que algunas operaciones necesitan esquemas request/response completos para implementar con seguridad los modelos Pydantic y controladores.

Antes de implementar cada endpoint se debe comprobar que estén definidos, como mínimo:
- Campos requeridos y opcionales del request.
- Tipos, formatos y restricciones.
- Estructura completa de la respuesta.
- Códigos HTTP y errores aplicables.
- Comportamiento de filtros, paginación y actualizaciones.

Las precisiones deberán incorporarse mediante control de cambios y aprobación, sin alterar retroactivamente API-001 v0.1.

## 5. Preparación técnica y dependencias

### 5.1 Línea base aprobada

La línea base de Sprint 0 fija:

- Python 3.14.10.
- pip 26.3.
- Node.js 26.13.1.
- npm 11.20.0.
- React y React DOM 19.3.0.
- Vite 8.3.8.
- Vitest 5.1.0.
- Dependencias de pruebas indicadas en `docs/sprint-0-technical-baseline.md`.

Los archivos `.python-version`, `.nvmrc` y `.npm-version` registran las versiones esperadas.

### 5.2 Validación local de Python

En el equipo local se preparó un entorno virtual y se instalaron las dependencias de backend. Se reportaron:

- pip 26.3 instalado.
- Imports de FastAPI, Pydantic, Uvicorn, Pytest, pytest-cov y HTTPX satisfactorios.
- `pip check` satisfactorio.
- `backend/pylock.toml` generado mediante `pip lock`.

**Limitación importante:** el entorno local utilizado fue creado con Python 3.15.2, mientras que la línea base aprobada exige Python 3.14.10. Por ello, esta ejecución no acredita todavía la validación reproducible del backend en el runtime aprobado. Además, `pip lock` está documentado como experimental y la instalación realizada en el entorno existente no equivale a comprobar una reconstrucción limpia desde cero.

El archivo `backend/pylock.toml` permanece como archivo local no versionado en GitHub.

### 5.3 Validación local del frontend

Se generó `frontend/package-lock.json` con Node.js 26.13.1 y npm 11.20.0.

Se reportaron satisfactoriamente:

- `npm ci`.
- `npm ls --depth=0`.
- Imports de React, React DOM, Vite, Vitest, jsdom y Testing Library.

El archivo `frontend/package-lock.json` permanece como archivo local no versionado en GitHub.

### 5.4 Validación de la aplicación frontend

Después de sincronizar el commit `6d84b37`, la usuaria ejecutó desde `frontend/`:

- `npm test`: 3 pruebas aprobadas, 1 archivo de prueba aprobado.
- `npm run build`: compilación de producción exitosa; 28 módulos transformados.

Las pruebas verifican:
1. Dashboard inicial y controles globales pendientes de API.
2. Navegación entre las secciones definidas en UI-001.
3. Apertura y cierre de la navegación móvil.

Esta validación acredita el shell de la aplicación y la navegación. No acredita aún la integración con FastAPI, los cálculos del dominio, los formularios funcionales ni los módulos de negocio.

### 5.5 Backend y CORS

El repositorio todavía no contiene una aplicación FastAPI funcional ni sus controladores, servicios, repositorios JSON o pruebas de dominio/API. No se han reportado pruebas backend ejecutadas.

La configuración CORS restringida a `http://localhost:5173` sigue pendiente de implementación y prueba, junto con el backend.

## 6. Flujo de trabajo y protección del repositorio

La convención operativa confirmada por la usuaria es:

1. GitHub `main` es la referencia principal del código.
2. Los cambios se crean y registran primero en GitHub.
3. Después se sincronizan al repositorio local para validación.
4. Antes de sincronizar se revisa el estado de Git para proteger cambios locales.
5. No se sobrescriben archivos locales ni se fuerza un push.
6. Las especificaciones aprobadas continúan siendo la fuente de verdad funcional y técnica.

El último pull reportado fue fast-forward hasta `6d84b37`. En ese momento el estado local mostró dos archivos no versionados:

- `backend/pylock.toml`
- `frontend/package-lock.json`

Ambos deben preservarse. No se deben eliminar, limpiar ni sobrescribir durante la siguiente sincronización. Su contenido debe revisarse antes de incorporarlos al repositorio.

No se ha establecido todavía una política formal de Pull Requests. El flujo operativo actualmente acordado utiliza commits descriptivos en `main` desde GitHub y posterior sincronización local; no debe imponerse un flujo distinto sin decisión de la usuaria.

## 7. Dictamen de preparación

| Área | Estado | Evidencia / limitación |
|---|---|---|
| Especificaciones técnicas ARCH, DATA, API y UI | Publicadas | Documentos presentes en `docs/`; versiones y aprobaciones indicadas en sus encabezados |
| SPEC-001 a SPEC-006 | Requiere consistencia documental | Archivos presentes, pero sus encabezados todavía indican borradores |
| Decisiones de datos y backups | Aclaradas | UUID, catálogo `manifest.json`, metadatos y políticas registradas |
| Contratos API | Parcial | API-001 v0.1 publicada; quedan esquemas detallados y armonización de `year` y estado inicial |
| Runtime Python | Pendiente de validación aprobada | Se probó Python 3.15.2, no el 3.14.10 fijado |
| Lockfile Python | Generado localmente, pendiente de validación reproducible y publicación | `pip lock` experimental; no está en GitHub |
| Runtime y lockfile frontend | Validación local satisfactoria | Node 26.13.1, npm 11.20.0, `npm ci`; lockfile aún no publicado |
| Shell y navegación frontend | Validado | 3 pruebas aprobadas y build exitoso |
| Backend funcional | Pendiente | No hay aplicación FastAPI ni pruebas de dominio/API |
| Integración frontend-backend y CORS | Pendiente | No implementada ni probada |
| Flujo GitHub/local | Acordado y aplicado | GitHub `main` primero; pull fast-forward y validación local |
| Pull Requests | No formalizado | Se mantiene el flujo operativo acordado, sin inventar una política nueva |

### Dictamen general

**Preparación del repositorio:** suficiente para continuar tareas de estructura y preparación técnica.  
**Preparación del frontend:** shell y navegación inicial validados localmente.  
**Preparación de dependencias:** frontend validado; backend requiere repetir la validación con Python 3.14.10. Ambos lockfiles siguen pendientes de revisión e incorporación a GitHub.  
**Preparación documental:** documentos técnicos principales publicados; las copias versionadas de SPEC-001 a SPEC-006 deben alinearse con las versiones aprobadas en los chats.  
**Preparación contractual:** parcial; las decisiones principales están registradas, pero se deben completar los detalles de contratos API antes de implementar los endpoints correspondientes.  
**Implementación funcional de negocio:** todavía no autorizada por esta revisión. La autorización de actualizar este documento no equivale a autorizar la implementación del Dashboard ni de otros módulos funcionales.

## 8. Próximas acciones

1. Incorporar las copias originales aprobadas de SPEC-001 a SPEC-006, sin reconstruirlas ni modificar su contenido.
2. Refinar y aprobar los detalles request/response pendientes de API-001, incluida la derivación de `year` y la asignación automática de `Pendiente`.
3. Validar el entorno y el lockfile Python usando Python 3.14.10, con una instalación reproducible; revisar también el contenido de ambos lockfiles.
4. Incorporar los lockfiles revisados a GitHub, preservando los archivos locales y siguiendo el flujo de sincronización acordado.
5. Implementar y probar FastAPI, persistencia JSON, servicios, reglas de dominio, endpoints y CORS.
6. Ejecutar pruebas backend y pruebas de integración frontend-backend.
7. Realizar una nueva revisión de preparación con evidencias y solicitar autorización explícita antes de iniciar el primer módulo funcional de negocio.

---

**Fin de la revisión de preparación actualizada.**
