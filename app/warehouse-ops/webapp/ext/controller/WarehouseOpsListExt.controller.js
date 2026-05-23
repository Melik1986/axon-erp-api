sap.ui.define(
  [
    "sap/ui/core/mvc/ControllerExtension",
    "axon/warehouse/ops/ext/FeOverlayRelease",
  ],
  function (ControllerExtension, FeOverlayRelease) {
    "use strict";

    function viewDom(controller) {
      return controller.base.getView()?.getDomRef?.();
    }

    function afterBatch(controller) {
      FeOverlayRelease.watchUntilReleased(viewDom(controller), 25);
    }

    return ControllerExtension.extend(
      "axon.warehouse.ops.ext.controller.WarehouseOpsListExt",
      {
        override: {
          onInit() {
            const model =
              this.base.getExtensionAPI()?.getModel?.() || this.base.getModel();
            if (!model) {
              return;
            }
            model.attachRequestCompleted((event) => {
              const url = event.getParameter("url") || "";
              if (url.includes("$batch")) {
                setTimeout(() => afterBatch(this), 80);
              }
            });
          },

          onAfterRendering() {
            afterBatch(this);
          },

          routing: {
            onAfterBinding() {
              afterBatch(this);
            },
          },
        },
      },
    );
  },
);
