using {axon.warehouse as db} from '../db/schema';

@path: 'warehouse'
service WarehouseService @(requires: 'authenticated-user') {
  entity Products              as projection on db.Products;
  entity StockLevels           as projection on db.StockLevels;
  entity Suppliers             as projection on db.Suppliers;
  entity PurchaseOrders        as projection on db.PurchaseOrders;
  entity Invoices              as projection on db.Invoices;
  entity A_BusinessPartner     as projection on db.A_BusinessPartner;
  entity A_BusinessPartnerAddress as projection on db.A_BusinessPartnerAddress;
  entity A_BusinessPartnerRole as projection on db.A_BusinessPartnerRole;
}
