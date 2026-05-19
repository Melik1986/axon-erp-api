using WarehouseService from './warehouse-service';

// ─── Products ────────────────────────────────────────────────────────────────
annotate WarehouseService.Products with @(UI: {
  HeaderInfo: {
    TypeName      : 'Product',
    TypeNamePlural: 'Products',
    Title         : {Value: Name},
    Description   : {Value: description}
  },
  SelectionFields: [Name, supplier_ID],
  LineItem: [
    {Value: Name,              Label: 'Product Name'},
    {Value: description,       Label: 'Description'},
    {Value: price,             Label: 'Price'},
    {Value: currency,          Label: 'Currency'},
    {Value: supplier.name,     Label: 'Supplier'}
  ],
  Facets: [{
    $Type : 'UI.ReferenceFacet',
    Label : 'Product Details',
    Target: '@UI.FieldGroup#Main'
  }],
  FieldGroup#Main: {
    Label: 'Product Details',
    Data : [
      {Value: Name,          Label: 'Product Name'},
      {Value: description,   Label: 'Description'},
      {Value: price,         Label: 'Price'},
      {Value: currency,      Label: 'Currency'},
      {Value: supplier.name, Label: 'Supplier'},
      {Value: supplier.country, Label: 'Supplier Country'}
    ]
  }
});

// ─── StockLevels ─────────────────────────────────────────────────────────────
annotate WarehouseService.StockLevels with @(UI: {
  HeaderInfo: {
    TypeName      : 'Stock Level',
    TypeNamePlural: 'Stock Levels',
    Title         : {Value: Name},
    Description   : {Value: warehouseLocation}
  },
  SelectionFields: [Name, warehouseLocation],
  LineItem: [
    {Value: Name,              Label: 'Product Name'},
    {Value: Quantity,          Label: 'Quantity', Criticality: Criticality},
    {Value: warehouseLocation, Label: 'Warehouse Location'},
    {Value: product.description, Label: 'Description'}
  ],
  Facets: [{
    $Type : 'UI.ReferenceFacet',
    Label : 'Stock Details',
    Target: '@UI.FieldGroup#Main'
  }],
  FieldGroup#Main: {
    Label: 'Stock Details',
    Data : [
      {Value: Name,              Label: 'Product Name'},
      {Value: Quantity,          Label: 'Quantity on Hand'},
      {Value: warehouseLocation, Label: 'Warehouse Location'},
      {Value: product.description, Label: 'Product Description'}
    ]
  }
});

// ─── Suppliers ───────────────────────────────────────────────────────────────
annotate WarehouseService.Suppliers with @(UI: {
  HeaderInfo: {
    TypeName      : 'Supplier',
    TypeNamePlural: 'Suppliers',
    Title         : {Value: name},
    Description   : {Value: country}
  },
  SelectionFields: [name, country],
  LineItem: [
    {Value: name,    Label: 'Supplier Name'},
    {Value: country, Label: 'Country'},
    {Value: email,   Label: 'Email'}
  ],
  Facets: [{
    $Type : 'UI.ReferenceFacet',
    Label : 'Supplier Details',
    Target: '@UI.FieldGroup#Main'
  }],
  FieldGroup#Main: {
    Label: 'Supplier Details',
    Data : [
      {Value: name,    Label: 'Supplier Name'},
      {Value: country, Label: 'Country'},
      {Value: email,   Label: 'Email'}
    ]
  }
});

// ─── PurchaseOrders ──────────────────────────────────────────────────────────
annotate WarehouseService.PurchaseOrders with @(UI: {
  HeaderInfo: {
    TypeName      : 'Purchase Order',
    TypeNamePlural: 'Purchase Orders',
    Title         : {Value: status},
    Description   : {Value: deliveryDate}
  },
  SelectionFields: [status, deliveryDate, supplier_ID],
  LineItem: [
    {
      Value      : status,
      Label      : 'Status',
      Criticality: {
        $edmJson: {
          $If: [
            {$Eq: [{$Path: 'status'}, 'DELIVERED']},
            3,
            {$If: [
              {$Eq: [{$Path: 'status'}, 'IN_TRANSIT']},
              2,
              1
            ]}
          ]
        }
      }
    },
    {Value: deliveryDate,    Label: 'Delivery Date'},
    {Value: totalAmount,     Label: 'Total Amount'},
    {Value: currency,        Label: 'Currency'},
    {Value: supplier.name,   Label: 'Supplier'}
  ],
  Facets: [{
    $Type : 'UI.ReferenceFacet',
    Label : 'Order Details',
    Target: '@UI.FieldGroup#Main'
  }],
  FieldGroup#Main: {
    Label: 'Order Details',
    Data : [
      {Value: status,        Label: 'Status'},
      {Value: deliveryDate,  Label: 'Delivery Date'},
      {Value: totalAmount,   Label: 'Total Amount'},
      {Value: currency,      Label: 'Currency'},
      {Value: supplier.name, Label: 'Supplier'}
    ]
  }
});

// ─── Invoices ─────────────────────────────────────────────────────────────────
annotate WarehouseService.Invoices with @(UI: {
  HeaderInfo: {
    TypeName      : 'Invoice',
    TypeNamePlural: 'Invoices',
    Title         : {Value: amount},
    Description   : {Value: status}
  },
  SelectionFields: [status, supplier_ID],
  LineItem: [
    {Value: amount,        Label: 'Amount'},
    {Value: currency,      Label: 'Currency'},
    {
      Value      : status,
      Label      : 'Status',
      Criticality: {
        $edmJson: {
          $If: [
            {$Eq: [{$Path: 'status'}, 'PAID']},
            3,
            {$If: [
              {$Eq: [{$Path: 'status'}, 'POSTED']},
              2,
              1
            ]}
          ]
        }
      }
    },
    {Value: supplier.name, Label: 'Supplier'}
  ],
  Facets: [{
    $Type : 'UI.ReferenceFacet',
    Label : 'Invoice Details',
    Target: '@UI.FieldGroup#Main'
  }],
  FieldGroup#Main: {
    Label: 'Invoice Details',
    Data : [
      {Value: amount,        Label: 'Amount'},
      {Value: currency,      Label: 'Currency'},
      {Value: status,        Label: 'Status'},
      {Value: supplier.name, Label: 'Supplier'},
      {Value: supplier.country, Label: 'Supplier Country'}
    ]
  }
});

// ─── A_BusinessPartner ───────────────────────────────────────────────────────
annotate WarehouseService.A_BusinessPartner with @(UI: {
  HeaderInfo: {
    TypeName      : 'Business Partner',
    TypeNamePlural: 'Business Partners',
    Title         : {Value: BusinessPartnerFullName},
    Description   : {Value: BusinessPartner}
  },
  SelectionFields: [BusinessPartner, BusinessPartnerFullName, Country],
  LineItem: [
    {Value: BusinessPartner,         Label: 'Partner ID'},
    {Value: BusinessPartnerFullName, Label: 'Full Name'},
    {Value: BusinessPartnerCategory, Label: 'Category'},
    {Value: Country,                 Label: 'Country'},
    {Value: CityName,                Label: 'City'}
  ],
  Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'General Data',
      Target: '@UI.FieldGroup#Main'
    }
  ],
  FieldGroup#Main: {
    Label: 'General Data',
    Data : [
      {Value: BusinessPartner,         Label: 'Partner ID'},
      {Value: BusinessPartnerFullName, Label: 'Full Name'},
      {Value: BusinessPartnerCategory, Label: 'Category (1=Person, 2=Org)'},
      {Value: Country,                 Label: 'Country'},
      {Value: CityName,                Label: 'City'}
    ]
  }
});

// ─── A_BusinessPartnerAddress ────────────────────────────────────────────────
annotate WarehouseService.A_BusinessPartnerAddress with @(UI: {
  HeaderInfo: {
    TypeName      : 'BP Address',
    TypeNamePlural: 'BP Addresses',
    Title         : {Value: CityName},
    Description   : {Value: StreetName}
  },
  SelectionFields: [BusinessPartner, CityName, Country],
  LineItem: [
    {Value: BusinessPartner, Label: 'Partner ID'},
    {Value: AddressID,       Label: 'Address ID'},
    {Value: StreetName,      Label: 'Street'},
    {Value: CityName,        Label: 'City'},
    {Value: PostalCode,      Label: 'Postal Code'},
    {Value: Country,         Label: 'Country'}
  ]
});

// ─── A_BusinessPartnerRole ───────────────────────────────────────────────────
annotate WarehouseService.A_BusinessPartnerRole with @(UI: {
  HeaderInfo: {
    TypeName      : 'BP Role',
    TypeNamePlural: 'BP Roles',
    Title         : {Value: BusinessPartnerRole},
    Description   : {Value: BusinessPartner}
  },
  SelectionFields: [BusinessPartner, BusinessPartnerRole],
  LineItem: [
    {Value: BusinessPartner,     Label: 'Partner ID'},
    {Value: BusinessPartnerRole, Label: 'Role Code'}
  ]
});
