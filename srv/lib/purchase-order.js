const cds = require("@sap/cds");
const { applyStockDelta, findStockRow, toNumber } = require("./stock-adjust");

const { SELECT, INSERT } = cds.ql;

const SIEMENS_SUPPLIER_ID = "11111111-1111-1111-1111-111111111101";
const PO_DOC_BASE = 401;

async function nextPoNumber(PurchaseOrders) {
  const rows = await SELECT.from(PurchaseOrders).columns("ID");
  return PO_DOC_BASE + rows.length + 1;
}

async function findProductByMaterial(Products, material) {
  const rows = await SELECT.from(Products);
  return rows.find(
    (row) =>
      row.Sku === material ||
      row.Product === material ||
      row.InternationalArticleNumber === material,
  );
}

async function bumpStockForPoItem(StockLevels, Products, item, req) {
  const material = item.Material || item.SupplierMaterialNumber;
  const product = await findProductByMaterial(Products, material);
  if (!product) req.reject(400, `Unknown material ${material}`);
  const warehouse = item.WarehouseCode || "01";
  let stock = await findStockRow(StockLevels, {
    productId: product.ID,
    warehouse,
  });
  if (!stock) {
    const created = await INSERT.into(StockLevels).entries({
      Name: product.Name,
      Quantity: 0,
      Unit: product.Unit || "pcs",
      warehouseLocation: warehouse,
      product_ID: product.ID,
    });
    stock = Array.isArray(created) ? created[0] : created;
  }
  await applyStockDelta(StockLevels, stock, toNumber(item.OrderQuantity), req);
}

async function preparePurchaseOrder(PurchaseOrders, data) {
  data.status ??= "OPEN";
  data.currency ??= "EUR";
  data.deliveryDate ??= new Date().toISOString().slice(0, 10);
  data.supplier_ID ??= SIEMENS_SUPPLIER_ID;
  const items = data.to_PurchaseOrderItem || [];
  data.totalAmount ??= items.reduce(
    (sum, line) =>
      sum + toNumber(line.OrderQuantity) * toNumber(line.NetPriceAmount),
    0,
  );
  data.comment ??= `PO-${await nextPoNumber(PurchaseOrders)}`;
}

function registerPurchaseOrderHandlers(service, entities) {
  const { Products, StockLevels, PurchaseOrders } = entities;

  service.before("CREATE", PurchaseOrders, async (req) => {
    await preparePurchaseOrder(PurchaseOrders, req.data);
  });

  service.on("CREATE", PurchaseOrders, async (req, next) => {
    const result = await next();
    for (const item of req.data.to_PurchaseOrderItem || []) {
      await bumpStockForPoItem(StockLevels, Products, item, req);
    }
    return result;
  });
}

module.exports = {
  SIEMENS_SUPPLIER_ID,
  bumpStockForPoItem,
  preparePurchaseOrder,
  registerPurchaseOrderHandlers,
};
