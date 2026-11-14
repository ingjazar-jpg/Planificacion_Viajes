# Desarrollo local

**Estado:** Guía de preparación de entorno de Sprint 0.  
**Fuente de configuración:** `docs/sprint-0-technical-baseline.md`.

## 1. Requisitos

Instalar las versiones aprobadas:

- Python 3.14.10.
- Node.js 26.13.1 LTS.
- npm 11.20.0 (incluido con Node.js 26.13.1).
- Git.

Comprobar desde PowerShell, en la raíz del repositorio:

```powershell
python --version
node --version
npm --version
git --version
```

Las versiones de Python, Node.js y npm deben coincidir con `.python-version`, `.nvmrc` y `.npm-version`.

## 2. Generación automatizada de lockfiles y validación

Con el repositorio actualizado desde GitHub, ejecutar desde la raíz:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\prepare-local-lockfiles.ps1
```

El script:

1. Comprueba Python, Node.js y npm contra las versiones fijadas.
2. Crea `.venv/` si no existe.
3. Actualiza pip a 26.3.
4. Genera `backend/pylock.toml` desde `backend/requirements-dev.txt`.
5. Instala el entorno Python desde el lock y comprueba dependencias e imports.
6. Genera `frontend/package-lock.json` mediante npm.
7. Instala el frontend mediante `npm ci`.
8. Comprueba el árbol de dependencias y los imports principales de React, Vite, Vitest, jsdom y Testing Library.

**Nota sobre Python:** el comando `pip lock` de pip 26.3 está documentado como experimental. El lock generado garantiza compatibilidad con la versión de Python y plataforma donde se generó. Para este proyecto se generará en el equipo local previsto (Windows con Python 3.14.10). https://pip.pypa.io/en/stable/cli/pip_lock/

El script no crea ni modifica código funcional y no hace commit ni push.

## 3. Archivos esperados

Al terminar correctamente:

- `backend/pylock.toml`: lockfile Python.
- `frontend/package-lock.json`: lockfile npm.
- `.venv/`: entorno virtual local, excluido de Git.
- `frontend/node_modules/`: dependencias instaladas, excluidas de Git.

Los dos lockfiles sí deben revisarse y versionarse en GitHub. No subir el entorno virtual ni `node_modules/`.

## 4. Validación adicional

Desde la raíz:

```powershell
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m pip list
```

Desde `frontend/`:

```powershell
npm ls --depth=0
npm run
```

No ejecutar todavía `npm run build` ni `npm test` como criterios de éxito: aún no se han incorporado `index.html`, la entrada de React ni los primeros tests. El script solo valida la instalación, resolución de dependencias e imports.

## 5. Revisión de cambios locales

Al terminar:

```powershell
git status --short
```

Se esperan los dos lockfiles nuevos. No deben aparecer cambios en `datos_vacaciones.json`, respaldos, `.venv/` ni `node_modules/`.

Antes de confirmar los archivos, revisar su contenido y comprobar que no contienen datos locales, rutas personales ni secretos.

Cuando el resultado sea correcto, crear un commit con únicamente:

- `backend/pylock.toml`
- `frontend/package-lock.json`

Si el script también modificó otro archivo, revisar el diff antes de incluirlo.

## 6. Sincronización Git

Para descargar cambios de GitHub a una copia local existente:

```powershell
git pull origin main
```

Para una primera copia:

```powershell
git clone https://github.com/ingjazar-jpg/Planificacion_Viajes.git
cd Planificacion_Viajes
```

No ejecutar ambos flujos sobre la misma carpeta. Antes de actualizar una copia local con cambios propios, comprobar `git status` y guardar o confirmar el trabajo local.

## 7. Estado actual

La guía y el script están versionados en GitHub. Los lockfiles no se han generado ni validado todavía porque requieren ejecutarse en el equipo local con los runtimes aprobados.

La aplicación funcional, el build y las pruebas funcionales se incorporarán en tareas posteriores.

Los datos locales, respaldos, archivos temporales, entornos virtuales, dependencias instaladas y registros no se versionan.