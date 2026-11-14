# Implementation Readiness Review

**Proyecto:** Sistema de Planificación y Control de Vacaciones Decembrinas  
**Fecha:** 2026-11-14  
**Estado:** PARCIAL — pendiente de cierre  
**Repositorio:** https://github.com/ingjazar-jpg/Planificacion_Viajes

## 1. Objetivo

Registrar la revisión previa al inicio de la implementación, contrastando el estado documental conocido con la estructura inicial del repositorio y señalando los elementos que deben cerrarse antes de desarrollar funcionalidades.

Esta revisión no modifica ni sustituye especificaciones aprobadas.

## 2. Estado del repositorio

El repositorio remoto se encontraba vacío al iniciar la revisión. Se creó la rama `main` mediante el primer commit y se incorporó la estructura documental inicial.

Archivos confirmados en GitHub:

- `README.md`
- `.gitignore`
- `.editorconfig`
- `backend/README.md`
- `frontend/README.md`
- `data/README.md`
- `docs/README.md`
- `specs/README.md`

Los archivos fueron consultados nuevamente después de su creación.

No se ha incorporado código funcional, configuración de dependencias, pruebas ni datos reales. No se modificó ningún entorno local.

## 3. Estado de aprobaciones

Según el registro de decisiones del proyecto al 2026-11-14:

- SPEC-001 a SPEC-006: aprobadas.
- ARCH-001 v0.1: aprobado.
- DATA-001 v0.2: aprobado.
- API-001 v0.1: aprobado.
- UI-001 v0.1: aprobado.

La carpeta `specs/` contiene por ahora un índice, no las transcripciones completas de los documentos aprobados. Antes de considerar GitHub como fuente documental completa deben incorporarse los documentos íntegros, conservando versiones, decisiones y aprobaciones. No deben reconstruirse como transcripciones literales a partir de resúmenes.

## 4. Hallazgos contractuales

### 4.1 Interpretación temporal de actividades multidiarias — ACLARADA Y APROBADA

La usuaria confirmó el 2026-11-14 que una actividad multidiaria ocupa un intervalo continuo desde la combinación de `start_date + start_time` hasta `end_date + end_time`.

La regla de solapamiento utilizará intervalos semiabiertos `[inicio, finalización)`:
- El instante de inicio está incluido.
- El instante de finalización está excluido.
- Una segunda actividad puede comenzar exactamente cuando termina la primera.
- Cualquier actividad cuyo intervalo interseque el intervalo ocupado se considera solapada, aunque corresponda a otro día del calendario.

Esta interpretación concreta la regla de intervalos ya aprobada en SPEC-002 y no cambia el modelo DATA-001.

### 4.2 Creación de períodos

DATA-001 establece que `year` corresponde al año de `start_date`. El ejemplo de creación de período en API-001 incluye `year` como campo de entrada.

**Ajuste técnico propuesto:** retirar `year` del request de creación y derivarlo en el backend. La respuesta sí devolverá `year`. No cambia la regla aprobada de DATA-001.

### 4.3 Identificador de copias de seguridad

API-001 utiliza `backup_id` para seleccionar una copia, pero DATA-001 no define una entidad Backup dentro de `datos_vacaciones.json`.

**Ajuste técnico propuesto:** tratar el identificador como metadato del subsistema de backups, fuera de las entidades persistidas en el JSON principal. El contrato deberá definir formato, unicidad y relación con el archivo de respaldo.

### 4.4 Esquemas de respuesta API

API-001 define convenciones y ejemplos, pero varias operaciones todavía requieren esquemas request/response completos antes de implementar sus controladores y modelos Pydantic.

Se deberá completar el detalle por endpoint sin cambiar las decisiones aprobadas de estructura `data`, errores, filtros, paginación y códigos HTTP.

### 4.5 Estado inicial de actividades

**RESUELTO.** La decisión aprobada se registra en la sección 4.6: el backend asigna automáticamente `Pendiente` y el frontend no envía `status` al crear una actividad.

### 4.6 Estado inicial de actividades — ACLARADO Y APROBADO

La usuaria confirmó el 2026-11-14 que al crear una actividad el backend asignará automáticamente el estado `Pendiente`. El frontend no enviará el campo `status` en la solicitud de creación.

El estado podrá modificarse posteriormente mediante las operaciones de actualización, siempre respetando las transiciones aprobadas en SPEC-002.

Esta aclaración se incorporará en la siguiente revisión controlada del contrato API-001 y en los esquemas Pydantic de creación. El documento API-001 v0.1 aprobado no se sobrescribe silenciosamente.

### 4.7 Identificador y metadatos de copias de seguridad — ACLARADO Y APROBADO

La usuaria aprobó el 2026-11-14 que cada copia de seguridad tenga un UUID independiente, generado por el backend y asociado al archivo de respaldo correspondiente.

El identificador y los metadatos administrativos de las copias pertenecerán al subsistema de backups y se conservarán fuera de las entidades y del documento principal `datos_vacaciones.json`.

El frontend utilizará el UUID como `backup_id`, sin conocer ni recibir rutas físicas del sistema de archivos.

La implementación deberá definir y documentar el formato del archivo, la ubicación local protegida, el mecanismo de catálogo/descubrimiento de copias y la validación de integridad, respetando la retención aprobada. Esta decisión no agrega una entidad Backup al esquema JSON principal de DATA-001.

### 4.8 Catálogo local de copias de seguridad — APROBADO

La usuaria aprobó el 2026-11-14 utilizar un catálogo independiente en:

`data/backups/manifest.json`

El catálogo será metadato operativo local del subsistema de respaldos y no formará parte de `datos_vacaciones.json`. Tanto el catálogo como los archivos de respaldo permanecerán excluidos del control de versiones.

Cada entrada del catálogo contendrá, como mínimo:

- `backup_id`: UUID generado por el backend.
- `created_at`: timestamp ISO 8601 con zona horaria.
- `type`: tipo de respaldo (`weekly` o `pre_write`).
- `validation_status`: resultado de la última validación.
- `file_reference`: referencia relativa interna al archivo, nunca expuesta al frontend.

Los archivos de respaldo deberán usar un nombre inequívoco que permita identificar su UUID, tipo y momento de creación. Esa información, junto con la estructura y metadatos validados dentro de cada copia, permitirá reconstruir el manifiesto si se daña o falta.

La reconstrucción deberá examinar únicamente el directorio local de respaldos, validar cada archivo y regenerar el catálogo sin modificar el JSON principal. Los archivos inválidos se conservarán y se reportarán; no se considerarán restaurables.

La retención de 15 copias semanales se aplicará exclusivamente a la serie semanal. Los respaldos previos a escritura se gestionarán por separado como protección transaccional, de acuerdo con SPEC-006 y ARCH-001; no se mezclarán ambas políticas de retención.

El frontend consultará las copias mediante los endpoints de API-001 y recibirá únicamente identificadores y metadatos seguros. Nunca recibirá rutas físicas.

## 5. Preparación técnica

### 5.1 Completado en GitHub

- Línea base técnica aprobada el 2026-11-14 y registrada en `docs/sprint-0-technical-baseline.md`.
- Runtime fijado en `.python-version` y `.nvmrc`.
- Dependencias directas de backend fijadas en `backend/requirements.txt` y `backend/requirements-dev.txt`.
- Configuración inicial de Pytest en `backend/pytest.ini`.
- Manifiesto frontend `frontend/package.json` con versiones exactas y scripts.
- Configuración de Vite y Vitest.
- Variable de entorno de ejemplo `frontend/.env.example`.
- Guía inicial de instalación y sincronización en `docs/local-development.md`.

### 5.2 Pendiente de ejecución/verificación

- Generar `frontend/package-lock.json` usando npm 11 en Node.js 26.13.1 y subirlo al repositorio. No se generó en esta etapa porque el entorno de trabajo remoto no dispone de Node.js 26/npm 11.
- Instalar dependencias en un entorno Python 3.14.10 y Node.js 26.13.1.
- Verificar resolución completa de dependencias y ejecución de scripts.
- Incorporar la aplicación FastAPI y los archivos de entrada React antes de ejecutar build, servidor o pruebas funcionales.
- Implementar y probar CORS limitado a `http://localhost:5173`.
- Definir el flujo de ramas y revisión mediante Pull Request.

Las versiones exactas y sus fuentes oficiales están documentadas en la línea base aprobada. La existencia de manifiestos no equivale a una instalación ni a pruebas ejecutadas.

## 6. Restricciones que se mantienen

- Backend Python, FastAPI y Pydantic.
- Frontend React, Vite, JavaScript/JSX, HTML5 y CSS3.
- JSON local gestionado exclusivamente por backend.
- FastAPI enlazado exclusivamente a localhost.
- Sin base de datos externa ni envío de datos a servicios externos.
- Sin Bootstrap ni Tailwind.
- Datos, respaldos, registros y secretos excluidos del control de versiones.
- Tareas pequeñas y verificables de máximo 30 minutos.
- No alterar Programa 1.
- No modificar documentos aprobados sin control de cambios y autorización.

## 7. Dictamen

**Preparación documental:** aprobaciones confirmadas, pero copia íntegra de documentos aún pendiente en GitHub.  
**Preparación del repositorio:** estructura inicial y archivos de configuración creados y verificados en GitHub.  
**Preparación de dependencias:** manifiestos directos creados; falta package-lock y validación de instalación en las versiones fijadas.  
**Preparación contractual:** parcial; quedan precisiones del contrato API y detalles de pruebas/validación de restauración por cerrar. Las decisiones de intervalos multidiarios, estado inicial y catálogo de respaldos ya están aprobadas.  
**Documentación de especificaciones:** la usuaria informa que los archivos .md aprobados se están preparando en otro chat; no se duplicarán ni reconstruirán aquí.  
**Inicio de implementación funcional:** NO AUTORIZADO hasta cerrar los elementos bloqueantes y completar la revisión.

## 8. Próximas tareas

1. Incorporar a `specs/` los archivos Markdown originales cuando estén listos en el otro chat, preservando su contenido y versión.
2. Completar las precisiones de API-001: derivación de `year`, esquemas detallados request/response y metadatos de backups.
3. Generar y versionar `frontend/package-lock.json` y validar las instalaciones.
4. Definir las convenciones de ramas, Pull Requests y revisión.
5. Ejecutar una revisión final de preparación y autorizar el primer incremento funcional.

---
**Fin de la revisión preliminar.**
