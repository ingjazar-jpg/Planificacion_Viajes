[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

function Get-CheckedOutput {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $output = & $Executable @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "El comando '$Executable $($Arguments -join ' ')' terminó con código $exitCode. $($output | Out-String)"
    }
    return ($output | Out-String).Trim()
}

function Assert-FileExists {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "No se encontró el archivo requerido: $Path"
    }
}

Write-Host "== Validación del entorno local ==" -ForegroundColor Cyan
foreach ($commandName in @("py", "node", "npm")) {
    if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
        throw "No se encontró '$commandName' en PATH."
    }
}

$expectedPython = (Get-Content ".python-version" -Raw).Trim()
$expectedNode = (Get-Content ".nvmrc" -Raw).Trim()
$expectedNpm = (Get-Content ".npm-version" -Raw).Trim()

$pythonOutput = Get-CheckedOutput -Executable "py" -Arguments @("-3.14", "--version")
if ($pythonOutput -notmatch "^Python\s+(.+)$") {
    throw "No se pudo interpretar la versión de Python: $pythonOutput"
}
$actualPython = $Matches[1]

$nodeOutput = Get-CheckedOutput -Executable "node" -Arguments @("--version")
$actualNode = $nodeOutput.TrimStart("v")

$npmOutput = Get-CheckedOutput -Executable "npm" -Arguments @("--version")
$actualNpm = $npmOutput.Trim()

if ($actualPython -ne $expectedPython) {
    throw "Python incorrecto. Esperado: $expectedPython; encontrado mediante 'py -3.14': $actualPython."
}
if ($actualNode -ne $expectedNode) {
    throw "Node.js incorrecto. Esperado: $expectedNode; encontrado: $actualNode."
}
if ($actualNpm -ne $expectedNpm) {
    throw "npm incorrecto. Esperado: $expectedNpm; encontrado: $actualNpm."
}

Write-Host "Python $actualPython — OK" -ForegroundColor Green
Write-Host "Node.js $actualNode — OK" -ForegroundColor Green
Write-Host "npm $actualNpm — OK" -ForegroundColor Green

Write-Host "== Validación de archivos del proyecto ==" -ForegroundColor Cyan
$requiredFiles = @(
    "backend/requirements.txt",
    "backend/requirements-dev.txt",
    "frontend/package.json"
)
foreach ($path in $requiredFiles) {
    Assert-FileExists -Path $path
    Write-Host "$path — OK" -ForegroundColor Green
}

$packageJson = Get-Content "frontend/package.json" -Raw | ConvertFrom-Json
$packageLockPath = "frontend/package-lock.json"
if (Test-Path -LiteralPath $packageLockPath -PathType Leaf) {
    $packageLock = Get-Content $packageLockPath -Raw | ConvertFrom-Json
    if ($packageLock.name -ne $packageJson.name -or $packageLock.version -ne $packageJson.version) {
        throw "frontend/package-lock.json no coincide con el nombre o versión de frontend/package.json."
    }
    if ($packageLock.lockfileVersion -ne 3) {
        throw "Se esperaba lockfileVersion 3 en frontend/package-lock.json."
    }
    Write-Host "frontend/package-lock.json — estructura y metadatos OK" -ForegroundColor Green
}
else {
    Write-Warning "No existe frontend/package-lock.json. Debe generarse explícitamente y revisarse antes de versionarlo."
}

$pylockPath = "backend/pylock.toml"
if (Test-Path -LiteralPath $pylockPath -PathType Leaf) {
    $tomlCheck = @'
import pathlib
import tomllib

path = pathlib.Path("backend/pylock.toml")
with path.open("rb") as file:
    lock = tomllib.load(file)

if "lock-version" not in lock or not isinstance(lock.get("packages"), list):
    raise SystemExit("pylock.toml no contiene la estructura esperada.")
print(f"pylock.toml válido: lock-version={lock['lock-version']}, paquetes={len(lock['packages'])}")
'@
    $tomlOutput = Get-CheckedOutput -Executable "py" -Arguments @("-3.14", "-c", $tomlCheck)
    Write-Host $tomlOutput -ForegroundColor Green
}
else {
    Write-Host "backend/pylock.toml no está presente; es un artefacto local opcional." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "VALIDACIÓN COMPLETADA." -ForegroundColor Green
Write-Host "Este script solo comprueba runtimes y archivos; no instala, actualiza ni genera dependencias."
Write-Host "No crea ni modifica entornos virtuales, lockfiles ni archivos del proyecto."
Write-Host "El nombre histórico del script se conserva para no cambiar su ruta de invocación."
Write-Host "Para revisar cambios locales, ejecuta: git status --short"
