using {axon.warehouse as wh} from '../db/schema';

@path: 'warehouse'
service WarehouseService @(requires: 'authenticated-user') {
  entity Products                 as select from wh.Products;
  entity StockLevels              as select from wh.StockLevels;
  entity Suppliers                as select from wh.Suppliers;
  entity PurchaseOrders           as select from wh.PurchaseOrders;
  entity Invoices                 as select from wh.Invoices;
  entity A_BusinessPartner        as select from wh.A_BusinessPartner;
  entity A_BusinessPartnerAddress as select from wh.A_BusinessPartnerAddress;
  entity A_BusinessPartnerRole    as select from wh.A_BusinessPartnerRole;
}
