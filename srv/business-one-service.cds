using { vstah.sapb1 as b1 } from '../db/sap-b1-schema';

@path: 'b1s/v2'
service BusinessOneService @(requires: 'authenticated-user') {
  @readonly entity Warehouses                 as projection on b1.Warehouses;
  @readonly entity BusinessPartners           as projection on b1.BusinessPartners;
  @readonly entity Items                      as projection on b1.Items;
  @readonly entity ItemWarehouseInfoCollection as projection on b1.ItemWarehouseInfoCollection;

  entity PurchaseDeliveryNotes as projection on b1.PurchaseDeliveryNotes;
  entity StockTransfers        as projection on b1.StockTransfers;
  entity Orders                as projection on b1.Orders;
}
