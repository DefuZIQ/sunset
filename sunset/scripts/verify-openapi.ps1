param(
    [string]$SpecPath = (Join-Path $PSScriptRoot '..\docs\openapi.json')
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$spec = Get-Content -LiteralPath $SpecPath -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable -Depth 100
if ($spec.openapi -ne '3.0.3' -or $spec.servers[0].url -ne '/api/v1') {
    throw 'OpenAPI version or versioned server URL is incorrect.'
}

$controllerSources = @{
    '/auth' = 'backend/auth-service/src/main/java/com/sunset/auth/controller/AuthController.java'
    '/products' = 'backend/product-service/src/main/java/com/sunset/product/controller/ProductController.java'
    '/order' = 'backend/order-service/src/main/java/com/sunset/product/controller/OrderController.java'
}
$publicRoutes = @(
    'POST /auth/register', 'POST /auth/login',
    'GET /products/all', 'POST /products/by-uuid',
    'GET /products/categories/tree', 'GET /order/promotions'
)
$operationIds = [System.Collections.Generic.HashSet[string]]::new()
$count = 0

foreach ($routePath in $spec.paths.Keys) {
    $prefix = @($controllerSources.Keys | Where-Object { $routePath -eq $_ -or $routePath.StartsWith("$_/") } |
        Sort-Object Length -Descending | Select-Object -First 1)[0]
    if (-not $prefix) { throw "No controller source for $routePath" }
    $source = Get-Content -LiteralPath (Join-Path $projectRoot $controllerSources[$prefix]) -Raw -Encoding utf8
    if (-not $source.Contains("@RequestMapping(`"$prefix`")")) { throw "Controller base path missing: $routePath" }
    $suffix = $routePath.Substring($prefix.Length)

    foreach ($method in @('get', 'post', 'put', 'patch', 'delete')) {
        if (-not $spec.paths[$routePath].Contains($method)) { continue }
        $operation = $spec.paths[$routePath][$method]
        if (-not $operation.operationId -or -not $operationIds.Add($operation.operationId)) {
            throw "Missing or duplicate operationId: $method $routePath"
        }
        if (-not $operation.responses -or -not (@($operation.responses.Keys | Where-Object { $_ -match '^2\d\d$' }).Count)) {
            throw "Success response missing: $method $routePath"
        }
        $annotation = '@' + $method.Substring(0,1).ToUpper() + $method.Substring(1) + 'Mapping'
        if ($suffix) {
            if (-not $source.Contains("$annotation(`"$suffix`")")) { throw "Controller mapping missing: $method $routePath" }
        } elseif ($source -notmatch [regex]::Escape($annotation) + '(?!\s*\()') {
            throw "Controller root mapping missing: $method $routePath"
        }
        $key = "$($method.ToUpper()) $routePath"
        if ($key -in $publicRoutes) {
            if ($operation.security) { throw "Public operation marked protected: $key" }
        } elseif (-not $operation.security -or -not $operation.security[0].Contains('bearerAuth')) {
            throw "Protected operation lacks Bearer security: $key"
        }
        if ($routePath -match '\{id\}' -and
            -not (@($spec.paths[$routePath].parameters | Where-Object { $_['$ref'] -eq '#/components/parameters/OrderId' }).Count)) {
            throw "Missing path parameter: $key"
        }
        $count++
    }
}

function Assert-References($value) {
    if ($value -is [System.Collections.IDictionary]) {
        foreach ($key in $value.Keys) {
            if ($key -eq '$ref') {
                if ($value[$key] -notmatch '^#/components/(schemas|parameters|responses)/[^/]+$') {
                    throw "Unsupported reference: $($value[$key])"
                }
                $parts = $value[$key].Split('/')
                if (-not $spec.components[$parts[2]].Contains($parts[3])) {
                    throw "Unresolved reference: $($value[$key])"
                }
            } else { Assert-References $value[$key] }
        }
    } elseif ($value -is [array]) {
        foreach ($item in $value) { Assert-References $item }
    }
}
Assert-References $spec
if ($count -lt 15) { throw "Too few documented operations: $count" }
Write-Host "PASS OpenAPI: $count operations, unique IDs, controller mappings, access rules and references"
