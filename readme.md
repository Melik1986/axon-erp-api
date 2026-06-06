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
npm run verify:cdm
```

## Work Zone (CDM path — repo = cloud)

Source of truth: `app/warehouse-ops-content/app-content/cdm.json` — **businessapp** with 4 `StaticAppLauncher` visualizations (`inboundId` = manifest inbound keys), 1 catalog, 4 groups (1 viz each), 1 role.  
Deployed by MTA module `axon-warehouse-ops-content` → CDM endpoint `.../applications/cdm/axon.warehouse.ops`.

**Invalid paths (do not use):**

- Bookmark 4 intent URLs — not 4 Home groups.
- Manual **Create → Group** in Content Manager — app without `vizId` → every tile opens default route (`Products`), same records everywhere.

**CLI deploy chain:**

```bash
npm run deploy:cf          # publishes app + cdm.json to HTML5 repo
npm run verify:cdm         # local cdm.json == cloud endpoint (10 entities incl. businessapp)
npm run workzone:post-deploy   # btp assign ~cdm_Warehouse_Ops_Access when RC exists
```

Content provider settings (one-time tenant config, documented in repo):  
`app/workzone/content-provider.settings.json`

| Setting | Value |
| --- | --- |
| Design-time destination | `axon-warehouse-cdm` |
| Runtime destination | `axon-workzone-runtime` |
| Automatic addition of all content items | **ON** |
| Provision authorizations via IPS | **OFF** (required for `~cdm_*` RC on trial) |
| Include group/catalog assignments to roles | **OFF** (all 4 CDM groups from provider) |

After provider **Fetch updated content**, BTP must show role collection `~cdm_Warehouse_Ops_Access`.  
Remove any **local** group on site `warehouse-ops` and do not duplicate the app via **HTML5 Apps** channel.

Site: `https://590c8b3dtrial.launchpad.cfapps.us10.hana.ondemand.com/site?siteId=b4c96273-a66c-47ab-be1b-f3ffa818d1f9`
