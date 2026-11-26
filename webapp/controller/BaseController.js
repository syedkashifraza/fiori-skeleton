sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "com/team/leavetracker/model/formatter"
], function (Controller, MessageBox, formatter) {
  "use strict";

  return Controller.extend("com.team.leavetracker.controller.BaseController", {
    formatter: formatter,

    getRouter: function () {
      return this.getOwnerComponent().getRouter();
    },

    getModel: function (sName) {
      return this.getView().getModel(sName);
    },

    getText: function (sKey, aArgs) {
      return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
    },

    getUser: function () {
      return this.getOwnerComponent().getModel("user").getData();
    },

    navTo: function (sRoute, oParams, bReplace) {
      this.getRouter().navTo(sRoute, oParams || {}, bReplace);
    },

    /**
     * Shows an OData or JS error in a message box.
     * @param {Error} oError the error
     */
    showError: function (oError) {
      var sMessage = (oError && (oError.message || oError.statusText)) || String(oError);
      MessageBox.error(sMessage);
    },

    /**
     * Calls a bound action of LeaveService on a context, e.g. "approve".
     * @param {sap.ui.model.odata.v4.Context} oContext the bound entity
     * @param {string} sAction action name without namespace
     * @param {object} [mParams] action parameters
     * @returns {Promise} resolves when the action is done
     */
    callAction: function (oContext, sAction, mParams) {
      var oAction = oContext.getModel().bindContext("LeaveService." + sAction + "(...)", oContext, {
        $$inheritExpandSelect: true
      });
      Object.keys(mParams || {}).forEach(function (sName) {
        oAction.setParameter(sName, mParams[sName]);
      });
      return oAction.invoke();
    }
  });
});
