[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$ArgumentList
    )
    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "El comando '$FilePath $($ArgumentList -join ' ')' terminó con código $LASTEXITCODE."
    }
}

function Get-RequiredVersion {
    param([string]$FilePath, [string[]]$ArgumentList, [string]$Pattern)
    $output = (& $FilePath @ArgumentList 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $output -notmatch $Pattern) {
        throw "No se pudo obtener la versión de $FilePath. Salida: $output"
    }
    return $Matches[1]
}

Write-Host "== Validando runtimes fijados ==" -ForegroundColor Cyan
foreach ($commandName in @("python", "node", "npm")) {
    if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
        throw "No se encontró '$commandName' en PATH. Instala las versiones indicadas en .python-version, .nvmrc y .npm-version."
    }
}

$expectedPython = (Get-Content ".python-version" -Raw).Trim()
$expectedNode = (Get-Content ".nvmrc" -Raw).Trim()
$expectedNpm = (Get-Content ".npm-version" -Raw).Trim()
$actualPython = Get-RequiredVersion -FilePath "python" -ArgumentList @("--version") -Pattern "^Python\s+(.+)$"
$actualNode = Get-RequiredVersion -FilePath "node" -ArgumentList @("--version") -Pattern "^v?(.+)$"
$actualNpm = Get-RequiredVersion -FilePath "npm" -ArgumentList @("--version") -Pattern "^(.+)$"

if ($actualPython -ne $expectedPython) { throw "Python incorrecto. Esperado: $expectedPython; instalado: $actualPython." }
if ($actualNode -ne $expectedNode) { throw "Node.js incorrecto. Esperado: $expectedNode; instalado: $actualNode." }
if ($actualNpm -ne $expectedNpm) { throw "npm incorrecto. Esperado: $expectedNpm; instalado: $actualNpm." }

Write-Host "Python $actualPython — OK" -ForegroundColor Green
Write-Host "Node.js $actualNode — OK" -ForegroundColor Green
Write-Host "npm $actualNpm — OK" -ForegroundColor Green

Write-Host "== Preparando entorno Python ==" -ForegroundColor Cyan
$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Invoke-Checked -FilePath "python" -ArgumentList @("-m", "venv", ".venv")
}
if (-not (Test-Path $venvPython)) { throw "No se pudo crear el entorno virtual .venv." }

Invoke-Checked -FilePath $venvPython -ArgumentList @("-m", "pip", "install", "--upgrade", "pip==26.3")
Invoke-Checked -FilePath $venvPython -ArgumentList @("-m", "pip", "lock", "-r", "backend/requirements-dev.txt", "-o", "backend/pylock.toml")
if (-not (Test-Path "backend/pylock.toml")) { throw "pip no generó backend/pylock.toml." }

Write-Host "== Validando instalación desde pylock.toml ==" -ForegroundColor Cyan
Invoke-Checked -FilePath $venvPython -ArgumentList @("-m", "pip", "install", "-r", "backend/pylock.toml")
Invoke-Checked -FilePath $venvPython -ArgumentList @("-m", "pip", "check")
$pythonSmoke = @'
from importlib.metadata import version
import fastapi, pydantic, uvicorn, pytest, pytest_cov, httpx
for package in ("fastapi", "pydantic", "uvicorn", "pytest", "pytest-cov", "httpx"):
    print(f"{package}=={version(package)}")
'@
Invoke-Checked -FilePath $venvPython -ArgumentList @("-c", $pythonSmoke)

Write-Host "== Generando e instalando lockfile frontend ==" -ForegroundColor Cyan
Push-Location (Join-Path $repoRoot "frontend")
try {
    Invoke-Checked -FilePath "npm" -ArgumentList @("install", "--package-lock-only", "--no-audit", "--no-fund")
    if (-not (Test-Path "package-lock.json")) { throw "npm no generó frontend/package-lock.json." }
    Invoke-Checked -FilePath "npm" -ArgumentList @("ci", "--no-audit", "--no-fund")
    Invoke-Checked -FilePath "npm" -ArgumentList @("ls", "--depth=0")
    $frontendSmoke = 'import React from "react"; import { createRoot } from "react-dom/client"; import { createServer } from "vite"; import { defineConfig } from "vitest/config"; import { JSDOM } from "jsdom"; import { render } from "@testing-library/react"; if (!React || !createRoot || !createServer || !defineConfig || !JSDOM || !render) process.exit(1); console.log("React, Vite, Vitest, jsdom y Testing Library: imports OK");'
    Invoke-Checked -FilePath "node" -ArgumentList @("--input-type=module", "-e", $frontendSmoke)
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "LOCKFILES GENERADOS Y VALIDACIÓN DE DEPENDENCIAS COMPLETADA." -ForegroundColor Green
Write-Host "Archivos nuevos esperados: backend/pylock.toml y frontend/package-lock.json"
Write-Host "El entorno .venv/ y frontend/node_modules/ permanecen locales y están excluidos de Git."
Write-Host "No se ejecutaron build ni pruebas funcionales: todavía no existen la aplicación ni los tests iniciales." -ForegroundColor Yellow
Write-Host "Revisa los cambios con: git status --short"
Write-Host "Después, sube únicamente los lockfiles y ajustes autorizados mediante un commit."