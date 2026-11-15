# Estado del proyecto

**Proyecto:** Sistema de Planificación y Control de Vacaciones Decembrinas  
**Fecha de actualización:** 2026-11-15  
**Repositorio:** https://github.com/ingjazar-jpg/Planificacion_Viajes  
**Rama de trabajo:** `feat/backend-domain-foundation`  
**Fuente de verdad:** especificaciones aprobadas en `specs/` y `docs/`; código versionado en GitHub.

## 1. Resumen ejecutivo

La implementación del backend está en curso. Se completaron y validaron los bloques BE-001 a BE-007. La validación local más reciente de la suite completa reportada por la usuaria fue **169 passed**.

El resultado de 169 pruebas corresponde a la ejecución completa más reciente; los resultados históricos por bloque que se muestran abajo son hitos acumulativos, no cantidades que deban sumarse.

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
| BE-008 | API de calendario | Implementación publicada; pendiente de validación local | 9 pruebas nuevas definidas |

**Nota:** las cifras de cada fila son resultados acumulativos reportados después de cada bloque. El último resultado vigente es 169 pruebas aprobadas.

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

## 5. Trabajo pendiente del backend

Después de BE-007, y conforme a los contratos existentes, quedan por implementar y validar:

- API de Dashboard e indicadores y agregaciones definidos en SPEC-005.
- API de informes, filtros, agrupaciones, comparación histórica y exportaciones PDF/XLSX.
- API del Dashboard e indicadores y agregaciones definidos en SPEC-005.
- API de informes, filtros, agrupaciones, comparación histórica y exportaciones PDF/XLSX.
- Cualquier endpoint transversal que la revisión de implementación identifique como faltante, sin alterar contratos aprobados.

Estos componentes no deben considerarse implementados por el hecho de que existan entidades, páginas frontend o contratos documentados.

## 6. Trabajo pendiente del frontend e integración

- Sustituir placeholders por páginas funcionales.
- Conectar formularios, tablas, filtros, indicadores y acciones con la API.
- Implementar estados de carga, vacío, éxito y error.
- Verificar navegación y selección global de período.
- Implementar visualizaciones e informes conforme a UI-001 y SPEC-005.
- Validar los flujos completos frontend-backend y el manejo de errores.
- Verificar accesibilidad, responsive y compatibilidad indicadas en las especificaciones.

El shell y la navegación inicial del frontend ya habían sido validados localmente con 3 pruebas y una compilación de producción satisfactoria. Esa evidencia no equivale a validar los módulos funcionales ni su integración con el backend.

## 7. Calidad y validación

- Última suite backend completa reportada: **169 passed, 0 failed**.
- Los resultados anteriores por bloque son históricos y acumulativos.
- No se declara cobertura mínima del 80 % hasta disponer de un informe de cobertura verificable.
- La advertencia de Starlette relacionada con `httpx` observada en la última ejecución no produjo fallos en las pruebas; no se modifica la dependencia sin necesidad y revisión.

## 8. Entorno y tareas técnicas pendientes

- La línea base Sprint 0 aprobada fija Python 3.14.10. La usuaria reportó un entorno local con Python 3.15.2; la validación reproducible en Python 3.14.10 sigue pendiente.
- La validación del backend con 169 pruebas acredita el entorno local utilizado, pero no reemplaza la comprobación en la versión fijada.
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

1. Sincronizar y validar localmente BE-008 con la suite completa.
2. Corregir cualquier fallo primero en GitHub, volver a sincronizar y repetir las pruebas.
3. Tras cerrar BE-008, refinar Dashboard e informes en bloques independientes, conforme a SPEC-005 y API-001.

---

**Fin del estado del proyecto.**
