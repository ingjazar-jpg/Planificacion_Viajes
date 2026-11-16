# Estado del proyecto

**Proyecto:** Sistema de Planificación y Control de Vacaciones Decembrinas  
**Fecha de actualización:** 2026-11-16  
**Repositorio:** https://github.com/ingjazar-jpg/Planificacion_Viajes  
**Rama de trabajo:** `feat/backend-domain-foundation`  
**Fuente de verdad:** especificaciones aprobadas en `specs/` y `docs/`; código versionado en GitHub.

## 1. Resumen ejecutivo

La implementación del backend BE-001 a BE-010 está validada. La usuaria confirmó la suite backend completa con **197 passed, 0 failed**. FE-001 a FE-004 están validados y cerrados. **FE-005 — Informes — está implementado y validado** conforme a `docs/FE-005.md` v0.2: los cinco bloques completados, suite frontend completa con **150 passed, 0 failed** en 20 archivos y build de producción exitoso con Vite 8.3.8. La usuaria confirmó además la revisión visual y funcional. FE-006 — Gestión de datos e integración — cuenta con especificación `docs/FE-006.md` v0.2 aprobada para implementación el 16-11-2026. Las decisiones FE006-DEC-001 a DEC-010 están cerradas; la implementación aún no se ha iniciado. La validación reproducible con Python 3.14.10 continúa pendiente como tarea transversal de Sprint 0.

## 2. Estado por bloque de implementación

| Bloque | Alcance | Estado | Evidencia de validación local |
|---|---|---|---:|
| BE-001 | Entidades y enums de dominio | Validado | 35 passed |
| BE-002 | Schemas Pydantic de API | Validado | 76 passed |
| BE-003 | Persistencia JSON, integridad documental y gestión de backups | Validado | 118 passed |
| BE-004 | API de consulta y restauración de backups | Validado | 127 passed |
| BE-005 | API de períodos y actividades | Validado | 141 passed |
| BE-006 | API y ciclo de vida de alertas | Validado | 153 passed |
| BE-007 | API de presupuestos y gastos | Validado | 169 passed (suite completa) |
| BE-008 | API de calendario | Validado | 178 passed (suite completa; 9 pruebas nuevas) |
| BE-009 | API de Dashboard | Validado | 185 passed (suite completa) |
| BE-010 | API de informes, comparación y exportaciones | Validado | 195 passed (suite completa; 10 pruebas nuevas) |

**Nota:** las cifras de cada fila son resultados acumulativos reportados después de cada bloque. La suite backend posterior al ajuste CORS quedó en **197 passed, 0 failed**; los hitos BE-001 a BE-010 no se reabren.

## 3. Capacidades backend ya implementadas

### 3.1 Dominio y validación

- Entidades y enumeraciones de períodos, actividades, alertas, presupuestos, gastos e historial.
- Identificadores UUID.
- Importes representados mediante `Decimal`.
- Schemas de entrada y salida con validación Pydantic.
- Documento JSON raíz con validación de referencias e integridad entre colecciones.

### 3.2 Persistencia y copias de seguridad

- Repositorio JSON con escritura atómica y protección de concurrencia.
- Backups previos a escritura y copias semanales.
- Catálogo de backups con identificadores UUID y reconstrucción.
- Validación y restauración explícita de copias semanales.
- API de consulta y restauración conforme al contrato aprobado.

### 3.3 Períodos y actividades

- Creación, consulta y actualización de períodos.
- Creación, consulta, actualización y eliminación de actividades.
- Validación de rango de fechas, horarios y solapamientos.
- Transiciones de estado y asignación inicial Pendiente en backend.
- Eliminación en cascada de alertas, gastos e historiales relacionados.

### 3.4 Alertas

- Evaluación de condiciones Próxima, Vencida y Prioridad alta.
- Una alerta por actividad y tipo.
- Historial de eventos, activación, desactivación y reactivación.
- Consulta con filtros y paginación.
- Marcado idempotente como Revisada.
- Reevaluación ante creación o modificación de actividades, sin procesos permanentes.

### 3.5 Calendario

- Endpoint GET /api/v1/calendar con rango inclusivo y filtros combinables.
- Actividades multidiarias devueltas una sola vez con sus fechas originales.
- Actividades canceladas incluidas cuando no se filtra por estado.
- Indicador is_overdue calculado por backend en America/Bogota, sin persistirlo.
- Sin paginación, conforme a API-001.

**Validación:** la usuaria confirmó la ejecución local de `python -m pytest -v` con **195 passed, 0 failed**, incluyendo BE-010.

## 4. BE-007 — API de presupuestos y gastos

**Estado:** implementación publicada en GitHub y validada localmente: **169 passed, 0 failed**.  
**Fuentes normativas:** SPEC-004 v0.2, DATA-001 v0.2 y API-001 v0.7.

### Alcance previsto

1. Crear y consultar el presupuesto de un período.
2. Reemplazar el presupuesto general y la distribución completa por categorías.
3. Calcular indicadores de presupuesto, ejecución y saldo general y por categoría.
4. Registrar, listar, consultar, modificar y eliminar gastos.
5. Aplicar filtros contractuales y paginación.
6. Consultar el historial de creación y modificaciones de gastos.
7. Mantener integridad referencial entre período, actividad, gasto e historial.

### Reglas que deben respetarse

- Un presupuesto general por período.
- Distribución entre las siete categorías aprobadas; las categorías omitidas se interpretan como cero.
- La suma asignada por categoría no puede superar el presupuesto general.
- La actualización del presupuesto reemplaza el total y la distribución completos; no modifica gastos ni historiales.
- El gasto debe ser mayor que cero y admite sobreejecución presupuestaria, que se refleja en los indicadores.
- Los importes aceptan como máximo dos decimales; no se redondean automáticamente.
- El período del gasto es inmutable.
- La actividad asociada, si existe, debe pertenecer al mismo período.
- El historial registra la creación y únicamente los campos efectivamente modificados.
- Una edición sin cambios no genera historial ni altera `updated_at`.
- La eliminación de un gasto elimina también su historial.

### Resultado de validación y cierre

La usuaria sincronizó los cambios desde GitHub y reportó la ejecución completa de `python -m pytest -v` con **169 passed, 0 failed**. Las 16 pruebas nuevas de `backend/tests/test_budget_expense_api.py` forman parte de la suite aprobada. También quedaron verificadas las regresiones de schemas y la correspondencia de errores HTTP con API-001.

## 5. BE-009 y BE-010 — Dashboard e informes

### BE-009 — API de Dashboard

**Estado:** validado localmente. La usuaria confirmó **185 passed, 0 failed** en la suite completa.

### BE-010 — API de informes

**Estado:** implementación publicada en GitHub y validada localmente: **195 passed, 0 failed**.

Alcance implementado:
- Informe general, informe de actividades e informe presupuestario y de gastos.
- Filtros combinables, rangos inclusivos y filtros independientes por sección del informe general.
- Paginación posterior a los filtros y totales calculados sobre el conjunto completo filtrado.
- Agrupaciones de gastos por categoría y actividad, incluido «Sin actividad asociada».
- Comparación histórica de dos períodos con los cuatro indicadores financieros aprobados.
- Exportaciones PDF y XLSX con alcance `filtered` o `period`, sin paginación.
- Resaltado visual de actividades canceladas en exportaciones.
- Períodos sin presupuesto admitidos en informes general y presupuestario, conforme a API-DEC-047; la consulta individual del presupuesto conserva `BUDGET_NOT_FOUND`.

Archivos principales:
- `backend/app/schemas/reports.py`
- `backend/app/services/report_service.py`
- `backend/app/api/reports.py`
- `backend/tests/test_reports_api.py`

Dependencias de exportación añadidas a `backend/requirements.txt`: ReportLab y openpyxl.

Se añadieron 10 pruebas de BE-010. La usuaria sincronizó los cambios, instaló las dependencias actualizadas y confirmó la suite completa con **195 passed, 0 failed**. Durante la validación se corrigió el helper de presupuesto de la prueba de comparación histórica: ahora calcula una asignación válida respecto del total y comprueba que la API responda HTTP 201. No fue necesario modificar la lógica de producción.

Cualquier endpoint transversal adicional que la revisión identifique como faltante se evaluará sin alterar contratos aprobados.

## 6. Trabajo pendiente del frontend e integración

FE-001 a FE-005 están implementados y validados. El trabajo funcional frontend pendiente se concentra en FE-006 — Gestión de datos e integración — y en la regresión transversal de cierre.

- Implementar el catálogo de copias semanales y la restauración confirmada conforme a FE-006, una vez aprobada su especificación.
- Conectar la restauración con el contexto global de períodos y garantizar la recarga de datos, incluso si el identificador del período activo no cambia.
- Ejecutar pruebas integrales frontend-backend y regresión de FE-001 a FE-006.
- Verificar accesibilidad, responsive y compatibilidad indicadas en SPEC-006.

El shell, la navegación y los módulos FE-001 a FE-005 ya cuentan con evidencia de validación registrada en este documento. La validación reproducible del backend con Python 3.14.10 continúa como tarea transversal de Sprint 0 y no se confunde con el cierre funcional de FE-006.

### 6.1 Plan de implementación frontend

El mapa de implementación de seis bloques se mantiene en `docs/FE-ROADMAP.md`. FE-001 a FE-005 están validados y cerrados. Los documentos específicos son:

- `docs/FE-001.md`: fundación frontend.
- `docs/FE-002.md`: Dashboard y alertas.
- `docs/FE-003.md`: calendario y actividades.
- `docs/FE-004.md`: presupuesto y gastos.
- `docs/FE-005.md`: informes, versión 0.2.
- `docs/FE-006.md`: gestión de datos e integración, versión 0.2 aprobada para implementación.

**FE-005 — VALIDADO Y CERRADO el 16-11-2026.** La usuaria confirmó cinco bloques implementados, suite frontend completa con **150 passed, 0 failed** en 20 archivos, `npm run build` exitoso con Vite 8.3.8 y revisión visual/funcional satisfactoria. La especificación v0.2 incluye FE005-D01 a D62, RF-001 a RF-090 y CA-001 a CA-022 + B5-CA01 a B5-CA12. El commit `0789bac9920bdab27df3c9244d627ac54e477520` corrigió una consulta ambigua en una prueba de exportación. No se modificaron contratos normativos.

**FE-006 — ESPECIFICACIÓN APROBADA PARA IMPLEMENTACIÓN el 16-11-2026.** `docs/FE-006.md` v0.2 consolida FE006-DEC-001 a DEC-010, RF-001 a RF-045 y CA-001 a CA-025. Quedaron cerradas todas las decisiones de catálogo, confirmación, errores, restauración, selección de período, recarga global, recuperación GET-only y regresión. No se modificaron API-001 §5.9 ni las especificaciones normativas. La implementación está pendiente.

## 7. Calidad y validación

- Última suite backend completa confirmada por la usuaria, posterior al ajuste CORS: **197 passed, 0 failed**.
- Suite frontend FE-001: **12 passed, 0 failed**.
- FE-004 Bloque 5: **121 pruebas frontend aprobadas** y `npm run build` exitoso. FE-004 Bloque 6: **126 pruebas frontend aprobadas** y `npm run build` exitoso, ambos confirmados por la usuaria.
- Suite frontend FE-002: **37 passed, 0 failed** en 8 archivos; build de producción exitoso.
- FE-003 administración de períodos: **48 passed, 0 failed** en 10 archivos; build exitoso.
- FE-003 calendario mensual primera entrega: **59 passed, 0 failed** en 12 archivos; build Vite 8.3.8 exitoso; validación visual/funcional confirmada por la usuaria.
- FE-003 listado y filtros de actividades primera entrega: **68 passed, 0 failed** en 14 archivos; build Vite 8.3.8 exitoso con 42 módulos; validación visual/funcional confirmada por la usuaria.
- FE-003 CRUD, detalle, navegación desde alertas, transiciones, cancelación y eliminación: suite frontend completa **84 passed, 0 failed**; build Vite 8.3.8 exitoso con 44 módulos; comprobaciones manuales funcionales confirmadas por la usuaria.
- Regresión integrada final FE-003 contra FastAPI: **satisfactoria**, confirmada por la usuaria el 16-11-2026; sin incidencias reportadas. Incluyó persistencia de mutaciones y eliminación en cascada.
- Validación manual integrada FE-002: Dashboard, alertas, revisión, navegación, responsive y teclado confirmados por la usuaria.
- Build frontend de producción: exitoso.
- La ejecución backend mostró una advertencia deprecatoria de Starlette por el uso de `httpx` con `starlette.testclient`; no afectó el resultado. La actualización de dependencias queda fuera del alcance de FE-001 y requiere revisión independiente.
- Los resultados anteriores por bloque son históricos y acumulativos.
- No se declara cobertura mínima del 80 % hasta disponer de un informe de cobertura verificable.
- La advertencia de Starlette relacionada con `httpx` observada en la última ejecución no produjo fallos en las pruebas; no se modifica la dependencia sin necesidad y revisión.

## 8. Entorno y tareas técnicas pendientes

- La línea base Sprint 0 aprobada fija Python 3.14.10. La usuaria reportó un entorno local con Python 3.15.2; la validación reproducible en Python 3.14.10 sigue pendiente.
- La validación de 195 pruebas incluye BE-010 y se ejecutó localmente con Python 3.15.2. No reemplaza la comprobación reproducible en la versión Python fijada (3.14.10), que sigue pendiente.
- `backend/pylock.toml` y `frontend/package-lock.json` se identificaron como archivos locales no versionados en el último estado conocido. Deben preservarse y revisarse antes de decidir su incorporación.
- No eliminar, sobrescribir ni limpiar archivos locales no rastreados durante sincronizaciones.

## 9. Flujo de trabajo obligatorio

1. Consultar y proteger el estado local de Git antes de sincronizar.
2. Crear y registrar cambios primero en GitHub, en `feat/backend-domain-foundation`.
3. No modificar `main` ni hacer merge o force push sin autorización expresa.
4. Sincronizar al repositorio local mediante fast-forward cuando sea posible.
5. Ejecutar la suite completa localmente.
6. Si aparecen fallos, corregir primero en GitHub, volver a sincronizar y repetir las pruebas.
7. Marcar un bloque como validado únicamente cuando la usuaria comparta el resultado local satisfactorio.

Las especificaciones aprobadas siguen siendo la fuente de verdad funcional y técnica. Este documento registra el avance; no introduce ni modifica requisitos.

## 10. Próximos pasos inmediatos

1. Refinar FE-006 — Gestión de datos e integración — conforme a UI-001, API-001 §5.9, SPEC-006 v0.2, ARCH-001 y decisiones aprobadas sobre el catálogo de respaldos. La especificación debe madurarse y aprobarse antes de implementar.
2. Mantener pendiente la validación reproducible con Python 3.14.10, según la línea base técnica aprobada.
3. Tras aprobar FE-006, descomponer su implementación en bloques verificables y ejecutar regresión integral sin modificar contratos normativos.

---

**Fin del estado del proyecto.**


## 7. FE-004 — Implementación en curso

**Especificación:** `docs/FE-004.md` v0.1, APROBADA PARA IMPLEMENTACIÓN (D1–D43).

### Bloque 1 — Servicios y utilidades monetarias

Publicado en `feat/backend-domain-foundation`:
- `frontend/src/services/api/budgetService.js`: consulta, creación y reemplazo del presupuesto.
- `frontend/src/services/api/expensesService.js`: listado, creación, consulta, PUT, PATCH, eliminación e historial de gastos.
- `frontend/src/utils/money.js`: conversión exacta entre cadenas decimales y centavos `BigInt`, formato COP y diferencia no distribuida.
- Pruebas unitarias para servicios y utilidades.

**Validación local reportada por la usuaria:** **107 passed** en la suite frontend tras sincronizar el Bloque 1. La evidencia de build se registra para el Bloque 2, no se atribuye retrospectivamente al Bloque 1.

### Bloque 2 — Vista inicial de presupuesto

Publicado en GitHub y validado localmente en pruebas:
- Pestañas Presupuesto/Gastos, con Presupuesto como vista inicial.
- Consulta del presupuesto del período activo y tratamiento de `BUDGET_NOT_FOUND` como estado vacío esperado.
- Cuatro indicadores financieros y distribución visual de las siete categorías.
- Formulario para crear o reemplazar presupuesto, con importes decimales exactos y validación de asignaciones frente al total.
- Confirmación al descartar cambios antes de cambiar de pestaña.
- Pruebas de componente para carga, estado vacío, reintento, creación, actualización y validación de distribución.

La suite frontend completa reportada tras sincronizar el Bloque 2: **114 passed**. La usuaria confirmó `npm run build` exitoso con Vite 8.3.8 y **47 módulos transformados**. **Bloque 2 validado y cerrado.** La pestaña Gastos ya incorpora el listado inicial, filtros combinables, ordenamiento global por fecha descendente y paginación local (Bloque 3). La usuaria confirmó 116 pruebas frontend aprobadas en 18 archivos y build Vite 8.3.8 exitoso con 48 módulos transformados. Bloque 3 validado y cerrado. El Bloque 4 incorporó el formulario lateral de registro y quedó validado con 118 pruebas. El Bloque 5 (detalle e historial) quedó validado con 121 pruebas y build exitoso. El Bloque 6 (edición y eliminación) está implementado, publicado y validado localmente con 126 pruebas aprobadas y build de producción exitoso.

### Observación contractual pendiente

API-001 v0.8 devuelve por categoría `allocated_amount`, `spent_amount`, `balance` y `over_budget`, pero no define un porcentaje de ejecución por categoría. FE-004 F08/D6 solicita mostrar dicho porcentaje. La interfaz no inventa ni recalcula ese indicador: debe resolverse mediante una decisión explícita de producto o una modificación contractual independiente, sin alterar silenciosamente API-001.



## 6.3 FE-005 — Informes

**Estado: VALIDADO Y CERRADO el 16-11-2026.** Documento `docs/FE-005.md` v0.2, con FE005-D01 a D62, RF-001 a RF-090, CA-001 a CA-022 y B5-CA01 a B5-CA12. Los cinco bloques están implementados y publicados. La usuaria confirmó 13 pruebas de ReportsPage, suite frontend completa con **150 passed, 0 failed** en 20 archivos, build Vite 8.3.8 exitoso y revisión visual/funcional satisfactoria. La corrección del test de notificación de exportación se publicó en el commit `0789bac9920bdab27df3c9244d627ac54e477520`. Los warnings informativos de React/jsdom no produjeron fallos.

## 6.4 FE-006 — Gestión de datos e integración

**Estado: REFINEMENT INICIADO el 16-11-2026; no aprobado para implementación.**

- Documento: `docs/FE-006.md` v0.1, borrador en refinement.
- Alcance heredado: catálogo de copias semanales, restauración confirmada y recarga del contexto; regresión integral y revisión transversal de calidad.
- Contratos: `GET /backups` y `POST /backups/restore`, definidos en API-001 §5.9. No se crean endpoints ni se exponen respaldos `pre_write`.
- Restricciones: máximo 15 copias semanales; restaurables únicamente las copias cuyo estado listado sea `valid`; confirmación explícita; backend vuelve a validar antes de reemplazar datos; aplicación de API-DEC-038 después del éxito.
- El borrador contiene 32 requisitos preliminares, 15 criterios de aceptación preliminares y preguntas abiertas. La Product Owner debe resolverlas y aprobar la especificación antes de iniciar la implementación.

