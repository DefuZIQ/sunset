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
    '/auth/mfa' = 'backend/auth-service/src/main/java/com/sunset/auth/controller/MfaController.java'
    '/auth/iam' = 'backend/auth-service/src/main/java/com/sunset/auth/controller/IamController.java'
    '/auth/addresses' = 'backend/auth-service/src/main/java/com/sunset/auth/controller/CustomerAddressController.java'
    '/products' = 'backend/product-service/src/main/java/com/sunset/product/controller/ProductController.java'
    '/order' = 'backend/order-service/src/main/java/com/sunset/product/controller/OrderController.java'
    '/order/stores' = 'backend/order-service/src/main/java/com/sunset/product/controller/StoreController.java'
    '/notifications' = 'backend/notification-service/src/main/java/com/sunset/notification/NotificationController.java'
    '/subscriptions' = 'backend/notification-service/src/main/java/com/sunset/notification/NewsletterController.java'
}
$publicRoutes = @(
    'POST /auth/register', 'POST /auth/login', 'POST /auth/staff/login',
    'POST /auth/mfa/login', 'POST /auth/mfa/setup/start', 'POST /auth/mfa/setup/confirm',
    'GET /products/all', 'GET /products/search', 'GET /products/all/availability', 'POST /products/by-uuid',
    'GET /products/categories/tree', 'GET /products/reviews/{id}', 'GET /products/reviews/{id}/comments', 'GET /products/review-photos/{id}',
    'GET /order/promotions', 'GET /order/stores', 'POST /subscriptions'
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
        } elseif (-not $operation.security -or -not (@($operation.security | Where-Object {
            $_.Contains('bearerAuth') -or $_.Contains('adminCookie')
        }).Count)) {
            throw "Protected operation lacks Bearer or admin-cookie security: $key"
        }
        if ($routePath -match '\{id\}' -and
            -not (@($spec.paths[$routePath].parameters | Where-Object {
                $_['$ref'] -in @('#/components/parameters/OrderId', '#/components/parameters/ResourceId')
            }).Count)) {
            throw "Missing path parameter: $key"
        }
        $count++
    }
}

function Assert-References($value) {
    if ($value -is [System.Collections.IDictionary]) {
        if ($value.Contains('required') -and $value.Contains('properties')) {
            foreach ($requiredField in $value.required) {
                if (-not $value.properties.Contains($requiredField)) {
                    throw "Required field is not declared in properties: $requiredField"
                }
            }
        }
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
if ($count -lt 41) { throw "Too few documented operations: $count" }
Write-Host "PASS OpenAPI: $count operations, unique IDs, controller mappings, access rules and references"
