sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/core/EventBus",
  "sap/ui/Device",
  "com/team/leavetracker/model/models"
], function (UIComponent, EventBus, Device, models) {
  "use strict";

  // Routes that only managers may open. Members are sent back to home.
  var MANAGER_ROUTES = ["approvals", "approvalDetail", "team", "rules", "ruleDetail", "periods"];

  return UIComponent.extend("com.team.leavetracker.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      this.setModel(models.createDeviceModel(), "device");
      this.setModel(models.createUserModel(), "user");
      this._oEventBus = new EventBus();

      this._pUserReady = this._resolveCurrentMember();

      var oRouter = this.getRouter();
      oRouter.attachRouteMatched(this._onRouteMatched, this);
      oRouter.initialize();
    },

    /**
     * Component-local event bus. Channel "user", event "changed" fires after a role switch
     * once the new member record is loaded.
     * @returns {sap.ui.core.EventBus} the event bus
     */
    getEventBus: function () {
      return this._oEventBus;
    },

    /**
     * @returns {string} CSS class for content density: compact on mouse devices, cozy on touch
     */
    getContentDensityClass: function () {
      return Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
    },

    /**
     * @returns {Promise} resolves once the user model has memberId and displayName
     */
    whenUserReady: function () {
      return this._pUserReady;
    },

    /**
     * Mock phase only: switch between the member and manager test users.
     * In Phase 3 the role comes from XSUAA and this goes away.
     * @param {string} sRole "member" or "manager"
     * @returns {Promise} resolves when the new user is loaded
     */
    switchRole: function (sRole) {
      var oUserModel = this.getModel("user");
      models.applyMockUser(oUserModel, sRole);
      this._pUserReady = this._resolveCurrentMember().then(function () {
        if (!oUserModel.getProperty("/isManager") && MANAGER_ROUTES.indexOf(this._sCurrentRoute) !== -1) {
          this.getRouter().navTo("home", {}, true);
        }
        this._oEventBus.publish("user", "changed");
      }.bind(this));
      return this._pUserReady;
    },

    /**
     * Looks up the Members record whose userId matches the logged-in user.
     * This stays the same when userId comes from XSUAA instead of the mock.
     * @returns {Promise} resolves when the lookup is done
     * @private
     */
    _resolveCurrentMember: function () {
      var oUserModel = this.getModel("user");
      var oBinding = this.getModel().bindList("/Members", null, null, null, {
        $filter: "userId eq '" + oUserModel.getProperty("/userId").replace(/'/g, "''") + "'",
        $select: "ID,displayName,team_ID"
      });
      return oBinding.requestContexts(0, 1).then(function (aContexts) {
        var oMember = aContexts.length ? aContexts[0].getObject() : null;
        oUserModel.setProperty("/memberId", oMember ? oMember.ID : null);
        oUserModel.setProperty("/teamId", oMember ? oMember.team_ID : null);
        oUserModel.setProperty("/displayName", oMember ? oMember.displayName : oUserModel.getProperty("/userId"));
      });
    },

    _onRouteMatched: function (oEvent) {
      var sRoute = oEvent.getParameter("name");
      this._sCurrentRoute = sRoute;
      if (MANAGER_ROUTES.indexOf(sRoute) !== -1 && !this.getModel("user").getProperty("/isManager")) {
        this.getRouter().navTo("home", {}, true);
        return;
      }
      this._oEventBus.publish("route", "matched", { name: sRoute });
    }
  });
});
