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
  price       : Decimal(15, 2);
  currency    : String(3);
  supplier    : Association to Suppliers;
}

entity StockLevels : cuid, managed {
  Name              : String(120);
  Quantity          : Integer default 0;
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
  amount   : Decimal(15, 2);
  currency : String(3);
  status   : String(20) default 'OPEN';
  supplier : Association to Suppliers;
}

entity A_BusinessPartner : managed {
  key BusinessPartner         : String(10);
      BusinessPartnerFullName : String(80);
      BusinessPartnerCategory : String(1) default '2';
      Country                 : String(3);
      CityName                : String(40);
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
