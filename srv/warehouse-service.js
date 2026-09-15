const cds = require("@sap/cds");
const { handleStockAdjust, toNumber } = require("./lib/stock-adjust");
const { registerPurchaseOrderHandlers } = require("./lib/purchase-order");

const { SELECT, UPDATE } = cds.ql;
const DEFAULT_SUPPLIER_NAME = "Siemens Industrial Automation AG";

function invoiceTotal(items) {
  return (items || []).reduce(
    (sum, item) => sum + toNumber(item.Quantity) * toNumber(item.Price),
    0,
  );
}

function normalizeInvoiceItems(items) {
  return (items || []).map((item) => ({
    ...item,
    Quantity: item.Quantity ?? 1,
    Price: item.Price ?? 0,
  }));
}

async function resolveSupplierId(suppliers, name) {
  const supplierName = (name || DEFAULT_SUPPLIER_NAME).trim();
  const supplier = await SELECT.one
    .from(suppliers)
    .columns("ID")
    .where({ name: supplierName });
  return supplier?.ID;
}

module.exports = cds.service.impl(function () {
  const {
    Products,
    Invoices,
    Suppliers,
    StockLevels,
    PurchaseOrders,
    A_BusinessPartner,
    A_BusinessPartnerRole,
  } = this.entities;

  registerPurchaseOrderHandlers(this, {
    Products,
    StockLevels,
    PurchaseOrders,
  });

  this.before("CREATE", Products, (req) => {
    const data = req.data;
    data.Price ??= 0;
    data.currency ??= "EUR";
    data.Quantity ??= 0;
    data.Unit ??= "pcs";
    data.IsService ??= false;
    data.Product ??= data.Sku;
    data.InternationalArticleNumber ??= data.Sku;
  });

  this.before("CREATE", Invoices, async (req) => {
    const data = req.data;
    data.Items = normalizeInvoiceItems(data.Items);
    data.Total ??= invoiceTotal(data.Items);
    data.amount ??= data.Total;
    data.CustomerName ??= DEFAULT_SUPPLIER_NAME;
    data.currency ??= "EUR";
    data.status ??= "OPEN";
    data.Date ??= new Date().toISOString().slice(0, 10);
    data.Number ??= `INV-${Date.now()}`;
    data.supplier_ID ??= await resolveSupplierId(Suppliers, data.CustomerName);
  });

  this.before(["CREATE", "UPDATE"], A_BusinessPartner, (req) => {
    const data = req.data;
    data.OrganizationBPName1 ??= data.BusinessPartnerFullName;
    data.BusinessPartnerFullName ??= data.OrganizationBPName1;
  });

  this.on("CREATE", A_BusinessPartnerRole, async (req, next) => {
    const existing = await SELECT.one.from(A_BusinessPartnerRole).where({
      BusinessPartner: req.data.BusinessPartner,
      BusinessPartnerRole: req.data.BusinessPartnerRole,
    });
    return existing || next();
  });

  this.on("PostInvoice", Invoices, async (req) => {
    const id = req.params?.[0]?.ID;
    if (!id) req.error(400, "Invoice ID is required");
    await UPDATE(Invoices, id).with({ status: "POSTED" });
    return SELECT.one.from(Invoices).where({ ID: id });
  });

  this.on("adjust", async (req) => handleStockAdjust(StockLevels, req.data, req));
});
