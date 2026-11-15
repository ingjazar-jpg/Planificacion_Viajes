# FE-ROADMAP — Mapa de implementación del frontend

| Campo | Valor |
|---|---|
| Proyecto | Sistema de Planificación y Control de Vacaciones Decembrinas |
| Identificador | FE-ROADMAP |
| Versión | 0.1 |
| Estado | APROBADO PARA PLANIFICACIÓN |
| Fecha | 15-11-2026 |
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
| FE-003 | Calendario y actividades | Vistas de calendario, filtros, consulta y mantenimiento de actividades y períodos | Calendario y Actividades |
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

- Calendario diario, semanal y mensual, con vista inicial mensual.
- Navegación de fechas y filtros contractuales.
- Actividades multidiarias y canceladas según UI-001.
- Listado, creación, detalle, edición, transiciones de estado y eliminación.
- Gestión de períodos necesaria para crear y administrar el primer período.
- Confirmaciones para acciones destructivas y comunicación de eliminación en cascada.

### FE-004 — Presupuesto y gastos

- Sección conjunta con pestañas internas Presupuesto y Gastos.
- Resumen general y distribución de siete categorías.
- Creación y reemplazo del presupuesto.
- Registro, consulta, edición y eliminación de gastos.
- Filtros, paginación e historial de modificaciones.
- Presentación monetaria COP sin alterar cadenas decimales de API.

### FE-005 — Informes

- Informes General, Actividades y Presupuesto/Gastos.
- Filtros aplicables y rangos inclusivos.
- Resultados, totales y porcentajes.
- Comparación histórica de dos períodos distintos.
- Exportaciones PDF y XLSX con alcance filtered o period.
- Manejo de errores y descarga de archivos conforme a API-001.

### FE-006 — Gestión de datos e integración

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
| FE-001 | Refinamiento aprobado; pendiente de implementación |
| FE-002 | Pendiente de refinement |
| FE-003 | Pendiente de refinement |
| FE-004 | Pendiente de refinement |
| FE-005 | Pendiente de refinement |
| FE-006 | Pendiente de refinement |

La base frontend existente incluye shell, navegación inicial y placeholders de módulos. Su validación inicial registrada (3 pruebas y build correcto) no equivale a validar la integración funcional con backend.

## 9. Documentos relacionados

- [UI-001 — Identidad visual e inventario de componentes](UI-001.md)
- [FE-001 — Especificación de fundación frontend](FE-001.md)
- [API-001 — Contratos de endpoints REST](API-001.md)
- [ARCH-001 — Arquitectura técnica](ARCH.md)
- [Estado del proyecto](project-status.md)

**Fin de FE-ROADMAP.**
