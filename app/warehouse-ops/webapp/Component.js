sap.ui.define(["sap/fe/core/AppComponent"], function (AppComponent) {
  "use strict";

  const INTENT_ROUTE_MAP = {
    WarehouseInvoices: "WarehouseInvoicesList",
    WarehousePurchaseOrders: "WarehousePurchaseOrdersList",
    WarehouseCatalog: "WarehouseCatalogList",
    WarehouseOps: "WarehouseOpsList",
  };

  function resolveInboundRouteName() {
    const hash = window.location.hash || "";
    for (const [semanticObject, routeName] of Object.entries(INTENT_ROUTE_MAP)) {
      if (hash.includes(semanticObject)) {
        return routeName;
      }
    }
    return null;
  }

  return AppComponent.extend("axon.warehouse.ops.Component", {
    metadata: { manifest: "json" },

    init: function () {
      AppComponent.prototype.init.apply(this, arguments);
      this._navigateInboundRoute();
    },

    _navigateInboundRoute: function () {
      const routeName = resolveInboundRouteName();
      if (!routeName) {
        return;
      }
      const router = this.getRouter();
      if (!router) {
        return;
      }
      router.attachEventOnce("routeMatched", function () {
        router.navTo(routeName, {}, undefined, true);
      });
    },
  });
});
