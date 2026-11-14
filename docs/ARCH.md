

# ARCH-001 — Arquitectura técnica

| Campo | Valor |
|---|---|
| Proyecto | Sistema de Planificación y Control de Vacaciones Decembrinas |
| Identificador | ARCH-001 |
| Versión | 0.1 |
| Estado | Aprobada |
| Fecha de aprobación registrada | 14 de noviembre de 2026 |
| Persistencia | Archivo JSON local |
| Documentos relacionados | DATA-001, API-001, UI-001 y SPEC-001 a SPEC-006 |

## 1. Propósito

Definir la arquitectura técnica del sistema, estableciendo sus componentes, responsabilidades, comunicación, persistencia, seguridad, mecanismos de recuperación y criterios de calidad.

La solución será modular, local, mantenible y preparada para el crecimiento progresivo de información.

## 2. Principios arquitectónicos

1. **Separación de responsabilidades:** interfaz, API, lógica de negocio y persistencia estarán desacopladas.
2. **Backend como responsable de los datos:** únicamente el backend podrá acceder al archivo JSON.
3. **Persistencia local:** no se utilizarán bases de datos externas ni servicios de almacenamiento remoto.
4. **Integridad:** las escrituras protegerán el archivo principal frente a operaciones incompletas, errores y concurrencia.
5. **Modularidad:** cada dominio funcional tendrá responsabilidades claramente delimitadas.
6. **Reutilización visual:** se podrán adaptar componentes compatibles con la identidad gráfica aprobada del Programa 1, sin compartir su lógica de negocio ni modificar su repositorio.
7. **Trazabilidad:** las decisiones arquitectónicas mantendrán correspondencia con las especificaciones aprobadas.
8. **Verificabilidad:** los componentes podrán probarse de manera independiente.

## 3. Stack tecnológico

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | React | Construcción de la interfaz |
| Herramienta frontend | Vite | Desarrollo y compilación |
| Lenguaje frontend | JavaScript / JSX | Lógica de presentación |
| Estructura visual | HTML5 y CSS3 | Interfaz y estilos |
| Backend | Python | Lógica del servidor |
| Framework API | FastAPI | Endpoints REST |
| Validación | Pydantic | Validación de datos y contratos |
| Persistencia | JSON local | Almacenamiento principal |
| Pruebas backend | pytest | Pruebas unitarias e integración |
| Pruebas frontend | Herramientas compatibles con React | Pruebas de componentes y flujos |

No se incorporarán frameworks CSS Bootstrap ni Tailwind. Las dependencias adicionales deberán justificarse por una necesidad funcional o técnica.

Las versiones exactas del entorno se rigen por `docs/sprint-0-technical-baseline.md`.

## 4. Arquitectura general

Se adopta una arquitectura cliente-servidor local con cuatro capas:

1. Presentación.
2. API y controladores.
3. Servicios y reglas de negocio.
4. Persistencia y archivos.

```text
┌─────────────────────────────────────────┐
│                 FRONTEND                │
│          React + Vite + JavaScript      │
│                                         │
│ Dashboard · Actividades · Calendario    │
│ Alertas · Presupuestos · Gastos         │
│ Informes · Gestión de datos             │
│                                         │
│ Componentes + servicios HTTP            │
└────────────────────┬────────────────────┘
                     │ HTTP / JSON
┌────────────────────▼────────────────────┐
│                  BACKEND                │
│                  FastAPI                │
│ Routers · Validación Pydantic           │
│ Servicios de aplicación · Reglas        │
│ Repositorios                            │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│                PERSISTENCIA             │
│ datos_vacaciones.json                   │
│ Validación · Escritura atómica          │
│ Control de concurrencia                 │
│ Backups · Recuperación · Logs           │
└─────────────────────────────────────────┘
```

El frontend no tendrá acceso directo a los archivos de persistencia. Toda lectura, creación, modificación y eliminación se realizará mediante operaciones controladas por el backend.

## 5. Arquitectura del backend

### 5.1. Capa API

Responsabilidades:

- Exponer endpoints REST.
- Recibir solicitudes del frontend.
- Validar los datos de entrada.
- Invocar los servicios correspondientes.
- Devolver respuestas estructuradas.
- Gestionar códigos HTTP y errores de comunicación.

Los routers se organizarán por dominio:

- Períodos.
- Actividades.
- Calendario.
- Alertas.
- Presupuestos.
- Gastos.
- Dashboard.
- Informes.
- Copias de seguridad y restauración.

Los contratos se especifican en API-001.

### 5.2. Capa de servicios

| Servicio | Responsabilidad |
|---|---|
| `PeriodService` | Gestión de períodos |
| `ActivityService` | Gestión y validación de actividades |
| `CalendarService` | Consultas y organización de actividades por fecha |
| `AlertService` | Evaluación, activación y revisión de alertas |
| `BudgetService` | Administración de presupuestos |
| `ExpenseService` | Registro, modificación y consulta de gastos |
| `DashboardService` | Consolidación de indicadores |
| `ReportService` | Preparación de información para informes |
| `BackupService` | Copias de seguridad y recuperación |

Los servicios no manipularán directamente archivos JSON. La persistencia se realizará mediante repositorios.

### 5.3. Validación

Pydantic se utilizará para:

- Validar solicitudes y respuestas.
- Verificar tipos y formatos.
- Aplicar restricciones estructurales.
- Mantener contratos consistentes entre frontend y backend.

Las reglas de negocio que involucren varias entidades permanecerán en los servicios correspondientes.

### 5.4. Persistencia

Se utilizará un repositorio JSON centralizado, responsable de:

- Leer el archivo principal.
- Validar su estructura.
- Entregar los datos a los servicios.
- Aplicar modificaciones autorizadas.
- Coordinar escrituras.
- Ejecutar escrituras atómicas.
- Gestionar errores de lectura y escritura.

Ningún router ni servicio funcional escribirá directamente en `datos_vacaciones.json`.

## 6. Arquitectura del frontend

### 6.1. Módulos funcionales

| Módulo | Responsabilidad |
|---|---|
| Dashboard | Indicadores generales y alertas pendientes |
| Períodos | Selección y administración del período |
| Actividades | Creación, edición, consulta y eliminación |
| Calendario | Visualización diaria, semanal y mensual |
| Alertas | Consulta y revisión de alertas |
| Presupuesto | Presupuesto general y distribución por categoría |
| Gastos | Registro, edición, eliminación y consulta |
| Informes | Consultas, filtros y exportaciones |
| Gestión de datos | Consulta de copias y restauración controlada |

### 6.2. Componentes compartidos

- Sidebar.
- Topbar.
- Tarjetas de indicadores.
- Formularios.
- Modales.
- Tablas.
- Filtros.
- Mensajes de confirmación.
- Alertas visuales.
- Gráficos.
- Estados de carga y error.

Los componentes compartidos mantendrán coherencia visual y evitarán duplicar implementaciones.

### 6.3. Comunicación con el backend

El frontend utilizará una capa de servicios HTTP para centralizar las solicitudes. Los componentes no implementarán lógica de persistencia.

La interfaz deberá:

- Validar datos antes de enviarlos cuando corresponda.
- Presentar errores comprensibles.
- Mostrar confirmaciones de operaciones.
- Actualizar información después de operaciones exitosas.
- No mostrar cambios como guardados antes de recibir confirmación del backend.

## 7. Persistencia JSON

### 7.1. Archivo principal

El archivo principal será `datos_vacaciones.json`. Su estructura se define en DATA-001.

### 7.2. Responsabilidad exclusiva del backend

El frontend no podrá leer, escribir, modificar la estructura, crear copias ni restaurar archivos directamente.

### 7.3. Integridad de datos

Antes de guardar, el backend deberá:

1. Validar la solicitud.
2. Aplicar las reglas de negocio.
3. Validar la consistencia de los datos resultantes.
4. Preparar el nuevo contenido.
5. Ejecutar la escritura segura.

No se persistirá información que incumpla las reglas funcionales aprobadas.

### 7.4. Escritura atómica

El mecanismo de escritura seguirá esta secuencia:

1. Adquirir el mecanismo de exclusión de escritura.
2. Crear el respaldo previo a la modificación.
3. Generar un archivo temporal en el mismo sistema de archivos que el archivo principal.
4. Escribir el contenido completo en el archivo temporal.
5. Validar que el contenido pueda leerse y cumpla la estructura esperada.
6. Asegurar la escritura del archivo temporal en disco.
7. Sustituir el archivo principal mediante una operación atómica del sistema de archivos.
8. Liberar el mecanismo de exclusión.

Si ocurre un error antes de la sustitución, el archivo principal permanecerá intacto. La implementación verificará las garantías de sustitución atómica del sistema operativo utilizado.

## 8. Copias de seguridad y recuperación

Se distinguen dos mecanismos:

### 8.1. Copias semanales

- Frecuencia: semanal.
- Retención: últimas 15 copias semanales.
- Almacenamiento local.
- Identificación mediante UUID independiente generado por el backend.
- Verificación de integridad antes de permitir restauración.
- Si la aplicación permaneció cerrada durante la fecha programada, se generará la copia pendiente al siguiente inicio.

No se requerirá un servicio externo ni un proceso permanente en segundo plano.

### 8.2. Respaldos previos a escritura

- Se generarán antes de cada escritura.
- Permanecerán separados de las copias semanales.
- Protegerán la versión anterior durante la operación.
- Si la operación finaliza correctamente, podrán retirarse conforme al mecanismo de limpieza transaccional.
- Si ocurre un fallo, se conservarán para recuperación y diagnóstico.

La retención semanal no se mezclará con la gestión de respaldos previos a escritura.

### 8.3. Identidad y catálogo de backups — decisión aprobada

Cada copia tendrá un UUID independiente (`backup_id`) generado por el backend y asociado al archivo de respaldo.

El UUID y los metadatos administrativos se almacenarán fuera de `datos_vacaciones.json`. El frontend recibirá `backup_id` y metadatos seguros, nunca rutas físicas.

El catálogo local aprobado será:

`data/backups/manifest.json`

Cada entrada contendrá como mínimo:

- `backup_id`: UUID.
- `created_at`: timestamp ISO 8601 con zona horaria.
- `type`: `weekly` o `pre_write`.
- `validation_status`: resultado de la última validación.
- `file_reference`: referencia relativa interna, nunca expuesta al frontend.

El catálogo y los archivos de respaldo estarán excluidos del control de versiones.

El nombre de cada archivo permitirá identificar su UUID, tipo y momento de creación. Si el manifiesto falta o se daña, el backend podrá reconstruirlo examinando exclusivamente el directorio local de respaldos y validando cada archivo. Los archivos inválidos se conservarán y reportarán, pero no serán restaurables.

### 8.4. Recuperación

El proceso deberá:

1. Detectar que el archivo principal no puede leerse o validarse.
2. Bloquear nuevas escrituras.
3. Conservar el archivo dañado.
4. Identificar las copias disponibles.
5. Validar la integridad de la copia seleccionada.
6. Solicitar confirmación al usuario.
7. Restaurar la copia mediante un procedimiento seguro.
8. Verificar el archivo restaurado.
9. Informar el resultado.

No se reemplazará automáticamente el archivo principal dañado.

## 9. Control de concurrencia

Las escrituras se centralizarán en el backend mediante un mecanismo de exclusión mutua para impedir modificaciones simultáneas del archivo principal.

El mecanismo deberá coordinar escrituras, evitar sobrescrituras, liberar el bloqueo al finalizar, gestionar errores sin dejar bloqueos permanentes y preservar los datos anteriores ante una operación fallida.

La estrategia concreta se implementará considerando la ejecución local y el archivo único de persistencia.

## 10. Errores y registros

El manejo de excepciones del backend estará centralizado.

La API devolverá mensajes comprensibles y códigos HTTP adecuados. La interfaz no mostrará trazas técnicas ni detalles internos innecesarios.

Se mantendrán registros locales para diagnosticar errores de lectura, escritura, validación, persistencia, copias de seguridad, recuperación y errores inesperados. Los registros no almacenarán información personal innecesaria.

## 11. Seguridad y ejecución local

- La aplicación se ejecutará localmente y no requerirá autenticación.
- El servidor escuchará exclusivamente en `localhost`.
- El backend no se expondrá a la red pública.
- Se restringirá el origen permitido del frontend.
- Se validarán todas las entradas recibidas por la API.
- El frontend no podrá indicar rutas arbitrarias del sistema de archivos.
- Los archivos de datos y registros permanecerán fuera de las rutas públicas del frontend.
- No se transmitirán datos a servicios externos.

## 12. Informes y exportaciones

Los servicios de informes del backend prepararán los datos y generarán los archivos PDF y Excel. El frontend solicitará la exportación, presentará las opciones disponibles y permitirá obtener el archivo.

La selección de bibliotecas se realizará durante la implementación técnica, verificando compatibilidad, mantenimiento y ausencia de dependencias externas obligatorias.

## 13. Identidad visual y reutilización

Se mantendrá la identidad visual aprobada para el Programa 1, adaptada al sistema:

| Token | Valor |
|---|---|
| Primario | `#172A46` |
| Secundario | `#2E6B5B` |
| Acento | `#D9C28F` |
| Fondo | `#F3F6FA` |
| Superficie | `#FFFFFF` |
| Borde | `#E5EAF0` |
| Texto secundario | `#435168` |
| Éxito | `#25835E` |
| Advertencia | `#9B701E` |
| Peligro | `#BB5145` |
| Azul gráfico | `#7D9BB0` |

Tipografía: Inter, con alternativas Segoe UI y Arial.

Se podrán adaptar Sidebar, Topbar, tarjetas de indicadores, gráficos y utilidades de formato monetario. No se modificará el repositorio del Programa 1 ni se compartirán modelos, reglas de negocio o datos. Los componentes específicos de vacaciones, calendario y alertas serán propios del Proyecto 3.

## 14. Pruebas y calidad

| Nivel | Alcance |
|---|---|
| Unitarias backend | Servicios, validaciones y reglas de negocio |
| Persistencia | Lectura, escritura, atomicidad y recuperación |
| Integración API | Endpoints, contratos y respuestas |
| Frontend | Componentes y flujos principales |
| Regresión | Reglas previamente implementadas |
| Compatibilidad | Navegadores y dispositivos definidos |

La cobertura mínima objetivo del backend será del 80 %, sin sustituir la obligación de probar todas las reglas críticas.

## 15. Estructura de carpetas de referencia

```text
Planificacion_Viajes/
├── backend/
│   ├── app/
│   │   ├── api/routers/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── persistence/
│   │   ├── reports/
│   │   └── main.py
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── persistence/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── styles/
│   │   └── main.jsx
│   └── tests/
├── data/
│   ├── datos_vacaciones.json
│   ├── backups/
│   │   ├── weekly/
│   │   ├── pre_write/
│   │   └── manifest.json
│   └── logs/
├── docs/
│   ├── specs/
│   ├── architecture/
│   ├── data/
│   └── api/
├── .gitignore
├── README.md
└── requirements.txt
```

La estructura es una referencia de organización. Los archivos de datos, respaldos y registros se excluirán del control de versiones.

## 16. Trazabilidad y documentos relacionados

- SPEC-001 a SPEC-006: alcance y requisitos funcionales/no funcionales.
- DATA-001: entidades, campos y estructura JSON.
- API-001: contratos REST.
- UI-001: identidad visual e inventario de componentes.
- `docs/sprint-0-technical-baseline.md`: versiones y convenciones técnicas aprobadas.

## 17. Control de cambios

| Versión | Estado | Descripción |
|---|---|---|
| 0.1 | Aprobada | Arquitectura técnica base; decisiones posteriores de backups y catálogo se incorporan como precisiones aprobadas |

**Fin de ARCH-001.**

