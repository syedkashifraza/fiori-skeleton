sap.ui.define([
  "com/team/leavetracker/controller/BaseController",
  "com/team/leavetracker/model/teamData",
  "com/team/leavetracker/model/availability",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (BaseController, teamData, availability, JSONModel, MessageBox, MessageToast) {
  "use strict";

  return BaseController.extend("com.team.leavetracker.controller.Periods", {
    onInit: function () {
      this.getView().setModel(new JSONModel({ specialDates: [] }), "pv");
      this.getView().setModel(new JSONModel({}), "pd");
      this.getRouter().getRoute("periods").attachPatternMatched(this._refresh, this);
    },

    _refresh: function () {
      this.byId("criticalTable").getBinding("items").refresh();
      this.byId("holidaysTable").getBinding("items").refresh();
    },

    // Rebuilds the overview calendar whenever either table has fresh data.
    onDataReceived: function () {
      var oModel = this.getModel();
      Promise.all([
        teamData.readAll(oModel, "/CriticalPeriods"),
        teamData.readAll(oModel, "/Holidays")
      ]).then(function (a) {
        var aDates = a[0].map(function (p) {
          return {
            start: availability.parseIso(p.startDate),
            end: availability.parseIso(p.endDate),
            type: "Type06",
            tooltip: p.name
          };
        }).concat(a[1].map(function (h) {
          return { start: availability.parseIso(h.date), end: null, type: "NonWorking", tooltip: h.name };
        }));
        this.getModel("pv").setProperty("/specialDates", aDates);
      }.bind(this)).catch(this.showError.bind(this));
    },

    onAddCritical: function () {
      this._openDialog("critical");
    },

    onAddHoliday: function () {
      this._openDialog("holiday");
    },

    _openDialog: function (sMode) {
      this.getModel("pd").setData({
        mode: sMode,
        title: this.getText(sMode === "critical" ? "periods.addCritical" : "periods.addHoliday"),
        name: "",
        start: null,
        end: null,
        reason: "",
        location: "HQ",
        nameState: "None",
        dateState: "None"
      });
      if (!this._pDialog) {
        this._pDialog = this.loadFragment({ name: "com.team.leavetracker.view.fragment.PeriodDialog" });
      }
      this._pDialog.then(function (oDialog) {
        oDialog.open();
      });
    },

    onSavePeriod: function () {
      var oPd = this.getModel("pd");
      var d = oPd.getData();
      oPd.setProperty("/nameState", d.name ? "None" : "Error");
      oPd.setProperty("/dateState", d.start ? "None" : "Error");
      if (!d.name || !d.start) {
        return;
      }
      var oCreated;
      if (d.mode === "critical") {
        oCreated = this.byId("criticalTable").getBinding("items").create({
          team_ID: this.getOwnerComponent().getModel("user").getProperty("/teamId"),
          name: d.name,
          startDate: availability.toIso(d.start),
          endDate: availability.toIso(d.end || d.start),
          reason: d.reason || null
        });
      } else {
        oCreated = this.byId("holidaysTable").getBinding("items").create({
          name: d.name,
          date: availability.toIso(d.start),
          location: d.location || null
        });
      }
      this.byId("periodDialog").close();
      oCreated.created().then(function () {
        MessageToast.show(this.getText("periods.saved"));
        this._refresh();
      }.bind(this)).catch(this.showError.bind(this));
    },

    onClosePeriodDialog: function () {
      this.byId("periodDialog").close();
    },

    onDelete: function (oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      MessageBox.confirm(this.getText("periods.deleteConfirm", [oContext.getProperty("name")]), {
        onClose: function (sAction) {
          if (sAction !== MessageBox.Action.OK) {
            return;
          }
          oContext.delete().then(function () {
            MessageToast.show(this.getText("periods.deleted"));
            this.onDataReceived();
          }.bind(this)).catch(this.showError.bind(this));
        }.bind(this)
      });
    }
  });
});
