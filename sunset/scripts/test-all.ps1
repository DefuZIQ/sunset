param(
    [switch]$WithSmoke,
    [switch]$WithE2E,
    [string]$BaseUrl = "http://192.168.1.186"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$mavenRepository = Join-Path $env:USERPROFILE ".m2\repository"

Push-Location $root
try {
    & .\mvnw.cmd "-Dmaven.repo.local=$mavenRepository" test
    if ($LASTEXITCODE -ne 0) { throw "Backend tests failed" }

    Push-Location "frontend"
    try {
        & npm test
        if ($LASTEXITCODE -ne 0) { throw "Frontend tests failed" }
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
        if ($WithE2E) {
            & npm run test:e2e
            if ($LASTEXITCODE -ne 0) { throw "Frontend E2E tests failed" }
        }
    } finally {
        Pop-Location
    }

    if ($WithSmoke) {
        & "$root\tests\smoke.ps1" -BaseUrl $BaseUrl
        if ($LASTEXITCODE -ne 0) { throw "Smoke tests failed" }
    }
} finally {
    Pop-Location
}
