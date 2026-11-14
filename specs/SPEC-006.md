# SPEC-006 — Requisitos no funcionales

Proyecto: Sistema de Planificación y Control de Vacaciones Decembrinas
Versión: 0.2
Estado: Borrador actualizado — pendiente de aprobación
Fecha: 13 de noviembre de 2026

## 1. Objetivo

Definir los requisitos no funcionales que aseguren el rendimiento, la seguridad, la integridad de los datos, la recuperación ante fallos, la compatibilidad, la accesibilidad, la mantenibilidad y la calidad del sistema.

## 2. Restricciones técnicas

- Backend: Python, FastAPI y Pydantic.

- Frontend: React, Vite, JavaScript/JSX, HTML5 y CSS3.

- Persistencia: archivo JSON local datos_vacaciones.json.

- El acceso y la modificación de los datos JSON serán responsabilidad exclusiva del backend.

- El frontend no podrá leer ni escribir directamente el archivo JSON.

- Moneda: pesos colombianos (COP).

- No se utilizarán bases de datos externas.

- No se dependerá de servicios externos para ejecutar las funciones principales.

- No se enviará información del sistema a servicios externos.

- La aplicación deberá funcionar localmente y conservar los datos después de reiniciarse.

## 3. Rendimiento

RNF-001. Tiempo de respuesta

El sistema tendrá los siguientes objetivos de respuesta:

- Operaciones habituales: máximo 2 segundos.

- Generación de informes: máximo 5 segundos.

Estos objetivos se aplicarán a operaciones realizadas en condiciones normales de ejecución local.

RNF-002. Capacidad de crecimiento

No se establecerán límites rígidos de años, actividades o gastos por período.

La arquitectura deberá permitir el crecimiento progresivo de la información, evitando dependencias innecesarias entre períodos y manteniendo tiempos de respuesta razonables.

## 4. Copias de seguridad y recuperación

RNF-003. Frecuencia de copias

El sistema deberá generar copias de seguridad semanalmente.

RNF-004. Retención

Se conservarán las últimas 15 copias de seguridad. Al superar ese límite, se eliminarán las copias más antiguas conforme a una política controlada.

RNF-005. Recuperación de información

El sistema deberá permitir:

- Seleccionar manualmente una copia válida para restaurarla.

- Detectar corrupción del archivo principal y localizar la última copia válida.

- Solicitar confirmación antes de ejecutar una restauración.

- Informar al usuario sobre el resultado de la recuperación.

La restauración automática sin confirmación no estará permitida.

RNF-006. Archivo principal dañado

Cuando el archivo JSON principal esté dañado o no pueda validarse:

- Se bloquearán las operaciones de escritura.

- Se conservará el archivo dañado para permitir su análisis.

- Se informará al usuario de la situación.

- Se ofrecerá la recuperación desde una copia de seguridad válida.

- No se reemplazará el archivo principal sin confirmación.

## 5. Seguridad y privacidad

RNF-007. Autenticación

La aplicación no requerirá inicio de sesión ni autenticación mediante usuario y contraseña.

El alcance previsto es una aplicación de ejecución local, sin exposición obligatoria a usuarios externos.

RNF-008. Privacidad de la información

Toda la información permanecerá local.

No se enviarán datos, métricas ni información del usuario a servicios externos.

No se implementarán mecanismos de telemetría.

RNF-009. Manejo de errores

Los errores deberán gestionarse de forma controlada:

- El usuario recibirá mensajes comprensibles y orientados a la acción.

- Los detalles técnicos se registrarán en archivos de registro locales.

- No se expondrán trazas internas ni información técnica innecesaria en la interfaz.

- Los errores no deberán provocar pérdida o corrupción de información.

## 6. Integridad y persistencia

RNF-010. Escritura segura de datos

Las modificaciones del archivo JSON deberán utilizar un mecanismo de escritura atómica con respaldo previo:

- Generar una copia de seguridad antes de la operación de escritura.

- Preparar los nuevos datos en un archivo temporal.

- Validar la estructura y consistencia de los datos.

- Sustituir el archivo principal únicamente cuando la operación haya finalizado correctamente.

- Si ocurre un error, conservar el archivo principal anterior y evitar dejarlo parcialmente escrito.

RNF-011. Validación

El backend deberá validar los datos mediante Pydantic y las reglas de negocio correspondientes antes de persistirlos.

No se deberán guardar registros que incumplan las reglas funcionales aprobadas.

RNF-012. Precisión de cálculos

Los cálculos monetarios deberán mantener precisión decimal y evitar errores derivados de operaciones con números de punto flotante.

Los importes se presentarán en COP.

RNF-013. Persistencia

Los datos deberán conservarse después de cerrar y volver a iniciar la aplicación.

Los períodos históricos deberán poder consultarse sin alterar sus registros.

RNF-014. Control de escrituras concurrentes

El backend deberá controlar las operaciones de escritura para evitar pérdida o sobrescritura de información.

Las escrituras deberán coordinarse de forma segura. Una operación no podrá sobrescribir cambios de otra operación que todavía no se hayan consolidado.

## 7. Compatibilidad

RNF-015. Navegadores

La aplicación deberá ser compatible con las dos últimas versiones principales disponibles de:

- Google Chrome.

- Microsoft Edge.

- Mozilla Firefox.

- Safari.

RNF-016. Diseño adaptable

La interfaz deberá adaptarse a:

- Computadores de escritorio.

- Tabletas.

- Teléfonos móviles desde un ancho de pantalla de 360 px.

Las funciones principales deberán seguir siendo utilizables en todos estos dispositivos.

## 8. Usabilidad y accesibilidad

RNF-017. Accesibilidad

La interfaz deberá cumplir con las pautas WCAG 2.2 nivel AA.

Se contemplarán, como mínimo:

- Contraste adecuado.

- Navegación mediante teclado.

- Etiquetas accesibles en formularios y controles.

- Identificación comprensible de errores.

- Jerarquía semántica de contenidos.

- Textos legibles y controles utilizables.

- Indicadores de foco visibles.

RNF-018. Usabilidad

La interfaz deberá presentar mensajes claros para confirmar operaciones, informar errores y advertir sobre acciones que puedan afectar los datos.

Las acciones destructivas deberán solicitar confirmación cuando corresponda según las especificaciones funcionales.

## 9. Mantenibilidad

RNF-019. Modularidad

El código deberá mantener separación de responsabilidades entre:

- Modelos y validaciones.

- Reglas de negocio.

- Persistencia.

- Endpoints y contratos API.

- Componentes de interfaz.

- Presentación y estilos.

RNF-020. Reutilización

Se promoverá la reutilización de componentes y utilidades cuando sea técnicamente apropiada, sin introducir dependencias innecesarias entre las reglas de negocio.

La identidad visual deberá mantener coherencia con la línea gráfica aprobada para el Programa 1, sin compartir ni modificar su lógica de negocio.

## 10. Pruebas y calidad

RNF-021. Cobertura de pruebas

Se establece como objetivo una cobertura mínima del 80 % para el backend.

El frontend deberá contar con pruebas de los flujos principales.

RNF-022. Reglas críticas

Independientemente del porcentaje de cobertura, deberán probarse las reglas de negocio críticas, incluyendo:

- Validación de períodos y actividades.

- Restricciones de fechas y horarios.

- Prevención de solapamientos.

- Transiciones de estados.

- Generación y recuperación de alertas.

- Cálculos presupuestarios y de gastos.

- Integridad de los registros asociados.

- Persistencia y recuperación de información.

- Contratos de API.

- Generación de informes.

RNF-023. Regresión

Los cambios deberán verificarse mediante pruebas que permitan detectar regresiones en las funcionalidades previamente implementadas.

## 11. Criterios generales de aceptación

La implementación de estos requisitos se considerará satisfactoria cuando:

- Las operaciones habituales e informes cumplan los objetivos de respuesta establecidos en condiciones normales.

- El sistema pueda crecer sin límites rígidos predefinidos de registros.

- Se generen copias de seguridad semanales y se retengan las últimas 15.

- Se pueda recuperar información desde una copia válida con confirmación del usuario.

- Un archivo principal dañado no sea sobrescrito automáticamente.

- Las escrituras sean atómicas y estén protegidas frente a fallos y concurrencia.

- La aplicación funcione sin autenticación y sin transmitir información a servicios externos.

- La interfaz sea compatible con los navegadores y dispositivos definidos.

- Se cumplan las pautas WCAG 2.2 nivel AA.

- Se alcance el objetivo de cobertura de pruebas del backend y se validen los flujos principales del frontend.

- La información permanezca íntegra después de reiniciar la aplicación.

## 12. Decisiones del refinamiento

| ID | Decisión | Resultado |

| --- | --- | --- |

| DEC-029 | Tiempo de respuesta | Operaciones habituales ≤ 2 s; informes ≤ 5 s |

| DEC-030 | Volumen de información | Sin límites rígidos predefinidos |

| DEC-031 | Copias de seguridad | Semanales |

| DEC-032 | Retención | Últimas 15 copias |

| DEC-033 | Recuperación | Manual y desde última copia válida, con confirmación |

| DEC-034 | Archivo dañado | Bloquear escrituras, conservar archivo y ofrecer recuperación |

| DEC-035 | Autenticación | Sin autenticación |

| DEC-036 | Manejo de errores | Mensajes comprensibles y registros técnicos locales |

| DEC-037 | Escritura JSON | Escritura atómica con respaldo previo |

| DEC-038 | Navegadores | Chrome, Edge, Firefox y Safari; dos últimas versiones principales |

| DEC-039 | Dispositivos | Escritorio, tabletas y móviles desde 360 px |

| DEC-040 | Accesibilidad | WCAG 2.2 nivel AA |

| DEC-041 | Cobertura de pruebas | Backend ≥ 80 % y pruebas de flujos principales frontend |

| DEC-042 | Escrituras simultáneas | Control de concurrencia desde backend |

| DEC-043 | Información externa | Sin transmisión de información a servicios externos |

Hay dos aspectos técnicos que conviene revisar porque afectan la implementación:

- Copias semanales y respaldo previo a cada escritura: se ha establecido respaldo previo a cada operación de escritura en RNF-010, mientras que DEC-031 define la frecuencia de las copias de seguridad como semanal. Esto significa que habrá respaldos de seguridad semanales y respaldos previos a las escrituras, con una política de retención que debe implementarse sin confundir ambos mecanismos.

- Sin límites rígidos de volumen: no significa capacidad ilimitada garantizada; significa que no se fija un máximo contractual de registros. El rendimiento deberá comprobarse con pruebas de carga representativas.
