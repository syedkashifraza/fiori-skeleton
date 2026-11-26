sap.ui.define([
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function (Filter, FilterOperator) {
  "use strict";

  var MAX_ROWS = 1000;

  function readAll(oModel, sPath, oParams, aFilters) {
    var oBinding = oModel.bindList(sPath, null, null, aFilters || null, oParams || {});
    return oBinding.requestContexts(0, MAX_ROWS).then(function (aContexts) {
      var aData = aContexts.map(function (c) {
        return c.getObject();
      });
      oBinding.destroy();
      return aData;
    });
  }

  /**
   * Loads everything the calendar, availability and editor views need as plain objects.
   * Leave requests are limited to Approved and Submitted (what makes someone "out").
   * @param {sap.ui.model.odata.v4.ODataModel} oModel the OData model
   * @returns {Promise<object>} { team, members, subgroups, requests, leaveTypes, criticalPeriods, holidays, rules, holidaySet }
   */
  function load(oModel) {
    return Promise.all([
      readAll(oModel, "/Teams", { $select: "ID,name,countPendingInConcurrency" }),
      readAll(oModel, "/Members", { $orderby: "displayName" }, [new Filter("active", FilterOperator.EQ, true)]),
      readAll(oModel, "/Subgroups", { $orderby: "name", $expand: "members($select=ID,member_ID)" }),
      readAll(oModel, "/LeaveRequests", { $orderby: "startDate" }, [new Filter({
        filters: [
          new Filter("status", FilterOperator.EQ, "Approved"),
          new Filter("status", FilterOperator.EQ, "Submitted")
        ],
        and: false
      })]),
      readAll(oModel, "/LeaveTypes"),
      readAll(oModel, "/CriticalPeriods", { $orderby: "startDate" }),
      readAll(oModel, "/Holidays", { $orderby: "date" }),
      readAll(oModel, "/Rules", null, [new Filter("active", FilterOperator.EQ, true)])
    ]).then(function (a) {
      var aSubgroups = a[2].map(function (g) {
        return Object.assign({}, g, {
          memberIds: (g.members || []).map(function (l) {
            return l.member_ID;
          })
        });
      });
      return {
        team: a[0][0] || null,
        members: a[1],
        subgroups: aSubgroups,
        requests: a[3],
        leaveTypes: a[4],
        criticalPeriods: a[5],
        holidays: a[6],
        rules: a[7],
        holidaySet: new Set(a[6].map(function (h) {
          return h.date;
        }))
      };
    });
  }

  return {
    load: load,
    readAll: readAll
  };
});
