# Estado del proyecto

**Proyecto:** Sistema de Planificación y Control de Vacaciones Decembrinas  
**Fecha de actualización:** 2026-11-16  
**Repositorio:** https://github.com/ingjazar-jpg/Planificacion_Viajes  
**Rama de trabajo:** `feat/backend-domain-foundation`  
**Fuente de verdad:** especificaciones aprobadas en `specs/` y `docs/`; código versionado en GitHub.

## 1. Resumen ejecutivo

La implementación del backend BE-001 a BE-010 está validada. La usuaria confirmó la suite backend completa con **197 passed, 0 failed**. FE-001, FE-002, FE-003 y FE-004 están validados y cerrados con sus respectivas suites frontend, builds de producción y evidencias de integración registradas en este documento. FE-005 — Informes — completó el refinement el 16-11-2026; su especificación `docs/FE-005.md` v0.1 está publicada y aprobada para implementación con 61 decisiones, 78 requisitos funcionales y 22 criterios de aceptación. La implementación FE-005 aún no ha comenzado. FE-006 permanece pendiente de refinement. La validación reproducible con Python 3.14.10 continúa pendiente como tarea transversal de Sprint 0.

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

- Sustituir placeholders por páginas funcionales.
- Conectar formularios, tablas, filtros, indicadores y acciones con la API.
- Implementar estados de carga, vacío, éxito y error.
- Verificar navegación y selección global de período.
- Implementar visualizaciones e informes conforme a UI-001 y SPEC-005.
- Validar los flujos completos frontend-backend y el manejo de errores.
- Verificar accesibilidad, responsive y compatibilidad indicadas en las especificaciones.

El shell y la navegación inicial del frontend ya habían sido validados localmente con 3 pruebas y una compilación de producción satisfactoria. Esa evidencia no equivale a validar los módulos funcionales ni su integración con el backend.

### 6.1 Plan de implementación frontend

Se consolidó el mapa de implementación en seis bloques FE. FE-001 y FE-002 están validados y cerrados; FE-003 cuenta con especificación aprobada para implementación:

- `docs/FE-ROADMAP.md`: mapa de trazabilidad de seis bloques FE con pantallas, componentes, endpoints y dependencias.
- `docs/FE-001.md`: especificación aprobada para la fundación frontend.
- `docs/FE-002.md`: especificación aprobada para Dashboard y alertas (15 decisiones, 31 requisitos funcionales y 27 criterios de aceptación).
- `docs/FE-003.md`: especificación aprobada para calendario y actividades (27 decisiones, 46 requisitos funcionales y 32 criterios de aceptación).

Decisiones aprobadas para FE-001:
- Cliente HTTP: `fetch` nativo centralizado.
- Estado global del período: React Context y hooks.
- Persistencia de selección: no persistir en almacenamiento del navegador; seleccionar al iniciar el período más reciente devuelto por backend.

La implementación de FE-001 está publicada en `feat/backend-domain-foundation`. Incluye cliente HTTP centralizado con `fetch`, configuración `VITE_API_URL`, servicio de períodos, React Context, selector global y estados compartidos de carga/error/vacío. Se conserva el shell existente y no se han añadido dependencias.

**FE-001: VALIDADO Y CERRADO el 15-11-2026.** La usuaria confirmó localmente **12 pruebas frontend aprobadas, 0 fallidas**, `npm run build` exitoso y regresión backend completa con **197 passed, 0 failed**, incluidos los dos tests CORS. También confirmó la integración real con FastAPI y Vite simultáneos, carga correcta de la aplicación, consulta real de `GET /api/v1/periods`, selector de período conectado y consola sin errores visibles. Las comprobaciones manuales responsive a 360 × 800 px, navegación móvil, foco visible, operación por teclado y activación mediante `Enter` o `Espacio` fueron satisfactorias.

La advertencia deprecatoria de Starlette relacionada con `httpx` no produjo fallos y queda registrada como observación técnica no bloqueante. La validación reproducible con Python 3.14.10 permanece pendiente como tarea transversal de Sprint 0; no bloquea el cierre funcional de FE-001.

**FE-002 — Dashboard y alertas: VALIDADO Y CERRADO el 15-11-2026.** La usuaria confirmó localmente la suite frontend completa con **37 passed, 0 failed** en 8 archivos y `npm run build` exitoso con Vite 8.3.8. La validación integrada manual confirmó Dashboard conectado a FastAPI, indicadores y cuatro gráficos, estados vacíos, alertas y contador, revisión y actualización sin recarga, navegación a Actividades, actualización al regresar al Dashboard, responsive a 360 × 800 px y operación básica por teclado (Escape y gestión de foco). No hubo warnings React `act(...)` en la última ejecución; Vitest mostró solo una advertencia informativa sobre creación de entornos jsdom. El detalle funcional de actividad se mantiene dentro del alcance FE-003. El cierre no modifica ni reabre UI-001, API-001 ni las SPEC.

**FE-003 — Calendario y actividades:** refinement aprobado el 15-11-2026; especificación `docs/FE-003.md` v0.1 aprobada para implementación.

- **Administración de períodos: validada y cerrada.** La usuaria confirmó 48 pruebas aprobadas, build exitoso e integración manual de creación/edición y manejo de conflictos.
- **Calendario mensual: primera entrega validada y cerrada el 16-11-2026.** La usuaria confirmó localmente 12 archivos de pruebas, **59 passed, 0 failed**, y build Vite 8.3.8 exitoso con 41 módulos transformados. La prueba de integración App ya no presenta advertencias React `act(...)`; queda el aviso informativo de jsdom. La usuaria confirmó satisfactorias todas las pruebas visuales y funcionales: mes inicial, navegación, filtros combinados, agenda diaria, detalle, desbordamiento de actividades y vista móvil de 360 px.
- **Listado y filtros de actividades: primera entrega validada y cerrada el 16-11-2026.** La usuaria confirmó localmente **68 passed, 0 failed** en 14 archivos y build Vite 8.3.8 exitoso con 42 módulos transformados. La validación visual confirmó tabla de escritorio, tarjetas móviles, filtros combinados de categoría/prioridad/estado/destino/fechas, limpieza, validación de rango inválido sin consulta, estados vacío y error/reintento y alternancia Calendario/Listado. Vitest mostró únicamente un aviso informativo de creación de entornos jsdom.
- **FE-003 — VALIDADO Y CERRADO el 16-11-2026.** Todas las entregas funcionales están validadas individualmente. La suite frontend completa confirmó **84 passed, 0 failed** y el build Vite 8.3.8 finalizó correctamente con 44 módulos transformados. La usuaria confirmó que la regresión integrada con FastAPI, con ambos servidores iniciados, se completó sin problemas; quedaron cubiertos los flujos de persistencia, transiciones, cancelación, eliminación en cascada y actualización de calendario/listado.
- **FE-004 — Presupuesto y gastos:** refinement aprobado el 16-11-2026. La especificación `docs/FE-004.md` v0.1 está publicada y aprobada para implementación; incluye 43 decisiones (D1–D43), 68 requisitos funcionales, contratos, criterios de aceptación y estrategia de pruebas. D43 opción A establece consultar el conjunto completo filtrado, ordenar globalmente por fecha descendente en frontend y paginar localmente con 10/20/50. No se modifican API-001 ni BE-007. La implementación y validación local están pendientes.
- FE-005 y FE-006 permanecen pendientes de refinement.

### 6.2 FE-004 — Presupuesto y gastos

**Estado:** refinement aprobado; Bloques 1–6 implementados, publicados y validados. La usuaria confirmó **126 pruebas frontend aprobadas** para el Bloque 6 y build de producción exitoso.

- Documento: `docs/FE-004.md` v0.1.
- Decisiones aprobadas: D1–D43. D43 opción A resuelve la ausencia de ordenamiento contractual: GET /expenses consulta el conjunto filtrado completo sin page/page_size; el frontend ordena globalmente por fecha descendente y pagina localmente con 10/20/50.
- Requisitos: 68 requisitos funcionales para presupuesto, gastos, filtros, paginación, detalle, historial, estados, calidad y accesibilidad.
- Contratos: GET/POST/PUT de presupuesto; GET/POST/GET/PUT/PATCH/DELETE de gastos; GET de historial; consulta de actividades para asociación. Todos conforme a API-001 v0.8.
- Restricción: no se modifica API-001 ni se reabre BE-007.
- Bloque 3 validado: listado completo de gastos, filtros combinables, ordenamiento global por fecha descendente y paginación local 10/20/50. Evidencia: 116 pruebas frontend aprobadas en 18 archivos y build exitoso con 48 módulos transformados.
- Bloque 4 validado: formulario lateral de registro, actividad opcional del período, campos opcionales colapsados, validación monetaria exacta y actualización del listado e indicadores tras crear. Evidencia: 118 pruebas frontend aprobadas. El ajuste que resolvió dos consultas ambiguas se limitó al archivo de pruebas; no modificó código de producción ni contratos.
- Bloque 5 validado y cerrado: panel lateral de detalle, consulta contractual `GET /expenses/{expense_id}`, pestañas Información/Historial, consulta `GET /expenses/{expense_id}/history`, línea de tiempo cronológica ascendente y estado vacío. Evidencia de usuaria: 121 pruebas frontend aprobadas y build de producción exitoso.
- Bloque 6 implementado, publicado y validado: **126 pruebas frontend aprobadas** y `npm run build` exitoso, ambos confirmados por la usuaria. Alcance: edición desde el panel lateral mediante `PATCH /expenses/{expense_id}` enviando únicamente campos modificados; importes con validación decimal exacta; campos opcionales limpiados enviados como `null`; `period_id` nunca editable ni enviado. Incluye prevención de doble envío, actualización del gasto y del historial, refresco de indicadores y listado, y eliminación mediante `DELETE /expenses/{expense_id}` con confirmación que muestra todos los datos y advierte la eliminación definitiva del historial. Se añadieron pruebas para edición parcial, campos opcionales, edición sin cambios, confirmación de eliminación y cancelación.

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

1. Continuar con FE-005: iniciar el refinement de Informes conforme a la especificación aprobada y a los contratos de API-001.
2. Mantener pendiente la validación reproducible con Python 3.14.10, según la línea base técnica aprobada.
3. Refinar FE-005 y FE-006 después de completar el trabajo priorizado.

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

**Estado:** refinement aprobado el 16-11-2026; especificación v0.1 publicada y aprobada para implementación. Implementación pendiente.

- Documento: [FE-005 — Especificación de informes](FE-005.md).
- Refinement: decisiones FE005-D01 a FE005-D61 consolidadas. D01–D57 aprobadas durante el refinement; D58 opción B aceptada explícitamente; D59–D61 definidas por delegación técnica expresa para optimizar la implementación.
- Alcance: cuatro pestañas — General, Actividades, Presupuesto y gastos, Comparación histórica.
- Requisitos: 78 requisitos funcionales y 22 criterios de aceptación.
- Contratos: tres endpoints de informes individuales y endpoint de comparación histórica definidos en API-001 §5.8. No se crean ni modifican endpoints.
- Exportación: PDF/XLSX para los tres informes individuales con alcance `filtered` o `period`; la comparación histórica no es exportable.
- Restricciones: cálculos e indicadores provienen del backend; no persistir filtros ni resultados en almacenamiento local; no modificar SPEC-005, UI-001, API-001 ni DATA-001.
- Validación: pendiente. No se declara FE-005 validado hasta recibir evidencia local de pruebas, build e integración con FastAPI confirmada por la usuaria.
