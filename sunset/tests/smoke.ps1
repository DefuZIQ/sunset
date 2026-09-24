param(
    [string]$BaseUrl = "http://192.168.1.186"
)

$ErrorActionPreference = "Stop"
$passed = 0
$failed = 0

function Invoke-Status {
    param([string]$Method, [string]$Path, [object]$Body = $null)
    try {
        $params = @{ Uri = "$BaseUrl$Path"; Method = $Method; UseBasicParsing = $true }
        if ($null -ne $Body) {
            $params.ContentType = "application/json"
            $params.Body = $Body | ConvertTo-Json -Depth 10
        }
        $response = Invoke-WebRequest @params
        $content = if ($response.Content -is [byte[]]) {
            [System.Text.Encoding]::UTF8.GetString($response.Content)
        } else {
            [string]$response.Content
        }
        return @{ Status = [int]$response.StatusCode; Content = $content }
    } catch {
        if ($_.Exception.Response) {
            return @{ Status = [int]$_.Exception.Response.StatusCode; Content = "" }
        }
        throw
    }
}

function Assert-Check {
    param([string]$Name, [bool]$Condition, [string]$Details)
    if ($Condition) {
        $script:passed++
        Write-Host "PASS  $Name"
    } else {
        $script:failed++
        Write-Host "FAIL  $Name - $Details" -ForegroundColor Red
    }
}

$homeResponse = Invoke-Status GET "/"
Assert-Check "Home page is available" ($homeResponse.Status -eq 200 -and $homeResponse.Content -match '<div id="root">') "HTTP $($homeResponse.Status)"

$health = Invoke-Status GET "/actuator/health"
Assert-Check "Gateway readiness is UP" ($health.Status -eq 200 -and $health.Content -match '"status"\s*:\s*"UP"') "HTTP $($health.Status)"

$catalog = Invoke-Status GET "/products/all"
$products = if ($catalog.Status -eq 200) { @($catalog.Content | ConvertFrom-Json) } else { @() }
Assert-Check "Catalog returns products" ($catalog.Status -eq 200 -and $products.Count -gt 0) "HTTP $($catalog.Status), products $($products.Count)"
Assert-Check "Catalog contains 100+ products" ($products.Count -ge 100) "products $($products.Count)"

$tree = Invoke-Status GET "/products/categories/tree"
$categories = if ($tree.Status -eq 200) { @($tree.Content | ConvertFrom-Json) } else { @() }
Assert-Check "Category tree is available" ($tree.Status -eq 200 -and $categories.Count -gt 0) "HTTP $($tree.Status)"

if ($products.Count -gt 0) {
    $product = Invoke-Status POST "/products/by-uuid" @{ id = $products[0].id }
    $productBody = if ($product.Status -eq 200) { $product.Content | ConvertFrom-Json } else { $null }
    Assert-Check "Product details open by UUID" ($product.Status -eq 200 -and $productBody.id -eq $products[0].id) "HTTP $($product.Status)"
}

$promotions = Invoke-Status GET "/order/promotions"
Assert-Check "Public promotions are available" ($promotions.Status -eq 200) "HTTP $($promotions.Status)"

$protected = Invoke-Status GET "/order/my"
Assert-Check "Protected API rejects anonymous requests" ($protected.Status -eq 401) "expected 401, got $($protected.Status)"

Write-Host "`nResult: $passed passed, $failed failed"
if ($failed -gt 0) { exit 1 }
