sap.ui.define(["sap/fe/core/AppComponent"], function (AppComponent) {
  "use strict";

  const HASH_INTENT_ROUTE_MAP = {
    WarehouseInvoices: "WarehouseInvoicesList",
    WarehousePurchaseOrders: "WarehousePurchaseOrdersList",
    WarehouseCatalog: "WarehouseCatalogList",
    WarehouseOps: "WarehouseOpsList",
  };

  function readShellHash() {
    let hash = window.location.hash || "";
    try {
      if (window.parent && window.parent !== window) {
        hash = window.parent.location.hash || hash;
      }
    } catch {
      /* same-origin only; ignore cross-origin parent */
    }
    return hash;
  }

  function resolveRouteFromHash() {
    const hash = readShellHash();
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
      this._activeInboundRoute = null;
      this._boundHashChange = this._onShellHashChange.bind(this);
      this._pendingInboundRoute = this._resolveInboundRouteName();
      AppComponent.prototype.init.apply(this, arguments);
      this._attachShellHashListener();
      this._syncInboundRoute();
    },

    onExit: function () {
      this._detachShellHashListener();
      if (AppComponent.prototype.onExit) {
        AppComponent.prototype.onExit.apply(this, arguments);
      }
    },

    _attachShellHashListener: function () {
      window.addEventListener("hashchange", this._boundHashChange);
      try {
        if (window.parent && window.parent !== window) {
          window.parent.addEventListener("hashchange", this._boundHashChange);
        }
      } catch {
        /* ignore */
      }
    },

    _detachShellHashListener: function () {
      window.removeEventListener("hashchange", this._boundHashChange);
      try {
        if (window.parent && window.parent !== window) {
          window.parent.removeEventListener("hashchange", this._boundHashChange);
        }
      } catch {
        /* ignore */
      }
    },

    _onShellHashChange: function () {
      this._syncInboundRoute();
    },

    _resolveInboundRouteName: function () {
      return (
        resolveRouteFromHash() ||
        resolveRouteFromStartup(this.getComponentData()?.startupParameters)
      );
    },

    _syncInboundRoute: function () {
      const routeName = this._pendingInboundRoute || this._resolveInboundRouteName();
      this._pendingInboundRoute = null;
      if (!routeName || routeName === this._activeInboundRoute) {
        return;
      }
      const router = this.getRouter();
      if (!router) {
        this._pendingInboundRoute = routeName;
        return;
      }
      this._activeInboundRoute = routeName;
      router.navTo(routeName, {}, undefined, true);
    },
  });
});
