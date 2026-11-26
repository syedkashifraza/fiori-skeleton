sap.ui.define([
  "com/team/leavetracker/controller/BaseController",
  "com/team/leavetracker/model/teamData",
  "com/team/leavetracker/model/availability",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (BaseController, teamData, availability, JSONModel, MessageToast) {
  "use strict";

  var NEUTRAL_COLOR = "#6A6D70";
  var TYPE_CRITICAL = "Type06";
  var TYPE_BLACKOUT = "Type02";

  return BaseController.extend("com.team.leavetracker.controller.Calendar", {
    onInit: function () {
      this.getView().setModel(new JSONModel({
        busy: false,
        title: "",
        startDate: new Date(),
        subgroup: "",
        subgroups: [],
        rows: [],
        specialDates: [],
        legendDays: [],
        legendTypes: [],
        showLegend: true
      }), "cal");
      this.getRouter().getRoute("calendar").attachPatternMatched(this._load, this);
      this.getOwnerComponent().getEventBus().subscribe("user", "changed", this._load, this);
    },

    onExit: function () {
      this.getOwnerComponent().getEventBus().unsubscribe("user", "changed", this._load, this);
    },

    _load: function () {
      var oCal = this.getModel("cal");
      oCal.setProperty("/busy", true);
      this.getOwnerComponent().whenUserReady().then(function () {
        return teamData.load(this.getModel());
      }.bind(this)).then(function (oData) {
        this._oData = oData;
        oCal.setProperty("/title", oData.team ? oData.team.name : "");
        oCal.setProperty("/subgroups", [{ key: "", text: this.getText("calendar.allMembers") }].concat(
          oData.subgroups.map(function (g) {
            return { key: g.ID, text: g.name };
          })));
        oCal.setProperty("/specialDates", this._buildSpecialDates(oData));
        oCal.setProperty("/legendDays", [
          { text: this.getText("calendar.legendHoliday"), type: "NonWorking" },
          { text: this.getText("calendar.legendCritical"), type: TYPE_CRITICAL },
          { text: this.getText("calendar.legendBlackout"), type: TYPE_BLACKOUT }
        ]);
        oCal.setProperty("/legendTypes", this._buildLegendTypes(oData));
        this._buildRows();
      }.bind(this)).catch(this.showError.bind(this)).finally(function () {
        oCal.setProperty("/busy", false);
      });
    },

    /**
     * Critical periods used by an active BLACKOUT rule are shown as blackout, others as critical.
     * Holidays are non-working days.
     * @param {object} oData loaded team data
     * @returns {object[]} special dates
     */
    _buildSpecialDates: function (oData) {
      var aBlackoutIds = oData.rules.filter(function (r) {
        return r.ruleType === "BLACKOUT";
      }).map(function (r) {
        return r.criticalPeriod_ID;
      });
      var aDates = oData.holidays.map(function (h) {
        return { start: availability.parseIso(h.date), end: null, type: "NonWorking", tooltip: h.name };
      });
      oData.criticalPeriods.forEach(function (p) {
        aDates.push({
          start: availability.parseIso(p.startDate),
          end: availability.parseIso(p.endDate),
          type: aBlackoutIds.indexOf(p.ID) !== -1 ? TYPE_BLACKOUT : TYPE_CRITICAL,
          tooltip: p.name + (p.reason ? ": " + p.reason : "")
        });
      });
      return aDates;
    },

    _buildLegendTypes: function (oData) {
      var bManager = this.getUser().isManager;
      var aTypes = oData.leaveTypes.filter(function (t) {
        return bManager || t.isPublic;
      }).map(function (t) {
        return { text: t.name, color: t.color };
      });
      if (!bManager) {
        aTypes.push({ text: this.getText("leaveType.out"), color: NEUTRAL_COLOR });
      }
      return aTypes;
    },

    _buildRows: function () {
      var oData = this._oData;
      var oUser = this.getUser();
      var sSubgroup = this.getModel("cal").getProperty("/subgroup");
      var mTypes = {};
      oData.leaveTypes.forEach(function (t) {
        mTypes[t.code] = t;
      });
      var mGroupsOf = {};
      oData.subgroups.forEach(function (g) {
        g.memberIds.forEach(function (id) {
          (mGroupsOf[id] = mGroupsOf[id] || []).push(g.name);
        });
      });
      var oSelectedGroup = oData.subgroups.filter(function (g) {
        return g.ID === sSubgroup;
      })[0];

      var aRows = oData.members.filter(function (m) {
        return !oSelectedGroup || oSelectedGroup.memberIds.indexOf(m.ID) !== -1;
      }).map(function (m) {
        var bOwn = m.ID === oUser.memberId;
        return {
          name: m.displayName + (bOwn ? " " + this.getText("calendar.you") : ""),
          subtitle: (mGroupsOf[m.ID] || []).join(", "),
          appointments: oData.requests.filter(function (r) {
            return r.member_ID === m.ID;
          }).map(function (r) {
            var oType = mTypes[r.type_code] || {};
            var bShowType = oUser.isManager || bOwn || oType.isPublic;
            var bPending = r.status === "Submitted";
            return {
              id: r.ID,
              memberId: m.ID,
              status: r.status,
              start: this._appointmentStart(r),
              end: this._appointmentEnd(r),
              title: bShowType ? oType.name : this.getText("leaveType.out"),
              text: (bPending ? this.getText("status.Submitted") + " · " : "") +
                this.getText("calendar.days", [r.workingDays]),
              icon: bPending ? "sap-icon://pending" : "",
              color: bShowType ? oType.color : NEUTRAL_COLOR,
              pending: bPending
            };
          }.bind(this))
        };
      }.bind(this));
      this.getModel("cal").setProperty("/rows", aRows);
    },

    // Half days: a half day at the start begins at 13:00, a half day at the end ends at 12:00.
    _appointmentStart: function (r) {
      var d = availability.parseIso(r.startDate);
      d.setHours(r.startHalfDay ? 13 : 0, 0, 0, 0);
      return d;
    },

    _appointmentEnd: function (r) {
      var d = availability.parseIso(r.endDate);
      if (r.endHalfDay) {
        d.setHours(12, 0, 0, 0);
      } else {
        d.setHours(23, 59, 59, 0);
      }
      return d;
    },

    onSubgroupChange: function () {
      this._buildRows();
    },

    onToggleLegend: function () {
      var oCal = this.getModel("cal");
      oCal.setProperty("/showLegend", !oCal.getProperty("/showLegend"));
    },

    /**
     * Own leave opens its detail page; managers open pending requests in the approval inbox.
     * @param {sap.ui.base.Event} oEvent appointmentSelect event
     */
    onAppointmentSelect: function (oEvent) {
      var oAppointment = oEvent.getParameter("appointment");
      if (!oAppointment) {
        return;
      }
      var oApp = oAppointment.getBindingContext("cal").getObject();
      var oUser = this.getUser();
      if (oApp.memberId === oUser.memberId) {
        this.navTo("leaveDetail", { id: oApp.id });
      } else if (oUser.isManager && oApp.status === "Submitted") {
        this.navTo("approvalDetail", { id: oApp.id });
      } else {
        MessageToast.show(oAppointment.getTitle() + " · " + oAppointment.getText());
      }
    }
  });
});
