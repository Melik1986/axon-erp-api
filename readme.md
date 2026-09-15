# Axon ERP API

CAP OData API stand for the Vstah AI / SAP Business One warehouse demo.

The primary demo surface models a German industrial automation distributor:

- SAP Business One-compatible session login at `/b1s/v2/Login`;
- three warehouses, two business partners, and three tracked items;
- goods receipt with serial and batch numbers;
- stock lookup and transfer between warehouses;
- customer sales order creation from a mobile voice command.

The original Axon-compatible `WarehouseService` remains available under
`/odata/v4/warehouse/` for the existing mobile connector and Fiori sample.

## OData Root

Local:

```text
http://localhost:4004/odata/v4/warehouse/
```

Cloud Foundry:

```text
https://axon-odata-api.cfapps.us10-001.hana.ondemand.com/odata/v4/warehouse/
```

## SAP Business One Service Layer Demo

The mock exposes the Service Layer-compatible prefix requested by the TЗ. In
local development the same CAP service is also available at
`/odata/v4/b1s/v2/`; the `/b1s/v2/` alias is the mobile/API entry point.

```text
http://localhost:4004/b1s/v2/Login
http://localhost:4004/b1s/v2/Warehouses
http://localhost:4004/b1s/v2/BusinessPartners
http://localhost:4004/b1s/v2/Items
http://localhost:4004/b1s/v2/ItemWarehouseInfoCollection
```

Login and preserve both returned cookies:

```bash
curl -i -c cookies.txt \\
  -H 'Content-Type: application/json' \\
  -d '{"CompanyDB":"SBODEMODE","UserName":"vstah_agent","Password":"demo-password"}' \\
  http://localhost:4004/b1s/v2/Login
```

The password defaults to `demo-password` for the local mock and can be
overridden with `SAP_B1_AGENT_PASSWORD`.

### TЗ smoke scenario

Use the cookies from Login for the following requests:

```bash
curl -s -b cookies.txt \\
  "http://localhost:4004/b1s/v2/ItemWarehouseInfoCollection?\$filter=ItemCode%20eq%20'IND-SNS-010'%20and%20WarehouseCode%20eq%20'01'"

curl -s -b cookies.txt -X POST \\
  -H 'Content-Type: application/json' \\
  -d @examples/purchase-delivery-note.json \\
  http://localhost:4004/b1s/v2/PurchaseDeliveryNotes

curl -s -b cookies.txt -X POST \\
  -H 'Content-Type: application/json' \\
  -d @examples/stock-transfer.json \\
  http://localhost:4004/b1s/v2/StockTransfers

curl -s -b cookies.txt -X POST \\
  -H 'Content-Type: application/json' \\
  -d @examples/sales-order.json \\
  http://localhost:4004/b1s/v2/Orders
```

The seeded scenario uses `V10001`, `C20001`, `IND-DRV-001`,
`IND-SNS-010`, `IND-CBL-050`, and warehouses `01`, `02`, `03`. The first
created documents are deterministic for a fresh database: receipt `402`,
transfer `87`, and order `712` with total `1260.00 EUR`.

## Demo URLs

```text
/index.html
/fiori.html
/odata/v4/warehouse/$metadata
/odata/v4/warehouse/Products
/odata/v4/warehouse/StockLevels?$filter=contains(Name,'Arabica')
/odata/v4/warehouse/Invoices?$expand=Items,supplier
/odata/v4/warehouse/A_BusinessPartner('1000001')/to_BusinessPartnerAddress
```

## Local Check

```bash
npm ci
npm run build
npm start
```

In another terminal, smoke-check OData (local):

```bash
curl -s "http://localhost:4004/odata/v4/warehouse/Products?\$top=1" | head
curl -s "http://localhost:4004/odata/v4/warehouse/StockLevels?\$filter=contains(Name,'Arabica')"
```

Example invoice payload shape for Axon `create_invoice`:

```json
{
  "CustomerName": "ABC GmbH",
  "Comment": "Axon photo invoice smoke test",
  "Items": [
    {
      "ProductName": "AX-2025-01 Arabica Premium 1kg",
      "Quantity": 154,
      "Price": 25
    }
  ]
}
```

## Axon Tool Compatibility

| Axon tool                | CAP entity                                    | Demo proof                              |
| ------------------------ | --------------------------------------------- | --------------------------------------- |
| `get_stock`              | `StockLevels`                                 | `Arabica Premium 1kg -> 420 kg`         |
| `get_products`           | `Products`                                    | coffee catalog with SKU/price/stock     |
| `create_invoice`         | `Invoices` + `InvoiceItems`                   | deep insert payload from photo invoice  |
| `get_partner_addresses`  | `A_BusinessPartner/to_BusinessPartnerAddress` | BP `1000001` address navigation         |
| `update_partner_address` | `A_BusinessPartnerAddress`                    | PATCH by `BusinessPartner`, `AddressID` |
| `assign_partner_role`    | `A_BusinessPartnerRole`                       | POST role `FLVN01` to partner `1000003` |

## Deploy

The expected BAS / CF flow:

```bash
cf target -o 590c8b3dtrial_590c8b3dtrial -s dev
npm ci
npm run build
mbt build
cf deploy mta_archives/axon-odata-api_1.0.0.mtar -f
```

After deploy:

```bash
curl -s "https://590c8b3dtrial-590c8b3dtrial-dev-axon-odata-api.cfapps.us10-001.hana.ondemand.com/health"
npm run workzone:verify
```

## Work Zone (app-only — no cdm.json)

Layout via Content Manager (Everyone + manual app assignment). No `cdm.json` — avoids HTML5 channel parser/cache stuck on 20/05/2026.

| Module                       | Target            | Payload                  |
| ---------------------------- | ----------------- | ------------------------ |
| `axon-warehouse-ops-content` | `axon-html5-host` | `warehouse-ops.zip` only |

Bump `manifest.json` `applicationVersion` on each content deploy (currently **1.0.27**).

**Naming:** Cockpit shows Application Name `axonwarehouseops` (dots stripped from `sap.app.id`) and Business Solution `axon.warehouse.ops` (`sap.cloud.service`) — this is normal, not duplicate IDs.

| Destination                           | Role                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `axon-warehouse-ops-html5-repository` | DT — **only** subaccount dest with `sap.cloud.service=axon.warehouse.ops` |
| `axon-warehouse-ops-html5-runtime`    | RT — technical; must **not** use `axon.warehouse.ops` as cloud service    |
| `axon-warehouse-ops-auth`             | OData backend for xs-app — **no** `sap.cloud.service`                     |

```bash
npm run deploy:content:cf   # HTML5 zip only
npm run workzone:verify && npm run workzone:verify-cloud
```

Cockpit: HTML5 Apps → Fetch → Content Explorer → add `axon.warehouse.ops` → Everyone.

Site: `https://590c8b3dtrial.launchpad.cfapps.us10.hana.ondemand.com/site?siteId=b4c96273-a66c-47ab-be1b-f3ffa818d1f9`
