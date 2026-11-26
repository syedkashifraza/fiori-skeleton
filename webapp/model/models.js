sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/ui/Device"
], function (JSONModel, Device) {
  "use strict";

  // Mock phase only: test users that exist in localService/mainService/data/Members.json.
  // Phase 3 replaces this with the logged-in user from XSUAA (e.g. /user-api/currentUser).
  var MOCK_USERS = {
    member: { userId: "priya.sharma@example.com", role: "member" },
    manager: { userId: "jonas.weber@example.com", role: "manager" }
  };

  function getRoleFromUrl() {
    var sRole = new URLSearchParams(window.location.search).get("role");
    return sRole === "manager" ? "manager" : "member";
  }

  return {
    createDeviceModel: function () {
      var oModel = new JSONModel(Device);
      oModel.setDefaultBindingMode("OneWay");
      return oModel;
    },

    /**
     * The "user" model: who is logged in and what they may do.
     * Initial role comes from the URL (?role=manager), default is member.
     * memberId, teamId and displayName are filled by the Component from the Members entity.
     * @returns {sap.ui.model.json.JSONModel} the user model
     */
    createUserModel: function () {
      var oModel = new JSONModel({
        isMock: true,
        userId: "",
        role: "",
        isManager: false,
        memberId: null,
        teamId: null,
        displayName: ""
      });
      this.applyMockUser(oModel, getRoleFromUrl());
      return oModel;
    },

    applyMockUser: function (oModel, sRole) {
      var oUser = MOCK_USERS[sRole] || MOCK_USERS.member;
      oModel.setProperty("/userId", oUser.userId);
      oModel.setProperty("/role", oUser.role);
      oModel.setProperty("/isManager", oUser.role === "manager");
    }
  };
});
