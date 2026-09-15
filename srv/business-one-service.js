const cds = require("@sap/cds");

const { SELECT, UPDATE } = cds.ql;

const RECEIPT_DOC_ENTRY_BASE = 401;
const TRANSFER_DOC_ENTRY_BASE = 86;
const ORDER_DOC_ENTRY_BASE = 711;

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function required(value, label, req) {
  if (value === undefined || value === null || value === "") {
    req.reject(400, `${label} is required`);
  }
  return value;
}

async function nextDocumentEntry(entity, base) {
  const rows = await SELECT.from(entity).columns("DocEntry");
  return Math.max(base, ...rows.map((row) => number(row.DocEntry))) + 1;
}

async function requirePartner(entity, cardCode, req) {
  const partner = await SELECT.one.from(entity).where({ CardCode: cardCode });
  if (!partner) {
    req.reject(400, `Business partner ${cardCode} was not found`);
  }
  return partner;
}

async function requireWarehouse(entity, warehouseCode, req) {
  const warehouse = await SELECT.one
    .from(entity)
    .where({ WarehouseCode: warehouseCode });
  if (!warehouse) {
    req.reject(400, `Warehouse ${warehouseCode} was not found`);
  }
  return warehouse;
}

async function requireItem(entity, itemCode, req) {
  const item = await SELECT.one.from(entity).where({ ItemCode: itemCode });
  if (!item) {
    req.reject(400, `Item ${itemCode} was not found`);
  }
  return item;
}

function validateTracking(item, line, req) {
  const quantity = number(line.Quantity);
  if (item.ManageSerialNumbers) {
    const serialNumbers = line.SerialNumbers || [];
    if (serialNumbers.length !== quantity) {
      req.reject(400, `${item.ItemCode} requires one serial number per unit`);
    }
  }
  if (item.ManageBatchNumbers) {
    const batchQuantity = (line.BatchNumbers || []).reduce(
      (total, batch) => total + number(batch.Quantity),
      0,
    );
    if (batchQuantity !== quantity) {
      req.reject(
        400,
        `${item.ItemCode} requires batch quantities matching the line quantity`,
      );
    }
  }
}

async function adjustStock(entity, itemCode, warehouseCode, delta, req) {
  const stock = await SELECT.one
    .from(entity)
    .where({ ItemCode: itemCode, WarehouseCode: warehouseCode });
  if (!stock) {
    req.reject(400, `Stock record ${itemCode}/${warehouseCode} was not found`);
  }
  const next = number(stock.InStock) + number(delta);
  if (next < 0) {
    req.reject(
      409,
      `Insufficient stock for ${itemCode} in warehouse ${warehouseCode}`,
    );
  }
  await UPDATE(entity)
    .set({ InStock: next })
    .where({ ItemCode: itemCode, WarehouseCode: warehouseCode });
}

function sumBatchQuantity(batches) {
  return (batches || []).reduce(
    (total, batch) => total + number(batch.Quantity),
    0,
  );
}

module.exports = cds.service.impl(function () {
  const {
    Warehouses,
    BusinessPartners,
    Items,
    ItemWarehouseInfoCollection,
    PurchaseDeliveryNotes,
    StockTransfers,
    Orders,
  } = this.entities;

  this.before("CREATE", PurchaseDeliveryNotes, async (req) => {
    required(req.data.CardCode, "CardCode", req);
    await requirePartner(BusinessPartners, req.data.CardCode, req);
    req.data.DocEntry ??= await nextDocumentEntry(
      PurchaseDeliveryNotes,
      RECEIPT_DOC_ENTRY_BASE,
    );
    req.data.DocDate ??= new Date().toISOString().slice(0, 10);

    for (const line of req.data.DocumentLines || []) {
      const item = await requireItem(
        Items,
        required(line.ItemCode, "ItemCode", req),
        req,
      );
      await requireWarehouse(
        Warehouses,
        required(line.WarehouseCode, "WarehouseCode", req),
        req,
      );
      validateTracking(item, line, req);
    }
  });

  this.on("CREATE", PurchaseDeliveryNotes, async (req, next) => {
    const result = await next();
    for (const line of req.data.DocumentLines || []) {
      await adjustStock(
        ItemWarehouseInfoCollection,
        line.ItemCode,
        line.WarehouseCode,
        line.Quantity,
        req,
      );
    }
    return result;
  });

  this.before("CREATE", StockTransfers, async (req) => {
    const fromWarehouse = required(
      req.data.FromWarehouse,
      "FromWarehouse",
      req,
    );
    const toWarehouse = required(req.data.ToWarehouse, "ToWarehouse", req);
    if (fromWarehouse === toWarehouse) {
      req.reject(400, "FromWarehouse and ToWarehouse must differ");
    }
    await requireWarehouse(Warehouses, fromWarehouse, req);
    await requireWarehouse(Warehouses, toWarehouse, req);
    req.data.DocEntry ??= await nextDocumentEntry(
      StockTransfers,
      TRANSFER_DOC_ENTRY_BASE,
    );

    for (const line of req.data.StockTransferLines || []) {
      const item = await requireItem(
        Items,
        required(line.ItemCode, "ItemCode", req),
        req,
      );
      if (
        item.ManageBatchNumbers &&
        sumBatchQuantity(line.BatchNumbers) !== number(line.Quantity)
      ) {
        req.reject(
          400,
          `${item.ItemCode} requires batch quantities matching the line quantity`,
        );
      }
      const stock = await SELECT.one.from(ItemWarehouseInfoCollection).where({
        ItemCode: line.ItemCode,
        WarehouseCode: fromWarehouse,
      });
      if (!stock || number(stock.InStock) < number(line.Quantity)) {
        req.reject(
          409,
          `Insufficient stock for ${line.ItemCode} in warehouse ${fromWarehouse}`,
        );
      }
    }
  });

  this.on("CREATE", StockTransfers, async (req, next) => {
    const result = await next();
    for (const line of req.data.StockTransferLines || []) {
      await adjustStock(
        ItemWarehouseInfoCollection,
        line.ItemCode,
        req.data.FromWarehouse,
        -number(line.Quantity),
        req,
      );
      await adjustStock(
        ItemWarehouseInfoCollection,
        line.ItemCode,
        req.data.ToWarehouse,
        number(line.Quantity),
        req,
      );
    }
    return result;
  });

  this.before("CREATE", Orders, async (req) => {
    await requirePartner(
      BusinessPartners,
      required(req.data.CardCode, "CardCode", req),
      req,
    );
    req.data.DocEntry ??= await nextDocumentEntry(Orders, ORDER_DOC_ENTRY_BASE);
    const lines = req.data.DocumentLines || [];
    let total = 0;
    for (const line of lines) {
      const item = await requireItem(
        Items,
        required(line.ItemCode, "ItemCode", req),
        req,
      );
      await requireWarehouse(
        Warehouses,
        required(line.WarehouseCode, "WarehouseCode", req),
        req,
      );
      total += number(item.SalesPrice) * number(line.Quantity);
    }
    req.data.DocTotal ??= total;
  });
});
