# Sistema de Planificación y Control de Vacaciones Decembrinas

Aplicación web local para planificar períodos de vacaciones decembrinas, administrar actividades y calendario, controlar presupuestos y gastos, consultar alertas internas y generar informes.

## Estado del proyecto

- Especificaciones funcionales SPEC-001 a SPEC-006: aprobadas.
- Arquitectura ARCH-001 v0.1: aprobada.
- Modelo de datos DATA-001 v0.2: aprobado.
- Contratos REST API-001 v0.8: aprobados.
- Interfaz UI-001 v0.1: aprobada.
- Línea base técnica Sprint 0: aprobada el 14-11-2026.
- Backend: BE-001 a BE-010 implementados y validados; suite completa: **197 passed, 0 failed**.
- Frontend: FE-001 a FE-006 implementados, validados y cerrados; suite completa: **170 passed, 0 failed**.
- Build de producción frontend: exitoso con Vite 8.3.8.
- Integración real del frontend con FastAPI: validada.
- Diseño responsive: revisión satisfactoria desde 360 px.
- Accesibilidad: revisión satisfactoria conforme a WCAG 2.2 AA.
- Runtime Python 3.14.10: validación reproducible completada en entorno temporal aislado.

Consulta el [estado detallado del proyecto](docs/project-status.md) para conocer capacidades, evidencias de validación, trabajo pendiente y próximos pasos.

Los documentos aprobados son la fuente de verdad del proyecto. Cualquier cambio funcional o técnico deberá reflejarse primero en las especificaciones correspondientes y aprobarse antes de modificar la implementación.

## Stack tecnológico obligatorio

### Backend
- Python.
- FastAPI.
- Pydantic.
- Persistencia JSON local, administrada exclusivamente por el backend.

### Frontend
- React.
- Vite.
- JavaScript/JSX.
- HTML5 y CSS3.

## Restricciones arquitectónicas

- Archivo principal de datos: `datos_vacaciones.json`.
- El backend será el único responsable de leer y escribir el archivo JSON.
- El servidor FastAPI escuchará exclusivamente en `localhost`.
- No se utilizará una base de datos externa.
- No se enviarán datos a servicios externos.
- No se incorporarán integraciones externas de calendario, mapas, mensajería o notificaciones sin autorización expresa.
- No se utilizarán Bootstrap ni Tailwind.
- Las reglas de negocio y los cálculos pertenecen al backend.
- Los importes se manejarán como `Decimal` en backend y cadenas decimales en JSON.
- Moneda: COP.
- Zona horaria: `America/Bogota`.

## Organización del repositorio

La organización del proyecto se distribuye en los directorios `backend/`, `frontend/`, `data/`, `docs/` y `specs/`. Los datos locales, respaldos, entornos virtuales, dependencias instaladas, archivos temporales y registros no deben versionarse.

## Calidad y criterios de trabajo

- Cobertura de pruebas backend objetivo: mínimo 80 %.
- Pruebas automatizadas de los flujos principales del frontend.
- Accesibilidad: WCAG 2.2 AA.
- Diseño responsive desde 360 px.
- Compatibilidad objetivo con las últimas dos versiones principales de Chrome, Edge, Firefox y Safari.
- Tareas pequeñas y verificables de máximo 30 minutos.
- No iniciar trabajo dependiente de una aprobación pendiente.

## Documentación de referencia

Las especificaciones aprobadas y los documentos de arquitectura, datos, API e interfaz prevalecen sobre este README. Este archivo sirve como punto de entrada y resumen del repositorio; no sustituye las especificaciones ni el seguimiento detallado.

### Documentación de implementación frontend

- [Mapa de implementación frontend — FE-001 a FE-006](docs/FE-ROADMAP.md)
- [FE-001 — Fundación frontend](docs/FE-001.md)
- [FE-002 — Dashboard y alertas](docs/FE-002.md)
- [FE-003 — Calendario y actividades](docs/FE-003.md)
- [FE-004 — Presupuestos y gastos](docs/FE-004.md)
- [FE-005 — Informes](docs/FE-005.md)
- [FE-006 — Configuración y respaldos](docs/FE-006.md)

Los seis bloques frontend están implementados, validados y cerrados. Sus criterios, alcance y evidencias específicas se mantienen en cada documento.

### Documentación operativa

- [Línea base técnica aprobada](docs/sprint-0-technical-baseline.md)
- [Guía de desarrollo local](docs/local-development.md)
- [Script de validación local del entorno](scripts/prepare-local-lockfiles.ps1)
- [Revisión de preparación para implementación](docs/implementation-readiness-review.md)
- [Estado detallado del proyecto](docs/project-status.md)

## Desarrollo local

Consulta la [guía de desarrollo local](docs/local-development.md) y la línea base técnica para conocer los runtimes, dependencias y validaciones del entorno. Antes de sincronizar cambios o preparar commits, revisa el estado de Git y preserva cualquier trabajo local no confirmado.

