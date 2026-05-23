using WarehouseService from './warehouse-service';

// ─── Products ────────────────────────────────────────────────────────────────
annotate WarehouseService.Products with @(UI: {
  HeaderInfo: {
    TypeName      : 'Product',
    TypeNamePlural: 'Products',
    Title         : {Value: Name},
    Description   : {Value: description}
  },
  // SelectionFields omitted for demo: FE otherwise shows "Let's get results" without OData read.
  SelectionPresentationVariant #Default: {
    Text                : 'Default',
    SelectionVariant    : {SelectOptions: []},
    PresentationVariant : {
      MaxItems      : 100,
      SortOrder     : [{Property: Name, Descending: false}],
      Visualizations: ['@UI.LineItem']
    }
  },
  PresentationVariant #LoadAll: {
    Text          : 'All products',
    MaxItems      : 100,
    SortOrder     : [{Property: Name, Descending: false}],
    Visualizations: ['@UI.LineItem']
  },
  LineItem: [
    {Value: Name,              Label: 'Product Name'},
    {Value: Sku,               Label: 'SKU'},
    {Value: description,       Label: 'Description'},
    {Value: Price,             Label: 'Price'},
    {Value: currency,          Label: 'Currency'},
    {Value: Quantity,          Label: 'Available Qty'},
    {Value: Unit,              Label: 'Unit'},
    {Value: supplier.name,     Label: 'Supplier'}
  ],
  Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Product Details',
      Target: '@UI.FieldGroup#Main'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Supplier Context',
      Target: 'supplier/@UI.FieldGroup#Main'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Stock Levels',
      Target: 'stockLevels/@UI.LineItem'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Replenishment Orders',
      Target: 'supplier/purchaseOrders/@UI.LineItem'
    }
  ],
  FieldGroup#Main: {
    Label: 'Product Details',
    Data : [
      {Value: Name,          Label: 'Product Name'},
      {Value: Sku,           Label: 'SKU'},
      {Value: description,   Label: 'Description'},
      {Value: Price,         Label: 'Price'},
      {Value: currency,      Label: 'Currency'},
      {Value: Quantity,      Label: 'Available Qty'},
      {Value: Unit,          Label: 'Unit'},
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
    {
      Value      : Quantity,
      Label      : 'Quantity',
      Criticality: {
        $edmJson: {
          $If: [
            {$Lt: [{$Path: 'Quantity'}, 50]},
            1,
            {$If: [
              {$Lt: [{$Path: 'Quantity'}, 100]},
              2,
              3
            ]}
          ]
        }
      }
    },
    {Value: Unit,              Label: 'Unit'},
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
      {Value: Unit,              Label: 'Unit'},
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
    Title         : {Value: Number},
    Description   : {Value: CustomerName}
  },
  SelectionFields: [Number, CustomerName, status, supplier_ID],
  LineItem: [
    {Value: Number,        Label: 'Invoice No.'},
    {Value: Date,          Label: 'Date'},
    {Value: CustomerName,  Label: 'Customer / Supplier'},
    {Value: amount,        Label: 'Amount'},
    {Value: Total,         Label: 'Total'},
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
      {Value: Total,         Label: 'Total'},
      {Value: currency,      Label: 'Currency'},
      {Value: status,        Label: 'Status'},
      {Value: CustomerName,  Label: 'Customer / Supplier'},
      {Value: Comment,       Label: 'Comment'},
      {Value: supplier.name, Label: 'Supplier'},
      {Value: supplier.country, Label: 'Supplier Country'}
    ]
  }
});

// ─── InvoiceItems ───────────────────────────────────────────────────────────
annotate WarehouseService.InvoiceItems with @(UI: {
  HeaderInfo: {
    TypeName      : 'Invoice Item',
    TypeNamePlural: 'Invoice Items',
    Title         : {Value: ProductName},
    Description   : {Value: Price}
  },
  SelectionFields: [ProductName],
  LineItem: [
    {Value: ProductName, Label: 'Product'},
    {Value: Quantity,    Label: 'Quantity'},
    {Value: Price,       Label: 'Price'}
  ]
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
    {Value: OrganizationBPName1,     Label: 'Organization Name'},
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
      {Value: OrganizationBPName1,     Label: 'Organization Name'},
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
