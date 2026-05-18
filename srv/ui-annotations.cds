using WarehouseService from './warehouse-service';

annotate WarehouseService.Products with @(UI: {
  SelectionFields: [name],
  LineItem: [
    {Value: name, Label: 'Name'},
    {Value: price, Label: 'Price'},
    {Value: currency, Label: 'Currency'}
  ]
});

annotate WarehouseService.StockLevels with @(UI: {
  SelectionFields: [name],
  LineItem: [
    {Value: name, Label: 'Product'},
    {Value: quantity, Label: 'Quantity'},
    {Value: warehouseLocation, Label: 'Location'}
  ]
});

annotate WarehouseService.Suppliers with @(UI: {
  SelectionFields: [name],
  LineItem: [
    {Value: name, Label: 'Name'},
    {Value: country, Label: 'Country'},
    {Value: email, Label: 'Email'}
  ]
});

annotate WarehouseService.PurchaseOrders with @(UI: {
  SelectionFields: [status, deliveryDate],
  LineItem: [
    {Value: status, Label: 'Status'},
    {Value: deliveryDate, Label: 'Delivery date'},
    {Value: totalAmount, Label: 'Total'},
    {Value: currency, Label: 'Currency'}
  ]
});

annotate WarehouseService.Invoices with @(UI: {
  SelectionFields: [status],
  LineItem: [
    {Value: amount, Label: 'Amount'},
    {Value: currency, Label: 'Currency'},
    {Value: status, Label: 'Status'}
  ]
});
