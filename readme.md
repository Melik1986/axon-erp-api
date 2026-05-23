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

In another terminal:

```bash
npm run verify:seed
npm run verify:seed -- --write
```

`--write` creates a smoke-test invoice with the same shape Axon sends:

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

Then verify:

```bash
npm run verify:cf
```

If the CF route is protected by XSUAA and no browser session is available, pass a bearer token:

```bash
node scripts/verify-seed.mjs \
  --base-url https://axon-odata-api.cfapps.us10-001.hana.ondemand.com/odata/v4/warehouse \
  --token "$SAP_BEARER_TOKEN"
```
