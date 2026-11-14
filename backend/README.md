# Backend

Backend previsto: Python, FastAPI y Pydantic.

La implementación seguirá la arquitectura por capas aprobada en ARCH-001:

- API/controladores.
- Servicios y reglas de negocio por dominio.
- Persistencia y repositorios JSON.

El backend será el único responsable de acceder a `data/datos_vacaciones.json`. El servidor escuchará exclusivamente en `localhost`.

La estructura de paquetes y las dependencias se definirán en las tareas siguientes de Sprint 0. Este archivo no representa todavía una implementación funcional.
