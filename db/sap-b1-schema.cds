namespace vstah.sapb1;

using { cuid, managed } from '@sap/cds/common';

entity Warehouses {
  key WarehouseCode : String(8);
      WarehouseName : String(100);
      Location      : String(100);
}

entity BusinessPartners {
  key CardCode : String(20);
      CardName  : String(120);
      CardType  : String(1);
      Country   : String(3);
}

entity Items {
  key ItemCode           : String(50);
      ItemName            : String(120);
      ManageSerialNumbers : Boolean default false;
      ManageBatchNumbers  : Boolean default false;
      PurchasePrice       : Decimal(15, 2);
      SalesPrice          : Decimal(15, 2);
      InventoryUoM        : String(10) default 'pcs';
}

entity ItemWarehouseInfoCollection {
  key ItemCode      : String(50);
  key WarehouseCode : String(8);
      InStock        : Decimal(15, 3) default 0;
      Committed      : Decimal(15, 3) default 0;
      Ordered        : Decimal(15, 3) default 0;
      item           : Association to Items
                       on item.ItemCode = ItemCode;
      warehouse      : Association to Warehouses
                       on warehouse.WarehouseCode = WarehouseCode;
}

entity PurchaseDeliveryNotes : cuid, managed {
  DocEntry      : Integer;
  CardCode      : String(20);
  DocDate       : Date;
  DocumentLines : Composition of many PurchaseDeliveryNoteLines
                    on DocumentLines.document = $self;
}

entity PurchaseDeliveryNoteLines : cuid {
  ItemCode      : String(50);
  Quantity      : Decimal(15, 3);
  WarehouseCode : String(8);
  document      : Association to PurchaseDeliveryNotes;
  SerialNumbers : Composition of many PurchaseDeliverySerialNumbers
                    on SerialNumbers.documentLine = $self;
  BatchNumbers  : Composition of many PurchaseDeliveryBatchNumbers
                    on BatchNumbers.documentLine = $self;
}

entity PurchaseDeliverySerialNumbers : cuid {
  InternalSerialNumber : String(100);
  documentLine         : Association to PurchaseDeliveryNoteLines;
}

entity PurchaseDeliveryBatchNumbers : cuid {
  BatchNumber  : String(100);
  Quantity     : Decimal(15, 3);
  documentLine : Association to PurchaseDeliveryNoteLines;
}

entity StockTransfers : cuid, managed {
  DocEntry          : Integer;
  FromWarehouse     : String(8);
  ToWarehouse       : String(8);
  StockTransferLines : Composition of many StockTransferLines
                         on StockTransferLines.document = $self;
}

entity StockTransferLines : cuid {
  ItemCode          : String(50);
  Quantity          : Decimal(15, 3);
  document          : Association to StockTransfers;
  BatchNumbers      : Composition of many StockTransferBatchNumbers
                        on BatchNumbers.documentLine = $self;
}

entity StockTransferBatchNumbers : cuid {
  BatchNumber  : String(100);
  Quantity     : Decimal(15, 3);
  documentLine : Association to StockTransferLines;
}

entity Orders : cuid, managed {
  DocEntry      : Integer;
  CardCode      : String(20);
  DocDueDate    : Date;
  DocTotal      : Decimal(15, 2);
  DocumentLines : Composition of many SalesOrderLines
                    on DocumentLines.document = $self;
}

entity SalesOrderLines : cuid {
  ItemCode      : String(50);
  Quantity      : Decimal(15, 3);
  WarehouseCode : String(8);
  document      : Association to Orders;
}
