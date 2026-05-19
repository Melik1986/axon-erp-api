namespace axon.warehouse;

using { cuid, managed } from '@sap/cds/common';

entity Suppliers : cuid, managed {
  name    : String(120);
  country : String(3);
  email   : String(254);
}

entity Products : cuid, managed {
  Name        : String(120);
  description : String(500);
  Price       : Decimal(15, 2);
  currency    : String(3);
  Sku         : String(80);
  Quantity    : Integer default 0;
  Unit        : String(10) default 'pcs';
  IsService   : Boolean default false;
  IdempotencyKey : String(120);
  supplier    : Association to Suppliers;
}

entity StockLevels : cuid, managed {
  Name              : String(120);
  Quantity          : Integer default 0;
  Unit              : String(10) default 'pcs';
  warehouseLocation : String(40);
  product           : Association to Products;
}

entity PurchaseOrders : cuid, managed {
  status       : String(20) default 'OPEN';
  deliveryDate : Date;
  totalAmount  : Decimal(15, 2);
  currency     : String(3);
  supplier     : Association to Suppliers;
}

entity Invoices : cuid, managed {
  Number         : String(40);
  Date           : Date;
  CustomerName   : String(120);
  Comment        : String(500);
  IdempotencyKey : String(120);
  Total          : Decimal(15, 2);
  amount         : Decimal(15, 2);
  currency       : String(3) default 'EUR';
  status         : String(20) default 'OPEN';
  supplier       : Association to Suppliers;
  Items          : Composition of many InvoiceItems on Items.invoice = $self;
}

entity InvoiceItems : cuid, managed {
  invoice     : Association to Invoices;
  ProductName : String(120);
  Quantity    : Integer default 1;
  Price       : Decimal(15, 2);
}

entity A_BusinessPartner : managed {
  key BusinessPartner         : String(10);
      BusinessPartnerFullName : String(80);
      OrganizationBPName1     : String(80);
      BusinessPartnerCategory : String(1) default '2';
      Country                 : String(3);
      CityName                : String(40);
      to_BusinessPartnerAddress : Association to many A_BusinessPartnerAddress
                                    on to_BusinessPartnerAddress.BusinessPartner = BusinessPartner;
}

entity A_BusinessPartnerAddress : managed {
  key BusinessPartner : String(10);
  key AddressID         : String(10);
      CityName          : String(40);
      StreetName        : String(60);
      PostalCode        : String(10);
      Country           : String(3);
      businessPartner   : Association to A_BusinessPartner
                            on businessPartner.BusinessPartner = BusinessPartner;
}

entity A_BusinessPartnerRole : managed {
  key BusinessPartner     : String(10);
  key BusinessPartnerRole : String(6);
      businessPartner       : Association to A_BusinessPartner
                                on businessPartner.BusinessPartner = BusinessPartner;
}
