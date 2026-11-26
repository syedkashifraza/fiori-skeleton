sap.ui.define([
  "com/team/leavetracker/controller/BaseController"
], function (BaseController) {
  "use strict";

  // Detail routes highlight their parent entry in the side navigation
  var NAV_KEY = {
    leaveDetail: "myLeaves",
    approvalDetail: "approvals",
    ruleDetail: "rules"
  };

  return BaseController.extend("com.team.leavetracker.controller.App", {
    onInit: function () {
      this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
      this.getOwnerComponent().getEventBus().subscribe("route", "matched", this._onRouteMatched, this);
    },

    onExit: function () {
      this.getOwnerComponent().getEventBus().unsubscribe("route", "matched", this._onRouteMatched, this);
    },

    _onRouteMatched: function (sChannel, sEvent, oData) {
      this.byId("sideNav").setSelectedKey(NAV_KEY[oData.name] || oData.name);
    },

    onNavItemSelect: function (oEvent) {
      var sKey = oEvent.getParameter("item").getKey();
      if (sKey) {
        this.navTo(sKey);
      }
      if (this.getModel("device").getProperty("/system/phone")) {
        this.byId("toolPage").setSideExpanded(false);
      }
    },

    onToggleSideNav: function () {
      var oToolPage = this.byId("toolPage");
      oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
    },

    onHomePress: function () {
      this.navTo("home");
    },

    onRoleChange: function (oEvent) {
      this.getOwnerComponent().switchRole(oEvent.getParameter("selectedItem").getKey());
    },

    initials: function (sName) {
      if (!sName) {
        return "";
      }
      return sName.split(/\s+/).map(function (s) {
        return s.charAt(0);
      }).join("").slice(0, 2).toUpperCase();
    }
  });
});
