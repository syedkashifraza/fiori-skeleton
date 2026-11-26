sap.ui.define([
  "com/team/leavetracker/controller/BaseController",
  "com/team/leavetracker/model/teamData",
  "com/team/leavetracker/model/availability",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast"
], function (BaseController, teamData, availability, JSONModel, Filter, FilterOperator, MessageToast) {
  "use strict";

  return BaseController.extend("com.team.leavetracker.controller.MyLeaves", {
    onInit: function () {
      this.getView().setModel(new JSONModel({
        filter: "upcoming",
        count: 0,
        year: new Date().getFullYear(),
        allowance: 0,
        used: 0,
        planned: 0,
        remaining: 0,
        usedPercent: 0,
        usedText: ""
      }), "ml");
      this.getView().setModel(new JSONModel({}), "req");
      this.getRouter().getRoute("myLeaves").attachPatternMatched(this._refresh, this);
      this.getOwnerComponent().getEventBus().subscribe("user", "changed", this._refresh, this);
    },

    onExit: function () {
      this.getOwnerComponent().getEventBus().unsubscribe("user", "changed", this._refresh, this);
    },

    _refresh: function () {
      this.getOwnerComponent().whenUserReady().then(function () {
        this._applyFilter();
        this._loadBalance();
      }.bind(this));
    },

    _applyFilter: function () {
      var sToday = availability.toIso(new Date());
      var sFilter = this.getModel("ml").getProperty("/filter");
      var aFilters = [new Filter("member_ID", FilterOperator.EQ, this.getUser().memberId)];
      if (sFilter === "upcoming") {
        aFilters.push(new Filter("endDate", FilterOperator.GE, sToday));
      } else if (sFilter === "past") {
        aFilters.push(new Filter("endDate", FilterOperator.LT, sToday));
      }
      var oBinding = this.byId("myLeavesTable").getBinding("items");
      oBinding.filter(new Filter({ filters: aFilters, and: true }));
      if (oBinding.isSuspended()) {
        oBinding.resume();
      }
      oBinding.attachEventOnce("dataReceived", function () {
        this.getModel("ml").setProperty("/count", oBinding.getCount() || 0);
      }, this);
    },

    /**
     * Allowance for the current year: used = approved leave already taken,
     * planned = approved or pending leave still ahead. Only types that count against allowance.
     */
    _loadBalance: function () {
      var oUser = this.getUser();
      var oMl = this.getModel("ml");
      var nYear = new Date().getFullYear();
      var sToday = availability.toIso(new Date());
      var oModel = this.getModel();
      Promise.all([
        teamData.readAll(oModel, "/Members", { $select: "ID,annualAllowance" },
          [new Filter("ID", FilterOperator.EQ, oUser.memberId)]),
        teamData.readAll(oModel, "/LeaveRequests", { $expand: "type($select=code,countsAgainstAllowance)" }, [
          new Filter("member_ID", FilterOperator.EQ, oUser.memberId),
          new Filter("startDate", FilterOperator.GE, nYear + "-01-01"),
          new Filter("startDate", FilterOperator.LE, nYear + "-12-31")
        ])
      ]).then(function (a) {
        var nAllowance = Number(a[0][0] ? a[0][0].annualAllowance : 0);
        var nUsed = 0;
        var nPlanned = 0;
        a[1].forEach(function (r) {
          if (!r.type || !r.type.countsAgainstAllowance) {
            return;
          }
          var nDays = Number(r.workingDays) || 0;
          if (r.status === "Approved" && r.endDate < sToday) {
            nUsed += nDays;
          } else if (r.status === "Approved" || r.status === "Submitted") {
            nPlanned += nDays;
          }
        });
        oMl.setProperty("/year", nYear);
        oMl.setProperty("/allowance", nAllowance);
        oMl.setProperty("/used", nUsed);
        oMl.setProperty("/planned", nPlanned);
        oMl.setProperty("/remaining", nAllowance - nUsed - nPlanned);
        oMl.setProperty("/usedPercent", nAllowance ? Math.min(100, Math.round((nUsed + nPlanned) / nAllowance * 100)) : 0);
        oMl.setProperty("/usedText", this.getText("myLeaves.usedOf", [nUsed + nPlanned, nAllowance]));
      }.bind(this)).catch(this.showError.bind(this));
    },

    onFilterChange: function () {
      this._applyFilter();
    },

    onRowPress: function (oEvent) {
      this.navTo("leaveDetail", { id: oEvent.getSource().getBindingContext().getProperty("ID") });
    },

    // ----- New request dialog -----

    onNewRequest: function () {
      var oReq = this.getModel("req");
      oReq.setData({ busy: true, types: [], typeCode: "VAC", start: null, end: null, startHalfDay: false,
        endHalfDay: false, comment: "", workingDays: 0, minDate: new Date(), dateState: "None",
        othersOut: 0, othersOutText: "" });
      this._openRequestDialog().then(function (oDialog) {
        oDialog.open();
        return teamData.load(this.getModel());
      }.bind(this)).then(function (oData) {
        this._oTeamData = oData;
        oReq.setProperty("/types", oData.leaveTypes);
        oReq.setProperty("/busy", false);
      }.bind(this)).catch(this.showError.bind(this));
    },

    _openRequestDialog: function () {
      if (!this._pRequestDialog) {
        this._pRequestDialog = this.loadFragment({
          name: "com.team.leavetracker.view.fragment.LeaveRequestDialog"
        });
      }
      return this._pRequestDialog;
    },

    // Recalculates working days and lists colleagues who are also out in that range.
    onRequestChange: function () {
      var oReq = this.getModel("req");
      var oStart = oReq.getProperty("/start");
      var oEnd = oReq.getProperty("/end") || oStart;
      if (!oStart || !this._oTeamData) {
        oReq.setProperty("/workingDays", 0);
        oReq.setProperty("/othersOutText", "");
        return;
      }
      oReq.setProperty("/dateState", "None");
      var sStart = availability.toIso(oStart);
      var sEnd = availability.toIso(oEnd);
      oReq.setProperty("/workingDays", availability.countWorkingDays(sStart, sEnd,
        oReq.getProperty("/startHalfDay"), oReq.getProperty("/endHalfDay"), this._oTeamData.holidaySet));

      var sMe = this.getUser().memberId;
      var mNames = {};
      this._oTeamData.members.forEach(function (m) {
        mNames[m.ID] = m.displayName;
      });
      var aOthers = [];
      this._oTeamData.requests.forEach(function (r) {
        if (r.member_ID !== sMe && r.startDate <= sEnd && r.endDate >= sStart && aOthers.indexOf(mNames[r.member_ID]) === -1) {
          aOthers.push(mNames[r.member_ID]);
        }
      });
      oReq.setProperty("/othersOut", aOthers.length);
      oReq.setProperty("/othersOutText", aOthers.length
        ? this.getText("request.othersOut", [aOthers.join(", ")])
        : this.getText("request.nobodyElseOut"));
    },

    onSaveRequest: function (oEvent) {
      var bSubmit = oEvent.getSource().data("submit") === "true";
      var oReq = this.getModel("req");
      var oStart = oReq.getProperty("/start");
      if (!oStart) {
        oReq.setProperty("/dateState", "Error");
        return;
      }
      var oEnd = oReq.getProperty("/end") || oStart;
      var oBinding = this.byId("myLeavesTable").getBinding("items");
      var oContext = oBinding.create({
        member_ID: this.getUser().memberId,
        type_code: oReq.getProperty("/typeCode"),
        startDate: availability.toIso(oStart),
        endDate: availability.toIso(oEnd),
        startHalfDay: oReq.getProperty("/startHalfDay"),
        endHalfDay: oReq.getProperty("/endHalfDay"),
        workingDays: oReq.getProperty("/workingDays"),
        comment: oReq.getProperty("/comment") || null,
        status: "Draft"
      });
      oReq.setProperty("/busy", true);
      oContext.created().then(function () {
        return bSubmit ? this.callAction(oContext, "submit") : null;
      }.bind(this)).then(function () {
        MessageToast.show(this.getText(bSubmit ? "request.submitted" : "request.draftSaved"));
        this.byId("leaveRequestDialog").close();
        this._refresh();
      }.bind(this)).catch(this.showError.bind(this)).finally(function () {
        oReq.setProperty("/busy", false);
      });
    },

    onCloseRequestDialog: function () {
      this.byId("leaveRequestDialog").close();
    },

    onRequestDialogAfterClose: function () {
      this._oTeamData = null;
    }
  });
});
