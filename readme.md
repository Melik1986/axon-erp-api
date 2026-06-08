# Axon ERP API

CAP warehouse OData demo for the Axon SAP connector.

The service is designed for investor demos:

- Axon mobile asks by voice: "How much Arabica is in stock?"
- Axon reads `StockLevels` through SAP OData and returns `420 kg`.
- Axon mobile creates an invoice from a photo payload through `POST /Invoices`.
- Browser demo shows the resulting records in SAP Fiori-style UI.

## OData Root

Local:

```text
http://localhost:4004/odata/v4/warehouse/
```

Cloud Foundry:

```text
https://axon-odata-api.cfapps.us10-001.hana.ondemand.com/odata/v4/warehouse/
```

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

| Module | Target | Payload |
| --- | --- | --- |
| `axon-warehouse-ops-content` | `axon-html5-host` | `warehouse-ops.zip` only |

Bump `manifest.json` `applicationVersion` on each content deploy (currently **1.0.27**).

**Naming:** Cockpit shows Application Name `axonwarehouseops` (dots stripped from `sap.app.id`) and Business Solution `axon.warehouse.ops` (`sap.cloud.service`) — this is normal, not duplicate IDs.

| Destination | Role |
| --- | --- |
| `axon-warehouse-ops-html5-repository` | DT — **only** subaccount dest with `sap.cloud.service=axon.warehouse.ops` |
| `axon-warehouse-ops-html5-runtime` | RT — technical; must **not** use `axon.warehouse.ops` as cloud service |
| `axon-warehouse-ops-auth` | OData backend for xs-app — **no** `sap.cloud.service` |

```bash
npm run deploy:content:cf   # HTML5 zip only
npm run workzone:verify && npm run workzone:verify-cloud
```

Cockpit: HTML5 Apps → Fetch → Content Explorer → add `axon.warehouse.ops` → Everyone.

Site: `https://590c8b3dtrial.launchpad.cfapps.us10.hana.ondemand.com/site?siteId=b4c96273-a66c-47ab-be1b-f3ffa818d1f9`
