sap.ui.define([
  "com/team/leavetracker/controller/BaseController",
  "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
  "use strict";

  /**
   * Shared stand-in for routes that are built in later phases.
   * Each routing target creates its own instance; the target id (e.g. "calendar")
   * picks the i18n texts placeholder.<id>.title / .description.
   */
  return BaseController.extend("com.team.leavetracker.controller.Placeholder", {
    onInit: function () {
      var sTarget = this.getOwnerComponent().getLocalId(this.getView().getId());
      this.getView().setModel(new JSONModel({
        title: this.getText("placeholder." + sTarget + ".title"),
        description: this.getText("placeholder." + sTarget + ".description")
      }), "view");
    }
  });
});
