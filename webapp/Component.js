sap.ui.define([
  "sap/ui/core/UIComponent",
  "com/demo/fioriskeleton/model/models"
], function (UIComponent, models) {
  "use strict";

  return UIComponent.extend("com.demo.fioriskeleton.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      this.setModel(models.createDeviceModel(), "device");
      this.getRouter().initialize();
    }
  });
});
