const assert = require("node:assert/strict");
const cds = require("@sap/cds");
const { after, before, beforeEach, test } = require("node:test");
const {
  buildB1CookieHeaders,
  createB1Session,
  getB1Session,
  isValidB1Credentials,
} = require("../srv/b1-session");

let businessOne;
let user;
let model;

before(async () => {
  model = await cds.load(["db", "srv"]);
  user = new cds.User({ id: "vstah_agent", roles: ["authenticated-user"] });
});

beforeEach(async () => {
  await cds.deploy(model).to("sqlite::memory:");
  businessOne = await cds.serve("BusinessOneService").from(model);
});

after(async () => {
  await cds.shutdown();
});

function tx() {
  return businessOne.tx({ user });
}

test("optional SL Login still issues B1SESSION cookies for integrators", () => {
  assert.equal(
    isValidB1Credentials({
      CompanyDB: "SBODEMODE",
      UserName: "vstah_agent",
      Password: "demo-password",
    }),
    true,
  );
  const sessionId = createB1Session("vstah_agent");
  assert.deepEqual(getB1Session(sessionId), {
    id: "vstah_agent",
    roles: ["authenticated-user"],
  });
  assert.equal(buildB1CookieHeaders(sessionId).length, 2);
});

test("exposes Vstah EntitySets with Mittelstand master data", async () => {
  const products = await tx().read("Products");
  const stocks = await tx().read("StockLevels");
  const partners = await tx().read("A_BusinessPartner");
  const warehouses = await tx().read("Warehouses");

  assert.equal(products.length, 3);
  assert.deepEqual(
    products.map((p) => p.Sku).sort(),
    ["IND-CBL-050", "IND-DRV-001", "IND-SNS-010"],
  );
  assert.equal(warehouses.length, 3);
  assert.ok(partners.some((p) => p.BusinessPartner === "V10001"));
  assert.ok(partners.some((p) => p.BusinessPartner === "C20001"));
  const sns = stocks.find(
    (s) => s.warehouseLocation === "01" && s.Name.includes("IND-SNS-010"),
  );
  assert.equal(Number(sns.Quantity), 15);
});

test("create_purchase_order receipt bumps stock on warehouse 01", async () => {
  const po = await tx()
    .create("PurchaseOrders")
    .entries({
      status: "OPEN",
      currency: "EUR",
      supplier_ID: "11111111-1111-1111-1111-111111111101",
      to_PurchaseOrderItem: [
        {
          Material: "IND-DRV-001",
          SupplierMaterialNumber: "IND-DRV-001",
          InternationalArticleNumber: "IND-DRV-001",
          OrderQuantity: 1,
          NetPriceAmount: 650,
          WarehouseCode: "01",
          SerialNumber: "SN-2026-X1",
        },
        {
          Material: "IND-SNS-010",
          SupplierMaterialNumber: "IND-SNS-010",
          InternationalArticleNumber: "IND-SNS-010",
          OrderQuantity: 5,
          NetPriceAmount: 42,
          WarehouseCode: "01",
          BatchNumber: "BATCH-88",
        },
      ],
    });

  assert.match(String(po.comment), /^PO-40/);
  const drv = await tx()
    .read("StockLevels")
    .where({ warehouseLocation: "01", Name: { like: "%IND-DRV-001%" } });
  assert.equal(Number(drv[0].Quantity), 1);
  const sns = await tx()
    .read("StockLevels")
    .where({ warehouseLocation: "01", Name: { like: "%IND-SNS-010%" } });
  assert.equal(Number(sns[0].Quantity), 20);
});

test("get_stock + update_stock transfer 01->02", async () => {
  const before = await tx()
    .read("StockLevels")
    .where({ warehouseLocation: "01", Name: { like: "%IND-SNS-010%" } });
  assert.equal(Number(before[0].Quantity), 15);

  await businessOne.tx({ user }).send({
    event: "adjust",
    data: {
      ProductName: "IND-SNS-010",
      Quantity: 3,
      Reason: "01->02",
    },
  });

  const after01 = await tx()
    .read("StockLevels")
    .where({ warehouseLocation: "01", Name: { like: "%IND-SNS-010%" } });
  const after02 = await tx()
    .read("StockLevels")
    .where({ warehouseLocation: "02", Name: { like: "%IND-SNS-010%" } });
  assert.equal(Number(after01[0].Quantity), 12);
  assert.equal(Number(after02[0].Quantity), 3);
});

test("create_invoice for Duisburger totals 1260 EUR", async () => {
  const invoice = await tx()
    .create("Invoices")
    .entries({
      CustomerName: "Duisburger Maschinenbau GmbH",
      Comment: "Urgent voice order",
      Items: [
        { ProductName: "Frequenzumrichter 7.5 kW IND-DRV-001", Quantity: 1, Price: 980 },
        { ProductName: "Steuerleitung 100m IND-CBL-050", Quantity: 2, Price: 140 },
      ],
    });
  assert.equal(Number(invoice.Total), 1260);
  assert.equal(invoice.CustomerName, "Duisburger Maschinenbau GmbH");
});

test("rejects stock transfer that exceeds balance", async () => {
  await assert.rejects(
    async () =>
      businessOne.tx({ user }).send({
        event: "adjust",
        data: {
          ProductName: "IND-SNS-010",
          Quantity: 16,
          Reason: "01->02",
        },
      }),
    (error) => /Insufficient stock/i.test(error.message),
  );
});
