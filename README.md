# Sistema de Planificación y Control de Vacaciones Decembrinas

Aplicación web local para planificar períodos de vacaciones decembrinas, administrar actividades y calendario, controlar presupuestos y gastos, consultar alertas internas y generar informes.

## Estado del proyecto

- Especificaciones funcionales SPEC-001 a SPEC-006: aprobadas.
- Arquitectura ARCH-001 v0.1: aprobada.
- Modelo de datos DATA-001 v0.2: aprobado.
- Contratos REST API-001 v0.8: aprobados.
- Interfaz UI-001 v0.1: aprobada.
- Línea base técnica Sprint 0: aprobada el 14-11-2026.
- Backend: BE-001 a BE-010 validados; regresión completa posterior al ajuste CORS: **197 passed, 0 failed**.
- BE-007 — API de presupuestos y gastos: implementada y validada; las 16 pruebas nuevas del bloque pasan dentro de la suite completa.
- BE-009 — API de Dashboard: validada localmente; incluye respuesta con importes cero cuando no existe presupuesto.
- BE-010 — API de informes: validada localmente; tres informes, comparación histórica, filtros, agrupaciones y exportaciones PDF/XLSX; 10 pruebas nuevas incluidas en las 195 aprobadas.
- Frontend: **FE-001 validado y cerrado**; 12 pruebas frontend aprobadas, build exitoso, integración real, responsive y accesibilidad manual comprobados.
- Validación reproducible del backend con Python 3.14.10 y revisión/incorporación de lockfiles: pendientes.

Consulta el [estado detallado del proyecto](docs/project-status.md) para ver capacidades completadas, trabajo pendiente, criterios de cierre y flujo de validación.

Los documentos aprobados son la fuente de verdad del proyecto. Los cambios funcionales o técnicos deberán reflejarse primero en las especificaciones correspondientes y aprobarse antes de modificar la implementación.

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

## Organización prevista

```text
backend/
frontend/
data/
docs/
specs/
```

La estructura detallada se materializará durante Sprint 0 conforme a ARCH-001. Los datos locales, respaldos, entornos virtuales, dependencias instaladas y registros no deben versionarse.

## Calidad y criterios de trabajo

- Cobertura de pruebas backend objetivo: mínimo 80 %.
- Pruebas de flujos principales del frontend.
- Accesibilidad: WCAG 2.2 AA.
- Diseño responsive desde 360 px.
- Compatibilidad con las últimas dos versiones principales de Chrome, Edge, Firefox y Safari.
- Tareas pequeñas y verificables de máximo 30 minutos.
- No iniciar trabajo dependiente de una aprobación pendiente.

## Fuente documental

Los documentos funcionales, de arquitectura, datos, API e interfaz aprobados se incorporarán al repositorio en `specs/` y `docs/`. Hasta que se incorporen, este README resume las decisiones principales, pero no sustituye esos documentos.

## Documentación operativa

- [Línea base técnica aprobada](docs/sprint-0-technical-baseline.md)
- [Guía de desarrollo local](docs/local-development.md)
- [Script local de lockfiles](scripts/prepare-local-lockfiles.ps1)
- [Revisión de preparación para implementación](docs/implementation-readiness-review.md)

## Documentación de implementación frontend

- [Mapa de implementación frontend — seis bloques FE](docs/FE-ROADMAP.md)
- [FE-001 — Especificación de fundación frontend](docs/FE-001.md)

FE-001 está refinado y aprobado. La implementación inicial está publicada en la rama de trabajo: cliente HTTP centralizado, contexto global del período, selector conectado a la API y estados comunes. La validación local reportada incluye 12 pruebas frontend aprobadas, build de producción exitoso y 197 pruebas backend aprobadas, incluida la política CORS limitada al origen local del frontend. La validación funcional integrada de los módulos posteriores permanece pendiente.

## Desarrollo local

La configuración de dependencias está incorporada. La guía local describe la instalación inicial, incluida la generación y versionado de `frontend/package-lock.json`. La aplicación funcional y sus comandos de ejecución se completarán en las siguientes tareas.
