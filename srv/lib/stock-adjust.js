const cds = require("@sap/cds");

const { SELECT, UPDATE, INSERT } = cds.ql;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function findStockRow(StockLevels, { productId, productName, warehouse }) {
  const rows = await SELECT.from(StockLevels);
  return rows.find((row) => {
    const idOk =
      productId &&
      (String(row.product_ID) === String(productId) || String(row.ID) === String(productId));
    const nameOk =
      productName &&
      String(row.Name || "")
        .toLowerCase()
        .includes(String(productName).toLowerCase());
    const whOk = !warehouse || row.warehouseLocation === warehouse;
    return (idOk || nameOk) && whOk;
  });
}

async function applyStockDelta(StockLevels, row, delta, req) {
  const next = toNumber(row.Quantity) + toNumber(delta);
  if (next < 0) {
    req.reject(409, `Insufficient stock for ${row.Name} at ${row.warehouseLocation}`);
  }
  await UPDATE(StockLevels).set({ Quantity: next }).where({ ID: row.ID });
  return { ...row, Quantity: next };
}

async function transferStock(StockLevels, data, fromWh, toWh, quantity, req) {
  const source = await findStockRow(StockLevels, {
    productId: data.ProductId,
    productName: data.ProductName,
    warehouse: fromWh,
  });
  if (!source) req.reject(404, `Stock not found in warehouse ${fromWh}`);
  await applyStockDelta(StockLevels, source, -quantity, req);
  let target = await findStockRow(StockLevels, {
    productId: data.ProductId || source.product_ID,
    productName: data.ProductName || source.Name,
    warehouse: toWh,
  });
  if (!target) {
    const created = await INSERT.into(StockLevels).entries({
      Name: source.Name,
      Quantity: 0,
      Unit: source.Unit || "pcs",
      warehouseLocation: toWh,
      product_ID: source.product_ID,
    });
    target = Array.isArray(created) ? created[0] : created;
  }
  return applyStockDelta(StockLevels, target, quantity, req);
}

async function handleStockAdjust(StockLevels, data, req) {
  const quantity = toNumber(data.Quantity);
  const reason = String(data.Reason || "");
  const transfer = reason.match(/^(\d{2})\s*->\s*(\d{2})$/);
  if (transfer) {
    return transferStock(StockLevels, data, transfer[1], transfer[2], quantity, req);
  }
  const row = await findStockRow(StockLevels, {
    productId: data.ProductId,
    productName: data.ProductName,
  });
  if (!row) req.reject(404, "Stock level not found");
  return applyStockDelta(StockLevels, row, quantity - toNumber(row.Quantity), req);
}

module.exports = {
  applyStockDelta,
  findStockRow,
  handleStockAdjust,
  toNumber,
};
