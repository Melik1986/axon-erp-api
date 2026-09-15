using {axon.warehouse as wh} from '../db/schema';

@path: 'warehouse'
service WarehouseService @(requires: 'authenticated-user') {
  @cds.redirection.target
  entity Products                 as select from wh.Products;
  @cds.redirection.target
  entity StockLevels              as select from wh.StockLevels;
  @cds.redirection.target
  entity Suppliers                as select from wh.Suppliers;
  @cds.redirection.target
  entity PurchaseOrders           as select from wh.PurchaseOrders;
  @cds.redirection.target
  entity Invoices                 as select from wh.Invoices actions {
    action PostInvoice(IdempotencyKey: String) returns Invoices;
  };
  entity InvoiceItems             as select from wh.InvoiceItems;
  entity A_PurchaseOrderItem      as select from wh.A_PurchaseOrderItem;
  entity A_Supplier               as select from wh.A_Supplier;
  entity A_Product                as select from wh.A_Product;
  entity A_MaterialStock          as select from wh.A_MaterialStock;
  entity A_PurchaseOrder          as select from wh.A_PurchaseOrder;
  entity A_SupplierInvoice        as select from wh.A_SupplierInvoice;
  entity A_BusinessPartner        as select from wh.A_BusinessPartner;
  entity A_BusinessPartnerAddress as select from wh.A_BusinessPartnerAddress;
  entity A_BusinessPartnerRole    as select from wh.A_BusinessPartnerRole;

  action adjust(
    ProductId      : String,
    ProductName    : String,
    Quantity       : Integer,
    Reason         : String,
    IdempotencyKey : String
  ) returns StockLevels;
}
