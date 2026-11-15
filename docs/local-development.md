# Desarrollo local

**Estado:** guía de preparación y validación del entorno de Sprint 0.  
**Fuente de configuración:** \`docs/sprint-0-technical-baseline.md\`.

## 1. Versiones aprobadas

El proyecto fija las siguientes versiones:

- Python 3.14.10 — \`.python-version\`.
- Node.js 26.13.1 — \`.nvmrc\`.
- npm 11.20.0 — \`.npm-version\`.
- Git, instalado en el equipo de desarrollo.

Comprobar las versiones desde PowerShell:

\`\`\`powershell
py -3.14 --version
node --version
npm --version
git --version
\`\`\`

El backend debe ejecutarse con Python 3.14.10. No se debe reutilizar un entorno virtual creado con otra versión de Python como sustituto de este runtime.

## 2. Validar el entorno

Desde la raíz del repositorio:

\`\`\`powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\\scripts\\prepare-local-lockfiles.ps1
\`\`\`

Aunque conserva su nombre histórico para evitar cambiar la ruta de invocación, el script ahora es exclusivamente de validación. Comprueba:

1. Python 3.14.10 mediante el launcher \`py -3.14\`.
2. Node.js y npm contra las versiones fijadas.
3. La presencia de los archivos de dependencias del backend y del frontend.
4. La coherencia de nombre, versión y formato del lockfile npm, si está presente.
5. La estructura TOML de \`backend/pylock.toml\`, si está presente.

El script no instala ni actualiza paquetes, no crea ni modifica entornos virtuales y no genera ni sobrescribe lockfiles.

## 3. Dependencias del backend

Las dependencias declaradas se mantienen en:

- \`backend/requirements.txt\`: dependencias de ejecución.
- \`backend/requirements-dev.txt\`: dependencias de desarrollo y pruebas, incluyendo las de ejecución.

La resolución de \`requirements-dev.txt\` se comprobó con Python 3.14.10 mediante \`pip install --dry-run --ignore-installed\`. La operación terminó correctamente sin instalar paquetes.

### Lockfile Python

Se generó \`backend/pylock.toml\` usando Python 3.14.10 y se validó mediante:

- Resolución en modo \`--dry-run\`.
- Instalación en un entorno virtual temporal e independiente.
- \`pip check\`, sin dependencias incompatibles.
- Importación correcta de FastAPI, Pydantic, Uvicorn, pytest, pytest-cov y httpx.
- Eliminación del entorno temporal al finalizar.

La instalación aislada terminó correctamente. El entorno existente \`.venv/\`, creado con Python 3.15.2, se conservó intacto.

**Consideración:** \`pip lock\` continúa siendo una funcionalidad experimental y el resultado puede depender del runtime y de la plataforma. Por ese motivo, \`backend/pylock.toml\` se conserva como artefacto local y se excluye de Git por ahora. No debe regenerarse de forma rutinaria ni incluirse en commits.

Cuando sea necesario regenerarlo explícitamente, ejecutar desde la raíz con Python 3.14.10:

\`\`\`powershell
$python314 = "C:\\Python314\\python.exe"
& $python314 -m pip lock -r "backend\\requirements-dev.txt" -o "backend\\pylock.toml"
\`\`\`

Para comprobar la resolución sin instalar:

\`\`\`powershell
& $python314 -m pip install --dry-run --ignore-installed -r "backend\\pylock.toml"
\`\`\`

No actualizar pip ni modificar el entorno virtual existente como parte de esta validación.

## 4. Dependencias del frontend

Las dependencias directas se declaran en \`frontend/package.json\`. El archivo \`frontend/package-lock.json\` debe mantenerse versionado para que las instalaciones sean reproducibles.

Validaciones ya realizadas:

- Instalación mediante \`npm ci\`.
- Inspección del árbol mediante \`npm ls --depth=0\`.
- Suite frontend: 3 pruebas aprobadas.
- Build de producción: correcto; Vite procesó 28 módulos.

Para una instalación limpia del frontend, desde \`frontend/\`:

\`\`\`powershell
npm ci
npm ls --depth=0
\`\`\`

Si el lockfile necesita generarse o actualizarse deliberadamente, hacerlo como una operación explícita y revisar el diff antes de versionarlo:

\`\`\`powershell
npm install --package-lock-only --no-audit --no-fund
\`\`\`

No regenerar el lockfile como efecto secundario de la validación habitual.

## 5. Entornos y archivos locales

Se mantienen fuera del control de versiones:

- \`.venv/\` y otros entornos virtuales.
- \`node_modules/\` y \`frontend/node_modules/\`.
- \`frontend/dist/\` y cachés de herramientas.
- \`backend/pylock.toml\`, por su carácter experimental y local.
- Datos de la aplicación, respaldos, logs, temporales y secretos.

\`frontend/package-lock.json\` sí debe revisarse y versionarse. Antes de incluirlo en un commit, verificar que corresponde al \`package.json\` vigente y que no contiene información local.

## 6. Revisión y sincronización con Git

Antes de sincronizar cambios o preparar un commit:

\`\`\`powershell
git status --short
git diff
\`\`\`

Para actualizar una copia local existente:

\`\`\`powershell
git pull origin main
\`\`\`

Para obtener una primera copia:

\`\`\`powershell
git clone https://github.com/ingjazar-jpg/Planificacion_Viajes.git
cd Planificacion_Viajes
\`\`\`

No ejecutar ambos flujos sobre la misma carpeta. Antes de actualizar una copia que contenga trabajo local, revisar su estado y preservar los cambios no confirmados. No incluir automáticamente todos los archivos nuevos o modificados.

## 7. Estado de validación y readiness

| Área | Resultado |
|---|---|
| Runtime Python 3.14.10 | Verificado |
| Resolución de requirements backend | Correcta en modo dry-run |
| Lockfile Python | Generado y validado en entorno temporal |
| Integridad de dependencias backend | \`pip check\` correcto |
| Imports backend | Correctos |
| Runtime Node.js 26.13.1 y npm 11.20.0 | Verificados |
| Instalación y dependencias frontend | \`npm ci\` y \`npm ls\` correctos |
| Pruebas frontend | 3 aprobadas |
| Build frontend | Correcto, 28 módulos |

La preparación de runtimes y dependencias está validada. Esto no equivale a readiness funcional: la implementación del backend, la integración frontend/backend y las pruebas integrales siguen pendientes. La revisión formal de readiness debe completarse antes de iniciar los módulos funcionales.
