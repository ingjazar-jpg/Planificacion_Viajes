# Desarrollo local

**Estado:** Guía inicial de Sprint 0.  
**Fuente de configuración:** `docs/sprint-0-technical-baseline.md`.

## 1. Requisitos

Instalar las versiones aprobadas:

- Python 3.14.10.
- Node.js 26.13.1 LTS (incluye npm).
- Git.

Comprobar desde PowerShell:

```powershell
python --version
node --version
npm --version
git --version
```

Las versiones de Python y Node deben coincidir con `.python-version` y `.nvmrc`.

## 2. Backend

Desde la raíz del repositorio:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements-dev.txt
```

Verificar dependencias:

```powershell
python -m pip show fastapi pydantic uvicorn pytest pytest-cov httpx
```

La ejecución del servidor se documentará cuando se incorpore la aplicación FastAPI.

## 3. Frontend

Desde la carpeta `frontend`:

```powershell
cd frontend
npm install
```

La primera instalación generará `package-lock.json`. Ese archivo deberá incorporarse al repositorio para que las instalaciones siguientes utilicen:

```powershell
npm ci
```

Comprobar los scripts disponibles:

```powershell
npm run
```

El servidor Vite utilizará `http://localhost:5173` y no cambiará de puerto silenciosamente.

La compilación y las pruebas se podrán ejecutar cuando se incorporen los archivos de entrada y los primeros tests:

```powershell
npm run build
npm test
```

## 4. Variables de entorno

Copiar `frontend/.env.example` a `frontend/.env.local` cuando se necesite personalizar la URL local de la API.

Los archivos `.env` reales no deben subirse a GitHub. No almacenar secretos en variables `VITE_*`, porque quedan disponibles para el código frontend.

## 5. Sincronización Git

Para descargar los cambios de GitHub a una copia local existente:

```powershell
git pull origin main
```

Para una primera copia:

```powershell
git clone https://github.com/ingjazar-jpg/Planificacion_Viajes.git
cd Planificacion_Viajes
```

No ejecutar ambos flujos sobre la misma carpeta. Antes de actualizar una copia local con cambios propios, comprobar `git status` y guardar o confirmar el trabajo local.

## 6. Estado actual

Esta guía prepara los entornos, pero no afirma que la aplicación esté ejecutable todavía. Los archivos de entrada de React, la aplicación FastAPI y las pruebas funcionales se incorporarán en tareas posteriores, después de completar las precisiones contractuales y copiar la documentación aprobada.

Los datos locales, respaldos, archivos temporales, entornos virtuales, dependencias instaladas y registros no se versionan.
