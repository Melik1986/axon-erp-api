const assert = require("node:assert/strict");
const cds = require("@sap/cds");
const { after, before, beforeEach, test } = require("node:test");

let warehouse;
let user;
let model;

before(async () => {
  model = await cds.load(["db", "srv"]);
  user = new cds.User({ id: "vstah_agent", roles: ["authenticated-user"] });
});

beforeEach(async () => {
  await cds.deploy(model).to("sqlite::memory:");
  warehouse = await cds.serve("WarehouseService").from(model);
});

after(async () => {
  await cds.shutdown();
});

function tx() {
  return warehouse.tx({ user });
}

test("WarehouseService exposes Vstah EntitySets", async () => {
  const products = await tx().read("Products");
  const stocks = await tx().read("StockLevels");
  assert.equal(products.length, 3);
  assert.ok(stocks.some((s) => s.warehouseLocation === "01"));
});

test("warehouse create_purchase_order bumps stock", async () => {
  await tx()
    .create("PurchaseOrders")
    .entries({
      status: "OPEN",
      currency: "EUR",
      supplier_ID: "11111111-1111-1111-1111-111111111101",
      to_PurchaseOrderItem: [
        {
          Material: "IND-SNS-010",
          OrderQuantity: 2,
          NetPriceAmount: 42,
          WarehouseCode: "01",
          BatchNumber: "BATCH-88",
        },
      ],
    });
  const sns = await tx()
    .read("StockLevels")
    .where({ warehouseLocation: "01", Name: { like: "%IND-SNS-010%" } });
  assert.equal(Number(sns[0].Quantity), 17);
});

test("warehouse update_stock transfer 01->02", async () => {
  await warehouse.tx({ user }).send({
    event: "adjust",
    data: { ProductName: "IND-SNS-010", Quantity: 1, Reason: "01->02" },
  });
  const after01 = await tx()
    .read("StockLevels")
    .where({ warehouseLocation: "01", Name: { like: "%IND-SNS-010%" } });
  const after02 = await tx()
    .read("StockLevels")
    .where({ warehouseLocation: "02", Name: { like: "%IND-SNS-010%" } });
  assert.equal(Number(after01[0].Quantity), 14);
  assert.equal(Number(after02[0].Quantity), 1);
});

test("warehouse create_invoice Duisburger 1260 EUR", async () => {
  const invoice = await tx()
    .create("Invoices")
    .entries({
      CustomerName: "Duisburger Maschinenbau GmbH",
      Items: [
        { ProductName: "Frequenzumrichter 7.5 kW IND-DRV-001", Quantity: 1, Price: 980 },
        { ProductName: "Steuerleitung 100m IND-CBL-050", Quantity: 2, Price: 140 },
      ],
    });
  assert.equal(Number(invoice.Total), 1260);
});
