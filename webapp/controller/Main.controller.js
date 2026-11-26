sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";

  return Controller.extend("com.demo.fioriskeleton.controller.Main", {
    onInit: function () {},

    onPress: function () {
      var oBundle = this.getView().getModel("i18n").getResourceBundle();
      MessageToast.show(oBundle.getText("buttonPressed"));
    }
  });
});
