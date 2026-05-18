using WarehouseService from './warehouse-service';

annotate WarehouseService.Products with @(
  Capabilities.InsertRestrictions: {Insertable: true},
  Capabilities.UpdateRestrictions: {Updatable: true},
  Capabilities.DeleteRestrictions: {Deletable: true},
  sap: {creatable: true, updatable: true, deletable: true}
);

annotate WarehouseService.StockLevels with @(
  Capabilities.InsertRestrictions: {Insertable: true},
  Capabilities.UpdateRestrictions: {Updatable: true},
  Capabilities.DeleteRestrictions: {Deletable: true},
  sap: {creatable: true, updatable: true, deletable: true}
);

annotate WarehouseService.Invoices with @(
  Capabilities.InsertRestrictions: {Insertable: true},
  Capabilities.UpdateRestrictions: {Updatable: true},
  Capabilities.DeleteRestrictions: {Deletable: true},
  sap: {creatable: true, updatable: true, deletable: true}
);

annotate WarehouseService.A_BusinessPartner with @(
  Capabilities.InsertRestrictions: {Insertable: true},
  Capabilities.UpdateRestrictions: {Updatable: true},
  Capabilities.DeleteRestrictions: {Deletable: false},
  sap: {creatable: true, updatable: true, deletable: false}
);

annotate WarehouseService.A_BusinessPartnerAddress with @(
  Capabilities.InsertRestrictions: {Insertable: true},
  Capabilities.UpdateRestrictions: {Updatable: true},
  Capabilities.DeleteRestrictions: {Deletable: false},
  sap: {creatable: true, updatable: true, deletable: false}
);

annotate WarehouseService.A_BusinessPartnerRole with @(
  Capabilities.InsertRestrictions: {Insertable: true},
  Capabilities.UpdateRestrictions: {Updatable: false},
  Capabilities.DeleteRestrictions: {Deletable: false},
  sap: {creatable: true, updatable: false, deletable: false}
);
