sap.ui.define([
  "com/team/leavetracker/controller/BaseController",
  "com/team/leavetracker/model/teamData",
  "com/team/leavetracker/model/availability",
  "sap/ui/model/json/JSONModel"
], function (BaseController, teamData, availability, JSONModel) {
  "use strict";

  var STRIP_DAYS = 14;
  var STATE_ICON = {
    Success: "sap-icon://sys-enter-2",
    Warning: "sap-icon://alert",
    Error: "sap-icon://error"
  };

  return BaseController.extend("com.team.leavetracker.controller.Availability", {
    onInit: function () {
      this.getView().setModel(new JSONModel({
        busy: false,
        date: availability.toIso(new Date()),
        working: true,
        nonWorkingText: "",
        summary: "",
        strip: [],
        coverage: [],
        available: [],
        absent: [],
        availableHeader: "",
        absentHeader: ""
      }), "av");
      this.getRouter().getRoute("availability").attachPatternMatched(this._onRouteMatched, this);
      this.getOwnerComponent().getEventBus().subscribe("user", "changed", this._reload, this);
    },

    onExit: function () {
      this.getOwnerComponent().getEventBus().unsubscribe("user", "changed", this._reload, this);
    },

    _onRouteMatched: function (oEvent) {
      var sDate = oEvent.getParameter("arguments").date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(sDate || "")) {
        sDate = availability.toIso(new Date());
      }
      this.getModel("av").setProperty("/date", sDate);
      this._reload();
    },

    // Loads fresh data (leave may have changed elsewhere), then renders the selected day.
    _reload: function () {
      var oAv = this.getModel("av");
      oAv.setProperty("/busy", true);
      this.getOwnerComponent().whenUserReady().then(function () {
        return teamData.load(this.getModel());
      }.bind(this)).then(function (oData) {
        this._oData = oData;
        this._render();
      }.bind(this)).catch(this.showError.bind(this)).finally(function () {
        oAv.setProperty("/busy", false);
      });
    },

    _calcInput: function () {
      var oData = this._oData;
      return {
        members: oData.members,
        subgroups: oData.subgroups,
        requests: oData.requests,
        holidaySet: oData.holidaySet,
        countPending: !oData.team || oData.team.countPendingInConcurrency !== false
      };
    },

    _render: function () {
      var oAv = this.getModel("av");
      var sDate = oAv.getProperty("/date");
      var oInput = this._calcInput();
      var oDay = availability.dayAvailability(sDate, oInput);
      var oUser = this.getUser();
      var mTypes = {};
      this._oData.leaveTypes.forEach(function (t) {
        mTypes[t.code] = t;
      });

      oAv.setProperty("/working", oDay.working);
      oAv.setProperty("/nonWorkingText", this._nonWorkingText(sDate));

      oAv.setProperty("/available", oDay.available.map(function (a) {
        return {
          name: a.member.displayName,
          info: a.halfDay ? this.getText("availability.halfDayIn") : "",
          infoState: a.halfDay ? "Warning" : "None"
        };
      }.bind(this)));

      oAv.setProperty("/absent", oDay.absent.map(function (a) {
        var oType = mTypes[a.request.type_code] || {};
        var bShowType = oUser.isManager || oType.isPublic || a.member.ID === oUser.memberId;
        var aInfo = [];
        if (a.halfDay) {
          aInfo.push(this.getText("leave.halfDay"));
        }
        if (a.pending) {
          aInfo.push(this.getText("status.Submitted"));
        }
        return {
          name: a.member.displayName,
          type: (bShowType ? oType.name : this.getText("leaveType.out")) + " · " +
            this.formatter.dateRange.call(this, a.request.startDate, a.request.endDate),
          info: aInfo.join(", "),
          infoState: a.pending ? "Warning" : "None"
        };
      }.bind(this)));

      var nIn = oDay.available.reduce(function (n, a) {
        return n + (a.halfDay ? 0.5 : 1);
      }, 0);
      oAv.setProperty("/availableHeader", this.getText("availability.availableHeader", [nIn]));
      oAv.setProperty("/absentHeader", this.getText("availability.absentHeader", [oDay.absent.length]));
      oAv.setProperty("/summary", this.getText("availability.summary", [nIn, oInput.members.length]));

      oAv.setProperty("/coverage", oDay.coverage.map(function (c) {
        return {
          name: c.subgroup.name,
          subtitle: this.getText("availability.minAvailable", [c.minAvailable]),
          statusText: this.getText("availability.coverageText", [c.available, c.total]),
          ratio: c.available + " / " + c.total,
          percent: c.total ? Math.round(c.available / c.total * 100) : 0,
          state: c.state,
          icon: STATE_ICON[c.state]
        };
      }.bind(this)));

      oAv.setProperty("/strip", this._buildStrip(sDate, oInput));
    },

    // Next 14 days starting today; risk days are those where a subgroup is at or below its minimum.
    _buildStrip: function (sSelected, oInput) {
      var aStrip = [];
      var sToday = availability.toIso(new Date());
      for (var i = 0; i < STRIP_DAYS; i++) {
        var sDay = availability.addDays(sToday, i);
        var oDay = availability.dayAvailability(sDay, oInput);
        var sState = "None";
        var sTooltip = this.getText("availability.stripOk");
        if (!oDay.working) {
          sTooltip = this._nonWorkingText(sDay);
        } else if (oDay.atRisk) {
          var bError = oDay.coverage.some(function (c) {
            return c.state === "Error";
          });
          sState = bError ? "Error" : "Warning";
          sTooltip = oDay.coverage.filter(function (c) {
            return c.state !== "Success";
          }).map(function (c) {
            return c.subgroup.name + ": " + c.available + "/" + c.total;
          }).join(", ");
        } else {
          sState = "Success";
        }
        aStrip.push({
          date: sDay,
          label: this.formatter.shortDay(sDay) + (sDay === sSelected ? " ●" : ""),
          state: sState,
          tooltip: sTooltip
        });
      }
      return aStrip;
    },

    _nonWorkingText: function (sDate) {
      var oHoliday = this._oData && this._oData.holidays.filter(function (h) {
        return h.date === sDate;
      })[0];
      return oHoliday
        ? this.getText("availability.holiday", [oHoliday.name])
        : this.getText("availability.weekend");
    },

    _go: function (sDate) {
      this.navTo("availability", { date: sDate }, true);
    },

    onDateChange: function (oEvent) {
      if (oEvent.getParameter("valid")) {
        this._go(oEvent.getParameter("value"));
      }
    },

    onPrevDay: function () {
      this._go(availability.addDays(this.getModel("av").getProperty("/date"), -1));
    },

    onNextDay: function () {
      this._go(availability.addDays(this.getModel("av").getProperty("/date"), 1));
    },

    onToday: function () {
      this._go(availability.toIso(new Date()));
    },

    onStripPress: function (oEvent) {
      this._go(oEvent.getSource().data("date"));
    }
  });
});
