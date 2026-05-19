# Plan §4.3 — OData counts after deploy (local or CF).
param(
  [string]$BaseUrl = 'http://localhost:4004/odata/v4/warehouse',
  [string]$CfBaseUrl = 'https://axon-odata-api.cfapps.us10-001.hana.ondemand.com/odata/v4/warehouse',
  [switch]$UseCf,
  [string]$Token
)
$ErrorActionPreference = 'Stop'
$base = if ($UseCf) { $CfBaseUrl } else { $BaseUrl }
$headers = @{ Accept = 'application/json' }
if ($Token) {
  $headers.Authorization = "Bearer $Token"
} elseif (-not $UseCf) {
  $basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('admin:admin'))
  $headers.Authorization = "Basic $basic"
}
$expected = [ordered]@{
  Products = 6
  StockLevels = 6
  Suppliers = 4
  Invoices = 4
  InvoiceItems = 4
  PurchaseOrders = 3
  A_BusinessPartner = 5
  A_BusinessPartnerAddress = 5
  A_BusinessPartnerRole = 5
}
$fail = $false
foreach ($name in $expected.Keys) {
  $uri = "$base/$name"
  try {
    $r = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    $n = @($r.value).Count
    if ($n -ne $expected[$name]) {
      Write-Host "FAIL $name : $n (expected $($expected[$name]))"
      $fail = $true
    } else {
      Write-Host "OK   $name : $n"
    }
  } catch {
    Write-Host "ERR  $name : $($_.Exception.Message)"
    $fail = $true
  }
}
if ($fail) { exit 1 }
