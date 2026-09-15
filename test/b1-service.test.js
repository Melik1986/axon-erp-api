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
  user = new cds.User({ id: "admin", roles: ["authenticated-user"] });
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

test("Login validates the SAP B1 demo user and creates both session cookies", () => {
  assert.equal(
    isValidB1Credentials({
      CompanyDB: "SBODEMODE",
      UserName: "vstah_agent",
      Password: "demo-password",
    }),
    true,
  );
  assert.equal(
    isValidB1Credentials({
      CompanyDB: "SBODEMODE",
      UserName: "vstah_agent",
      Password: "wrong",
    }),
    false,
  );

  const sessionId = createB1Session("vstah_agent");
  assert.deepEqual(getB1Session(sessionId), {
    id: "vstah_agent",
    roles: ["authenticated-user"],
  });
  assert.deepEqual(buildB1CookieHeaders(sessionId), [
    `B1SESSION=${sessionId}; Path=/; HttpOnly; SameSite=Lax`,
    "ROUTEID=.node0; Path=/; HttpOnly; SameSite=Lax",
  ]);
});

test("exposes the TЗ master data for warehouses, partners, and items", async () => {
  const warehouses = await tx().read("Warehouses");
  const partners = await tx().read("BusinessPartners");
  const items = await tx().read("Items");

  assert.equal(warehouses.length, 3);
  assert.deepEqual(
    warehouses.map(({ WarehouseCode, WarehouseName }) => ({
      WarehouseCode,
      WarehouseName,
    })),
    [
      { WarehouseCode: "01", WarehouseName: "Zentrallager" },
      { WarehouseCode: "02", WarehouseName: "QS-Prüflager" },
      { WarehouseCode: "03", WarehouseName: "Warenausgang" },
    ],
  );
  assert.deepEqual(
    partners.map(({ CardCode, CardType }) => ({ CardCode, CardType })),
    [
      { CardCode: "V10001", CardType: "S" },
      { CardCode: "C20001", CardType: "C" },
    ],
  );
  assert.deepEqual(
    items.map(({ ItemCode, ManageSerialNumbers, ManageBatchNumbers }) => ({
      ItemCode,
      ManageSerialNumbers,
      ManageBatchNumbers,
    })),
    [
      {
        ItemCode: "IND-DRV-001",
        ManageSerialNumbers: true,
        ManageBatchNumbers: false,
      },
      {
        ItemCode: "IND-SNS-010",
        ManageSerialNumbers: false,
        ManageBatchNumbers: true,
      },
      {
        ItemCode: "IND-CBL-050",
        ManageSerialNumbers: false,
        ManageBatchNumbers: false,
      },
    ],
  );
});

test("creates a goods receipt with serial and batch tracking", async () => {
  const receipt = await tx()
    .create("PurchaseDeliveryNotes")
    .entries({
      CardCode: "V10001",
      DocDate: "2026-09-15",
      DocumentLines: [
        {
          ItemCode: "IND-DRV-001",
          Quantity: 1,
          WarehouseCode: "01",
          SerialNumbers: [{ InternalSerialNumber: "SN-2026-X1" }],
        },
        {
          ItemCode: "IND-SNS-010",
          Quantity: 5,
          WarehouseCode: "01",
          BatchNumbers: [{ BatchNumber: "BATCH-88", Quantity: 5 }],
        },
      ],
    });

  assert.equal(receipt.DocEntry, 402);
  assert.equal(receipt.CardCode, "V10001");
  assert.equal(receipt.DocumentLines.length, 2);
  assert.equal(
    receipt.DocumentLines[0].SerialNumbers[0].InternalSerialNumber,
    "SN-2026-X1",
  );
  assert.equal(
    receipt.DocumentLines[1].BatchNumbers[0].BatchNumber,
    "BATCH-88",
  );
});

test("reads stock, transfers a batch, and creates a sales order", async () => {
  const stockBefore = await tx()
    .read("ItemWarehouseInfoCollection")
    .where({ ItemCode: "IND-SNS-010", WarehouseCode: "01" });
  assert.equal(Number(stockBefore[0].InStock), 15);

  const transfer = await tx()
    .create("StockTransfers")
    .entries({
      FromWarehouse: "01",
      ToWarehouse: "02",
      StockTransferLines: [
        {
          ItemCode: "IND-SNS-010",
          Quantity: 3,
          BatchNumbers: [{ BatchNumber: "BATCH-88", Quantity: 3 }],
        },
      ],
    });
  assert.equal(transfer.DocEntry, 87);

  const stockAfter = await tx()
    .read("ItemWarehouseInfoCollection")
    .where({ ItemCode: "IND-SNS-010", WarehouseCode: "01" });
  assert.equal(Number(stockAfter[0].InStock), 12);

  const order = await tx()
    .create("Orders")
    .entries({
      CardCode: "C20001",
      DocDueDate: "2026-09-16",
      DocumentLines: [
        { ItemCode: "IND-DRV-001", Quantity: 1, WarehouseCode: "01" },
        { ItemCode: "IND-CBL-050", Quantity: 2, WarehouseCode: "01" },
      ],
    });
  assert.equal(order.DocEntry, 712);
  assert.equal(Number(order.DocTotal), 1260);
});

test("rejects tracked goods receipts with invalid serial or batch data", async () => {
  await assert.rejects(
    async () =>
      tx()
        .create("PurchaseDeliveryNotes")
        .entries({
          CardCode: "V10001",
          DocumentLines: [
            {
              ItemCode: "IND-DRV-001",
              Quantity: 1,
              WarehouseCode: "01",
            },
          ],
        }),
    (error) => error.message.includes("requires one serial number"),
  );

  await assert.rejects(
    async () =>
      tx()
        .create("PurchaseDeliveryNotes")
        .entries({
          CardCode: "V10001",
          DocumentLines: [
            {
              ItemCode: "IND-SNS-010",
              Quantity: 5,
              WarehouseCode: "01",
              BatchNumbers: [{ BatchNumber: "BATCH-88", Quantity: 4 }],
            },
          ],
        }),
    (error) => error.message.includes("batch quantities matching"),
  );
});

test("rejects a stock transfer that exceeds the source balance", async () => {
  await assert.rejects(
    async () =>
      tx()
        .create("StockTransfers")
        .entries({
          FromWarehouse: "01",
          ToWarehouse: "02",
          StockTransferLines: [
            {
              ItemCode: "IND-SNS-010",
              Quantity: 16,
              BatchNumbers: [{ BatchNumber: "BATCH-88", Quantity: 16 }],
            },
          ],
        }),
    (error) => error.message.includes("Insufficient stock"),
  );
});
