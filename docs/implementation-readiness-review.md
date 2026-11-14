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

SPEC-002 define los estados y las transiciones, pero deberá quedar expresamente documentado si al crear una actividad el estado se asigna automáticamente a `Pendiente` o se exige en el request.

Este punto debe resolverse en el contrato de creación y en los modelos Pydantic.

## 5. Preparación técnica pendiente

Antes de declarar cerrado Sprint 0 se deberán definir y verificar:

- Versiones compatibles de Python, Node.js, FastAPI, Pydantic, React y Vite.
- Dependencias y archivos de bloqueo correspondientes.
- Orígenes CORS permitidos para el frontend local y la API local.
- Comandos reproducibles de instalación, ejecución y pruebas.
- Configuración de pruebas backend y frontend.
- Flujo de ramas y revisión mediante Pull Request.
- Incorporación íntegra de la documentación aprobada.

Las versiones y dependencias se elegirán con verificación de compatibilidad vigente al momento de configurarlas.

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
**Preparación del repositorio:** estructura inicial creada y verificada.  
**Preparación de dependencias y ejecución:** pendiente.  
**Preparación contractual:** requiere cerrar los hallazgos de la sección 4.  
**Inicio de implementación funcional:** NO AUTORIZADO hasta cerrar los elementos bloqueantes y completar la revisión.

## 8. Próximas tareas

1. Incorporar los documentos aprobados completos a `specs/`.
2. Resolver la semántica de intervalos multidiarios y el estado inicial de actividades.
3. Completar las precisiones de API-001 indicadas en esta revisión.
4. Definir versiones y configuración reproducible.
5. Ejecutar una revisión final de preparación y autorizar el primer incremento funcional.

---
**Fin de la revisión preliminar.**
