sap.ui.define([
  "com/team/leavetracker/controller/BaseController",
  "com/team/leavetracker/model/formatter",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/format/DateFormat"
], function (BaseController, formatter, JSONModel, Filter, FilterOperator, DateFormat) {
  "use strict";

  var oIsoDate = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });

  return BaseController.extend("com.team.leavetracker.controller.Home", {
    formatter: formatter,

    onInit: function () {
      this.getView().setModel(new JSONModel({
        todayText: "",
        outTodayCount: "0",
        myUpcomingCount: "0",
        pendingCount: "0"
      }), "view");

      this.getRouter().getRoute("home").attachPatternMatched(this._refresh, this);
      this.getOwnerComponent().getEventBus().subscribe("user", "changed", this._refresh, this);
    },

    onExit: function () {
      this.getOwnerComponent().getEventBus().unsubscribe("user", "changed", this._refresh, this);
    },

    _refresh: function () {
      this.getOwnerComponent().whenUserReady().then(this._bindData.bind(this));
    },

    _bindData: function () {
      var oToday = new Date();
      var sToday = oIsoDate.format(oToday);
      var oViewModel = this.getModel("view");
      var oUser = this.getModel("user");

      oViewModel.setProperty("/todayText", DateFormat.getDateInstance({ style: "full" }).format(oToday));

      // Out today: approved leave that covers today
      this._applyFilters(this.byId("outTodayList"), [
        new Filter("status", FilterOperator.EQ, "Approved"),
        new Filter("startDate", FilterOperator.LE, sToday),
        new Filter("endDate", FilterOperator.GE, sToday)
      ]);

      // My upcoming leave: anything not finished, rejected or cancelled
      this._applyFilters(this.byId("myUpcomingList"), [
        new Filter("member_ID", FilterOperator.EQ, oUser.getProperty("/memberId")),
        new Filter("endDate", FilterOperator.GE, sToday),
        new Filter({
          filters: ["Draft", "Submitted", "Approved"].map(function (s) {
            return new Filter("status", FilterOperator.EQ, s);
          }),
          and: false
        })
      ]);

      if (oUser.getProperty("/isManager")) {
        var oPending = this.getModel().bindList("/LeaveRequests", null, null,
          [new Filter("status", FilterOperator.EQ, "Submitted")], { $count: true, $select: "ID" });
        oPending.requestContexts(0, 1).then(function () {
          oViewModel.setProperty("/pendingCount", String(oPending.getCount() || 0));
        });
      }
    },

    _applyFilters: function (oList, aFilters) {
      var oBinding = oList.getBinding("items");
      oBinding.filter(new Filter({ filters: aFilters, and: true }));
      if (oBinding.isSuspended()) {
        oBinding.resume();
      }
    },

    onOutTodayReceived: function (oEvent) {
      this.getModel("view").setProperty("/outTodayCount", String(oEvent.getSource().getCount() || 0));
    },

    onMyUpcomingReceived: function (oEvent) {
      this.getModel("view").setProperty("/myUpcomingCount", String(oEvent.getSource().getCount() || 0));
    },

    formatDateRange: function (sStart, sEnd) {
      if (!sStart) {
        return "";
      }
      return sStart === sEnd ? sStart : sStart + " – " + sEnd;
    },

    onOpenAvailability: function () {
      this.navTo("availability");
    },

    onOpenMyLeaves: function () {
      this.navTo("myLeaves");
    },

    onOpenApprovals: function () {
      this.navTo("approvals");
    }
  });
});
