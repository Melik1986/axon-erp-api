sap.ui.define(["sap/fe/core/AppComponent"], function (AppComponent) {
  "use strict";

  const HASH_INTENT_ROUTE_MAP = {
    WarehouseInvoices: "WarehouseInvoicesList",
    WarehousePurchaseOrders: "WarehousePurchaseOrdersList",
    WarehouseCatalog: "WarehouseCatalogList",
    WarehouseOps: "WarehouseOpsList",
  };

  function resolveRouteFromHash() {
    const hash = window.location.hash || "";
    const entries = Object.entries(HASH_INTENT_ROUTE_MAP).sort(
      (left, right) => right[0].length - left[0].length,
    );
    for (const [semanticObject, routeName] of entries) {
      if (hash.includes(semanticObject)) {
        return routeName;
      }
    }
    return null;
  }

  function resolveRouteFromStartup(startupParameters) {
    const sapRoute = startupParameters?.["sap-route"]?.[0];
    return typeof sapRoute === "string" && sapRoute.length > 0 ? sapRoute : null;
  }

  return AppComponent.extend("axon.warehouse.ops.Component", {
    metadata: { manifest: "json" },

    init: function () {
      this._pendingInboundRoute = this._resolveInboundRouteName();
      AppComponent.prototype.init.apply(this, arguments);
      this._applyInboundRoute();
    },

    _resolveInboundRouteName: function () {
      const startupParameters = this.getComponentData()?.startupParameters;
      return resolveRouteFromStartup(startupParameters) || resolveRouteFromHash();
    },

    _applyInboundRoute: function () {
      const routeName = this._pendingInboundRoute || this._resolveInboundRouteName();
      if (!routeName) {
        return;
      }
      const router = this.getRouter();
      if (!router) {
        return;
      }
      router.navTo(routeName, {}, undefined, true);
    },
  });
});
