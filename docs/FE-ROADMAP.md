# FE-ROADMAP — Mapa de implementación del frontend

| Campo | Valor |
|---|---|
| Proyecto | Sistema de Planificación y Control de Vacaciones Decembrinas |
| Identificador | FE-ROADMAP |
| Versión | 0.2 |
| Estado | APROBADO PARA PLANIFICACIÓN |
| Fecha | 16-11-2026 |
| Rama de trabajo | `feat/backend-domain-foundation` |
| Documentos normativos | UI-001 v0.1, API-001 v0.8, ARCH-001 v0.1, DATA-001 v0.2 y SPEC-001 a SPEC-006 |

## 1. Propósito

Organizar la implementación del frontend en seis bloques verificables, agrupados por experiencias de usuario y dependencias compartidas. Este mapa establece el alcance de cada bloque y su trazabilidad con pantallas, componentes y contratos backend.

Los seis bloques FE son unidades de planificación e implementación; no implican una correspondencia uno a uno con los diez bloques BE ya validados.

## 2. Principios de implementación

1. Las especificaciones aprobadas son la fuente de verdad funcional y técnica.
2. El frontend consume exclusivamente la API definida en API-001.
3. Los cálculos y reglas de negocio permanecen en el backend.
4. Se reutiliza la base existente de React/Vite y los componentes compatibles; no se reconstruye innecesariamente lo ya validado.
5. Se priorizan entregas verticales, probables de forma independiente y conectadas al backend.
6. Los componentes compartidos y contratos internos se estabilizan en FE-001 antes de distribuir módulos en paralelo.
7. Las pruebas, accesibilidad y responsive se incorporan durante cada bloque, no únicamente al cierre.
8. Toda modificación se publica primero en GitHub en la rama de trabajo; después se sincroniza localmente y se valida.

## 3. Mapa de los seis bloques

| Bloque | Nombre | Alcance principal | Pantallas |
|---|---|---|---|
| FE-001 | Fundación frontend | Layout, navegación, cliente HTTP, contexto global de período, estados comunes | Shell compartido |
| FE-002 | Dashboard y alertas | Indicadores, gráficos, alertas pendientes, panel y revisión | Dashboard y panel de alertas |
| FE-003 | Calendario y actividades | Administración de períodos, calendario mensual, filtros, consulta y mantenimiento de actividades | Calendario y Actividades |
| FE-004 | Presupuesto y gastos | Presupuesto por categoría, gastos, filtros, edición e historial | Presupuesto y gastos |
| FE-005 | Informes | Informes, filtros, comparación histórica y exportaciones | Informes |
| FE-006 | Gestión de datos e integración | Catálogo de respaldos, restauración y regresión integral | Gestión de datos y cierre de integración |

### FE-001 — Fundación frontend

- Consolidar el shell existente: Sidebar, Topbar, navegación móvil y área de contenido.
- Mantener las seis secciones de navegación definidas en UI-001.
- Implementar el selector global de período conectado a `GET /api/v1/periods`.
- Compartir el período activo mediante React Context y hooks.
- Centralizar las solicitudes con `fetch` nativo.
- Normalizar errores conforme a API-001.
- Establecer estados comunes de carga, error, vacío y éxito.
- Conservar el stack y dependencias existentes salvo justificación aprobada.

### FE-002 — Dashboard y alertas

- Dashboard del período seleccionado.
- Indicadores financieros y de actividades.
- Gráficos definidos en SPEC-005 y UI-001.
- Alertas pendientes, contador y panel de consulta.
- Acción de marcar alerta como revisada.
- Consumo de respuestas calculadas por el backend, sin duplicar cálculos.

### FE-003 — Calendario y actividades

- Administración de períodos desde el selector global de Topbar, con listado, creación y edición; no se permite eliminar períodos.
- Calendario mensual con navegación anterior/siguiente/Hoy, filtros combinables y actividades multidiarias.
- Vista de calendario y listado conmutables; tabla en escritorio y tarjetas en móvil.
- Creación, detalle, edición, transiciones de estado, cancelación y eliminación de actividades.
- Integración desde alertas al detalle de la actividad correspondiente.
- Confirmaciones para cancelar/eliminar y comunicación explícita de eliminación en cascada.
- Decisiones FE003-DEC-001 a FE003-DEC-027 aprobadas; especificación formal en docs/FE-003.md.

**Estado FE-003 al 16-11-2026: VALIDADO Y CERRADO.** Todas las entregas funcionales están validadas. La suite frontend completa confirmó **84 passed, 0 failed** y build Vite 8.3.8 exitoso (44 módulos transformados). La usuaria confirmó que la regresión integrada con FastAPI, ejecutada con ambos servidores iniciados, se completó sin problemas, incluidos los flujos de persistencia, transiciones, cancelación, eliminación en cascada y actualización de calendario/listado.

### FE-004 — Presupuesto y gastos

**Estado FE-004 al 16-11-2026: BLOQUES 1–6 IMPLEMENTADOS, VALIDADOS Y CERRADOS.** Refinement aprobado y especificación `docs/FE-004.md` v0.1. La usuaria aprobó D1–D43, incluida D43 opción A: consultar el conjunto completo filtrado, ordenar globalmente por fecha descendente en frontend y paginar localmente con 10/20/50 registros; no se envían page/page_size ni se modifica API-001 o BE-007. Para el Bloque 6, confirmó **126 pruebas frontend aprobadas** y build de producción exitoso.

- Sección conjunta con pestañas internas Presupuesto y Gastos.
- Resumen general y distribución de siete categorías.
- Creación y reemplazo del presupuesto.
- Registro, consulta, edición y eliminación de gastos.
- Filtros, paginación e historial de modificaciones.
- Presentación monetaria COP sin alterar cadenas decimales de API.

**Bloque 3 validado y cerrado:** listado inicial de gastos, filtros combinables por fechas/categoría/actividad/importe, orden global por fecha descendente y paginación local 10/20/50, con tabla de escritorio y tarjetas móviles. La usuaria confirmó 116 pruebas frontend aprobadas en 18 archivos y build Vite 8.3.8 exitoso con 48 módulos transformados.

**Bloque 4 validado y cerrado:** formulario lateral para registrar gastos con campos obligatorios y opcionales, búsqueda y asociación opcional de actividades del período, validación monetaria exacta (importe mayor que cero), POST contractual con `period_id` global y actualización posterior del listado e indicadores. La usuaria confirmó **118 pruebas frontend aprobadas** en la suite completa. `npm run build` había finalizado exitosamente con Vite 8.3.8 y 48 módulos transformados; la corrección posterior solo ajustó las consultas de dos pruebas, sin modificar código de producción.

**Bloque 5 validado y cerrado:** la usuaria confirmó **121 pruebas aprobadas** y `npm run build` exitoso. Alcance: panel lateral de detalle, consultas contractuales del gasto y su historial, pestañas Información/Historial y timeline cronológico ascendente con fecha/hora `America/Bogota`.

**Bloque 6 validado y cerrado; suite frontend con 126 pruebas aprobadas y build de producción exitoso:** edición desde el panel lateral mediante PATCH con solo los campos modificados, validación monetaria exacta, soporte de `null` para opcionales, `period_id` inmutable, refresco del listado/indicadores e historial actualizado. Eliminación mediante DELETE con confirmación explícita que muestra los datos del gasto y advierte que su historial también se elimina. Se añadieron cinco pruebas de componente para edición parcial, limpieza de campos opcionales, ausencia de cambios, confirmación de eliminación y cancelación. La usuaria confirmó **126 pruebas frontend aprobadas** y `npm run build` exitoso.

### FE-005 — Informes

**Estado FE-005 al 16-11-2026: IMPLEMENTADO, VALIDADO Y CERRADO.** Especificación `docs/FE-005.md` v0.2, con FE005-D01 a D62, RF-001 a RF-090 y CA-001 a CA-022 + B5-CA01 a B5-CA12.

- Cuatro pestañas: General, Actividades, Presupuesto y gastos, Comparación histórica.
- Filtros contractuales, paginación, estados vacíos/carga/error y protección frente a respuestas obsoletas.
- Exportaciones PDF/XLSX de los tres informes individuales con alcance `filtered` o `period`; comparación sin exportación.
- Cinco bloques implementados y publicados; contratos API-001 §5.8 sin modificaciones.
- Evidencia local confirmada por la usuaria: **150 pruebas frontend aprobadas, 0 fallidas** en 20 archivos; `npm run build` exitoso con Vite 8.3.8; revisión visual y funcional satisfactoria.
- Corrección del test de notificación de exportación publicada en commit `0789bac9920bdab27df3c9244d627ac54e477520`.
- Los warnings informativos de React/jsdom no afectaron la suite ni el build.

### FE-006 — Gestión de datos e integración

**Estado al 16-11-2026: ESPECIFICACIÓN APROBADA PARA IMPLEMENTACIÓN.** `docs/FE-006.md` v0.2 consolida FE006-DEC-001 a DEC-010, RF-001 a RF-045 y CA-001 a CA-025. No quedan decisiones de Product Owner pendientes.

- Catálogo de copias semanales y estados de validación.
- Restauración con advertencia y confirmación explícita.
- Recarga del contexto después de restaurar, según API-DEC-038.
- Pruebas integrales de los flujos principales.
- Revisión transversal responsive, accesibilidad, errores y regresiones.
- Cierre documental del frontend.

## 4. Trazabilidad FE → API → BE

| Bloque FE | Pantalla / capacidad | Contratos API-001 | Backend relacionado |
|---|---|---|---|
| FE-001 | Selector global de períodos | `GET /periods` | BE-005 |
| FE-002 | Dashboard | `GET /periods/{period_id}/dashboard` | BE-009 |
| FE-002 | Consultar alertas | `GET /alerts` | BE-006 |
| FE-002 | Revisar alerta | `PATCH /alerts/{alert_id}/review` | BE-006 |
| FE-003 | Consultar y mantener períodos | `GET/POST/PUT /periods` | BE-005 |
| FE-003 | Actividades | `GET/POST/PUT/PATCH/DELETE /activities` y `GET /activities/{activity_id}` | BE-005 |
| FE-003 | Calendario | `GET /calendar` | BE-008 |
| FE-004 | Presupuesto | `GET/PUT /periods/{period_id}/budget` | BE-007 |
| FE-004 | Gastos e historial | Endpoints de `/expenses` y consulta de historial | BE-007 |
| FE-005 | Informes | Endpoints de `/reports` definidos en API-001 §5.8 | BE-010 |
| FE-006 | Copias de seguridad | `GET /backups`, `POST /backups/restore` | BE-004 |
| FE-006 | Recarga tras restauración | `GET /periods` y recarga de datos del período vigente | BE-004 + bloques correspondientes |

Los métodos y rutas anteriores son referencias resumidas. Los payloads, parámetros, códigos HTTP y respuestas se tomarán literalmente de API-001. No se crearán endpoints adicionales por conveniencia del frontend.

## 5. Dependencias y secuencia

1. FE-001 es prerrequisito de integración para los demás bloques porque establece el cliente HTTP, el contexto global y los componentes compartidos.
2. FE-002 a FE-005 pueden implementarse en paralelo después de estabilizar los contratos compartidos, siempre que se acuerden interfaces de componentes y no se modifiquen archivos compartidos sin coordinación.
3. FE-003 proporciona la gestión de períodos y actividades; el estado vacío inicial de FE-001 debe poder dirigir al usuario a la creación del primer período cuando FE-003 esté disponible.
4. FE-006 requiere los módulos funcionales integrados para ejecutar la regresión completa y validar la restauración de datos.
5. Responsive y accesibilidad se verifican en todos los bloques; FE-006 realiza una revisión transversal, no una implementación tardía.

## 6. Criterios de calidad comunes

- Consumo de API centralizado.
- Errores presentados de forma comprensible y sin exponer detalles internos.
- Estados de carga, vacío, error y éxito.
- Sin cálculos de negocio duplicados en frontend.
- Navegación por teclado y foco visible.
- Cumplimiento de WCAG 2.2 AA conforme a SPEC-006.
- Diseño funcional desde 360 px.
- Sin desplazamiento horizontal global.
- Pruebas de componentes y flujos principales.
- Build de producción satisfactorio.
- Compatibilidad con las versiones de navegador establecidas en SPEC-006.

## 7. Definition of Done común

Cada bloque FE se cerrará cuando:

1. Su alcance esté trazado a UI-001, SPEC aplicables y API-001.
2. Sus criterios de aceptación estén satisfechos.
3. Sus pruebas automatizadas pasen.
4. No existan regresiones en los bloques previamente validados.
5. La compilación de producción sea satisfactoria.
6. Los cambios estén publicados en GitHub en la rama autorizada.
7. La usuaria haya sincronizado localmente y compartido la evidencia de validación.
8. El estado del bloque se actualice documentalmente solo después de esa evidencia.

## 8. Estado inicial

| Bloque | Estado |
|---|---|
| FE-001 | Validado y cerrado — 15-11-2026 |
| FE-002 | Validado y cerrado — 15-11-2026 |
| FE-003 | Validado y cerrado — 16-11-2026; 84 pruebas frontend aprobadas, build exitoso y regresión integrada FastAPI satisfactoria |
| FE-004 | Validado y cerrado — Bloques 1–6; Bloque 6 con 126 pruebas aprobadas y build exitoso |
| FE-005 | Validado y cerrado — 16-11-2026; 150 pruebas aprobadas, build exitoso y revisión visual/funcional satisfactoria |
| FE-006 | Especificación v0.2 aprobada para implementación — 16-11-2026; implementación pendiente |

FE-001, FE-002 y FE-003 están validados y cerrados. FE-003 cerró el 16-11-2026 con 84 pruebas frontend aprobadas, build de producción exitoso y regresión integrada contra FastAPI satisfactoria, confirmada por la usuaria. FE-004 tiene refinement aprobado y especificación v0.1 publicada; Bloques 1–6 están implementados, publicados y validados. El Bloque 6 cerró con 126 pruebas frontend aprobadas y build de producción exitoso. FE-005 está implementado, validado y cerrado con 150 pruebas frontend aprobadas y build exitoso. FE-006 cuenta con especificación v0.2 aprobada el 16-11-2026; su implementación está pendiente.

## 9. Documentos relacionados

- [UI-001 — Identidad visual e inventario de componentes](UI-001.md)
- [FE-001 — Especificación de fundación frontend](FE-001.md)
- [FE-002 — Especificación de Dashboard y alertas](FE-002.md)
- [FE-003 — Especificación de calendario y actividades](FE-003.md)
- [FE-004 — Especificación de presupuesto y gastos](FE-004.md)
- [FE-005 — Especificación de informes](FE-005.md)
- [FE-006 — Gestión de datos e integración](FE-006.md)
- [API-001 — Contratos de endpoints REST](API-001.md)
- [ARCH-001 — Arquitectura técnica](ARCH.md)
- [Estado del proyecto](project-status.md)

**Fin de FE-ROADMAP.**
