using { axon.warehouse as wh } from '../db/schema';
using { vstah.sapb1 as b1 } from '../db/sap-b1-schema';

/**
 * SAP Business One demo profile for Vstah AI.
 * Wire-format = existing Vstah SAP tools (Products / StockLevels / …),
 * not native B1 Service Layer Login/DocumentLines payloads.
 */
@path: 'b1s/v2'
service BusinessOneService @(requires: 'authenticated-user') {

  @cds.redirection.target
  entity Products                    as projection on wh.Products;
  @cds.redirection.target
  entity StockLevels                 as projection on wh.StockLevels;
  @cds.redirection.target
  entity Suppliers                   as projection on wh.Suppliers;
  @cds.redirection.target
  entity PurchaseOrders              as projection on wh.PurchaseOrders;
  @cds.redirection.target
  entity Invoices                    as projection on wh.Invoices actions {
    action PostInvoice(IdempotencyKey: String) returns Invoices;
  };

  entity InvoiceItems                as projection on wh.InvoiceItems;
  entity A_PurchaseOrderItem         as projection on wh.A_PurchaseOrderItem;
  entity A_Supplier                  as projection on wh.A_Supplier;
  entity A_Product                   as projection on wh.A_Product;
  entity A_MaterialStock             as projection on wh.A_MaterialStock;
  entity A_PurchaseOrder             as projection on wh.A_PurchaseOrder;
  entity A_SupplierInvoice           as projection on wh.A_SupplierInvoice;
  entity A_BusinessPartner           as projection on wh.A_BusinessPartner;
  entity A_BusinessPartnerAddress    as projection on wh.A_BusinessPartnerAddress;
  entity A_BusinessPartnerRole       as projection on wh.A_BusinessPartnerRole;

  @readonly entity Warehouses                  as projection on b1.Warehouses;
  @readonly entity BusinessPartners            as projection on b1.BusinessPartners;
  @readonly entity Items                       as projection on b1.Items;
  @readonly entity ItemWarehouseInfoCollection as projection on b1.ItemWarehouseInfoCollection;

  /** Vstah `update_stock` posts to `/StockLevels/adjust` (rewritten in server.js). */
  action adjust(
    ProductId      : String,
    ProductName    : String,
    Quantity       : Integer,
    Reason         : String,
    IdempotencyKey : String
  ) returns StockLevels;
}
