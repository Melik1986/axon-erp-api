# Axon ERP API

Локальный **SAP CAP** стенд для демо **Vstah AI** (голос → существующие SAP tools → OData).

Не ставит SAP Business One + MSSQL. Wire-format = EntitySet адаптера Vstah (`Products`, `StockLevels`, `Invoices`, `PurchaseOrders`, `A_BusinessPartner*`), не B1 Service Layer `Login` / `PurchaseDeliveryNotes`.

## OData roots

| Профиль | Path | Назначение |
| --- | --- | --- |
| **BusinessOneService** (канон демо B1) | `/odata/v4/b1s/v2/` | `odataServiceRoot` для Vstah |
| WarehouseService | `/odata/v4/warehouse/` | Fiori UI + тот же tool-контракт |

Alias `/b1s/v2/*` → `/odata/v4/b1s/v2/*`.  
`POST …/StockLevels/adjust` переписывается на service action `adjust`.

## Auth для Vstah

- **Basic**: `vstah_agent` / `demo-password` (override: `SAP_B1_AGENT_PASSWORD`)
- **Bearer** / mocked CAP users — по `cds.requires.auth`
- CSRF: `HEAD`/`X-CSRF-Token: Fetch` на корне не ломает POST (CAP-tolerant)

`POST /b1s/v2/Login` + `CompanyDB` — опциональный фасад для интеграторов, **не** вход Vstah.

## Cloudflare Tunnel → Vstah

```bash
npm ci
npm start
# другой терминал:
cloudflared tunnel --url http://localhost:4004
```

В Vstah:

```text
odataServiceRoot = https://<tunnel>/odata/v4/b1s/v2/
username         = vstah_agent
password         = demo-password
```

## Сценарии (§7 ТЗ)

| Голос | Tool | Ожидание |
| --- | --- | --- |
| Приёмка Siemens → склад 01 | `create_purchase_order` | PO + stock bump; serial/batch в CAP |
| Остаток / QS | `get_stock` + `update_stock` | `Reason: "01->02"` |
| Заказ Duisburger | `create_invoice` | **1260 EUR** |

Документы после голоса видны в Fiori Launchpad (канон для демо):

```text
http://localhost:4004/router/resources/fiori.html#Shell-home
http://localhost:4004/router/resources/fiori.html#WarehouseOps-display
```

`/warehouse-ops/webapp/index.html` → редирект на Launchpad (standalone FE без FLP не используем).

## Master data

Warehouses `01`/`02`/`03`, BP `V10001` Siemens / `C20001` Duisburger, SKU `IND-DRV-001`, `IND-SNS-010`, `IND-CBL-050`.

## Local

```bash
npm ci
npm test
npm run build
npm start
```

```bash
curl -u vstah_agent:demo-password \
  "http://localhost:4004/odata/v4/b1s/v2/\$metadata"
```

## HANA Cloud

Оба сервиса в одном MTA (`cds build --production`). Production: `db.kind: hana`, XSUAA. Контракт EntitySet не меняется.

См. `cursor/docs/ТЗ.md`.
