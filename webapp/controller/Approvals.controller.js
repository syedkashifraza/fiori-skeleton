sap.ui.define([
  "com/team/leavetracker/controller/BaseController",
  "com/team/leavetracker/model/teamData",
  "com/team/leavetracker/model/availability",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (BaseController, teamData, availability, JSONModel, MessageToast) {
  "use strict";

  return BaseController.extend("com.team.leavetracker.controller.Approvals", {
    onInit: function () {
      this.getView().setModel(new JSONModel({
        layout: "OneColumn",
        count: 0,
        busy: false,
        overlaps: [],
        coverage: []
      }), "appr");
      this.getView().setModel(new JSONModel({}), "dec");
      this.getRouter().getRoute("approvals").attachPatternMatched(this._onListMatched, this);
      this.getRouter().getRoute("approvalDetail").attachPatternMatched(this._onDetailMatched, this);
    },

    _onListMatched: function () {
      this.getModel("appr").setProperty("/layout", "OneColumn");
      this.byId("approvalsList").removeSelections(true);
      this.byId("approvalsList").getBinding("items").refresh();
    },

    _onDetailMatched: function (oEvent) {
      var sId = oEvent.getParameter("arguments").id;
      var oAppr = this.getModel("appr");
      if (oAppr.getProperty("/layout") === "OneColumn") {
        oAppr.setProperty("/layout", "TwoColumnsMidExpanded");
      }
      var oPage = this.byId("approvalDetailPage");
      oPage.bindElement({ path: "/LeaveRequests(" + sId + ")" });
      this._loadContext();
    },

    // Who else is out during the request, and subgroup coverage on its worst day.
    _loadContext: function () {
      var oAppr = this.getModel("appr");
      var oContext = this.byId("approvalDetailPage").getBindingContext();
      if (!oContext) {
        return;
      }
      oAppr.setProperty("/busy", true);
      Promise.all([
        oContext.requestObject(),
        teamData.load(this.getModel())
      ]).then(function (a) {
        var oReq = a[0];
        var oData = a[1];
        if (!oReq) {
          return;
        }
        var mNames = {};
        oData.members.forEach(function (m) {
          mNames[m.ID] = m.displayName;
        });
        oAppr.setProperty("/overlaps", oData.requests.filter(function (r) {
          return r.ID !== oReq.ID && r.member_ID !== oReq.member_ID &&
            r.startDate <= oReq.endDate && r.endDate >= oReq.startDate;
        }).map(function (r) {
          return {
            name: mNames[r.member_ID],
            period: this.formatter.dateRange.call(this, r.startDate, r.endDate),
            info: this.formatter.statusText.call(this, r.status),
            infoState: this.formatter.statusState(r.status)
          };
        }.bind(this)));

        // Coverage if this request were approved: find the worst working day per subgroup
        var oInput = {
          members: oData.members,
          subgroups: oData.subgroups,
          requests: oData.requests.filter(function (r) {
            return r.ID !== oReq.ID;
          }).concat([Object.assign({}, oReq, { status: "Approved" })]),
          holidaySet: oData.holidaySet,
          countPending: true
        };
        var aDays = [];
        for (var s = oReq.startDate; s <= oReq.endDate; s = availability.addDays(s, 1)) {
          aDays.push(s);
        }
        var mWorst = {};
        aDays.forEach(function (sDay) {
          availability.dayAvailability(sDay, oInput).coverage.forEach(function (c) {
            var w = mWorst[c.subgroup.ID];
            if (!w || c.available < w.available) {
              mWorst[c.subgroup.ID] = Object.assign({ date: sDay }, c);
            }
          });
        });
        oAppr.setProperty("/coverage", oData.subgroups.map(function (g) {
          var c = mWorst[g.ID];
          return {
            name: g.name,
            text: c ? this.getText("approvals.coverageText", [c.available, c.total, c.minAvailable,
              this.formatter.shortDay(c.date)]) : "",
            state: c ? c.state : "None",
            stateText: c ? this.getText("approvals.coverageState." + c.state) : ""
          };
        }.bind(this)));
      }.bind(this)).catch(this.showError.bind(this)).finally(function () {
        oAppr.setProperty("/busy", false);
      });
    },

    onListReceived: function (oEvent) {
      this.getModel("appr").setProperty("/count", oEvent.getSource().getCount() || 0);
    },

    onRefresh: function () {
      this.byId("approvalsList").getBinding("items").refresh();
    },

    onSelect: function (oEvent) {
      var oItem = oEvent.getParameter("listItem");
      this.navTo("approvalDetail", { id: oItem.getBindingContext().getProperty("ID") });
    },

    onCloseDetail: function () {
      this.navTo("approvals");
    },

    onToggleFullScreen: function () {
      var oAppr = this.getModel("appr");
      oAppr.setProperty("/layout", oAppr.getProperty("/layout") === "MidColumnFullScreen"
        ? "TwoColumnsMidExpanded" : "MidColumnFullScreen");
    },

    // ----- Approve / reject -----

    onApprove: function () {
      this._openDecision("approve");
    },

    onReject: function () {
      this._openDecision("reject");
    },

    _openDecision: function (sAction) {
      var bReject = sAction === "reject";
      var sName = this.byId("approvalDetailPage").getBindingContext().getProperty("member/displayName");
      this.getModel("dec").setData({
        action: sAction,
        title: this.getText(bReject ? "approvals.rejectTitle" : "approvals.approveTitle"),
        text: this.getText(bReject ? "approvals.rejectText" : "approvals.approveText", [sName]),
        noteLabel: this.getText(bReject ? "approvals.reason" : "approvals.note"),
        noteRequired: bReject,
        note: "",
        noteState: "None",
        state: bReject ? "Error" : "Success",
        confirmText: this.getText(bReject ? "approvals.reject" : "approvals.approve"),
        buttonType: bReject ? "Reject" : "Accept"
      });
      if (!this._pDecisionDialog) {
        this._pDecisionDialog = this.loadFragment({ name: "com.team.leavetracker.view.fragment.DecisionDialog" });
      }
      this._pDecisionDialog.then(function (oDialog) {
        oDialog.open();
      });
    },

    onConfirmDecision: function () {
      var oDec = this.getModel("dec");
      var sAction = oDec.getProperty("/action");
      var sNote = (oDec.getProperty("/note") || "").trim();
      if (oDec.getProperty("/noteRequired") && !sNote) {
        oDec.setProperty("/noteState", "Error");
        return;
      }
      this.byId("decisionDialog").close();
      var oContext = this.byId("approvalDetailPage").getBindingContext();
      var oAppr = this.getModel("appr");
      oAppr.setProperty("/busy", true);
      this.callAction(oContext, sAction, { note: sNote || null }).then(function () {
        MessageToast.show(this.getText(sAction === "approve" ? "approvals.approved" : "approvals.rejected"));
        this.navTo("approvals");
      }.bind(this)).catch(this.showError.bind(this)).finally(function () {
        oAppr.setProperty("/busy", false);
      });
    },

    onCancelDecision: function () {
      this.byId("decisionDialog").close();
    }
  });
});
