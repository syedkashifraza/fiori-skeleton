sap.ui.define([], function () {
  "use strict";

  /*
   * Pure date and availability helpers, with no UI5 dependencies.
   * Kept free of UI5 APIs so the same logic can move into the mock server's
   * getAvailability handler and later into the CAP service (design section 4).
   * All dates are ISO strings "YYYY-MM-DD" in local time.
   */

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toIso(oDate) {
    return oDate.getFullYear() + "-" + pad(oDate.getMonth() + 1) + "-" + pad(oDate.getDate());
  }

  function parseIso(sIso) {
    var a = sIso.split("-");
    return new Date(Number(a[0]), Number(a[1]) - 1, Number(a[2]));
  }

  function addDays(sIso, n) {
    var d = parseIso(sIso);
    d.setDate(d.getDate() + n);
    return toIso(d);
  }

  function isWeekend(sIso) {
    var day = parseIso(sIso).getDay();
    return day === 0 || day === 6;
  }

  function isWorkingDay(sIso, oHolidaySet) {
    return !isWeekend(sIso) && !oHolidaySet.has(sIso);
  }

  /**
   * Working days between two dates (inclusive), skipping weekends and holidays.
   * A half day at the start or end counts 0.5.
   * @param {string} sStart start date
   * @param {string} sEnd end date
   * @param {boolean} bStartHalf start day is a half day
   * @param {boolean} bEndHalf end day is a half day
   * @param {Set<string>} oHolidaySet holiday dates
   * @returns {number} working days
   */
  function countWorkingDays(sStart, sEnd, bStartHalf, bEndHalf, oHolidaySet) {
    if (!sStart || !sEnd || sEnd < sStart) {
      return 0;
    }
    var n = 0;
    for (var s = sStart; s <= sEnd; s = addDays(s, 1)) {
      if (isWorkingDay(s, oHolidaySet)) {
        n += 1;
      }
    }
    if (n > 0 && bStartHalf && isWorkingDay(sStart, oHolidaySet)) {
      n -= 0.5;
    }
    if (n > 0 && bEndHalf && isWorkingDay(sEnd, oHolidaySet) && !(sStart === sEnd && bStartHalf)) {
      n -= 0.5;
    }
    return n;
  }

  /**
   * @param {object} oRequest leave request
   * @param {string} sIso day
   * @returns {boolean} true if the request is only half a day on this date
   */
  function isHalfDayOn(oRequest, sIso) {
    return (sIso === oRequest.startDate && oRequest.startHalfDay === true) ||
      (sIso === oRequest.endDate && oRequest.endHalfDay === true);
  }

  /**
   * Who is in and out on one day, and whether each subgroup keeps its minimum.
   * @param {string} sIso the day
   * @param {object} oData { members, subgroups, requests, holidaySet, countPending }
   *   requests: Approved and Submitted leave; Submitted counts only if countPending is true
   * @returns {object} { date, working, available[], absent[], coverage[], atRisk }
   */
  function dayAvailability(sIso, oData) {
    var bWorking = isWorkingDay(sIso, oData.holidaySet);
    var mAbsence = {}; // memberId -> { request, halfDay, pending }

    oData.requests.forEach(function (r) {
      if (r.startDate > sIso || r.endDate < sIso) {
        return;
      }
      var bPending = r.status === "Submitted";
      if (bPending && !oData.countPending) {
        return;
      }
      mAbsence[r.member_ID] = { request: r, halfDay: isHalfDayOn(r, sIso), pending: bPending };
    });

    var aAvailable = [];
    var aAbsent = [];
    oData.members.forEach(function (m) {
      var oAbs = mAbsence[m.ID];
      if (!bWorking || !oAbs) {
        aAvailable.push({ member: m, halfDay: false });
        return;
      }
      aAbsent.push({ member: m, request: oAbs.request, halfDay: oAbs.halfDay, pending: oAbs.pending });
      if (oAbs.halfDay) {
        aAvailable.push({ member: m, halfDay: true });
      }
    });

    var aCoverage = oData.subgroups.map(function (g) {
      var nOut = 0;
      g.memberIds.forEach(function (id) {
        var oAbs = bWorking && mAbsence[id];
        if (oAbs) {
          nOut += oAbs.halfDay ? 0.5 : 1;
        }
      });
      var nAvailable = g.memberIds.length - nOut;
      var sState = "Success";
      if (bWorking && nAvailable < g.minAvailable) {
        sState = "Error";
      } else if (bWorking && nAvailable === g.minAvailable) {
        sState = "Warning";
      }
      return {
        subgroup: g,
        available: nAvailable,
        total: g.memberIds.length,
        minAvailable: g.minAvailable,
        state: sState
      };
    });

    return {
      date: sIso,
      working: bWorking,
      available: aAvailable,
      absent: aAbsent,
      coverage: aCoverage,
      atRisk: aCoverage.some(function (c) {
        return c.state !== "Success";
      })
    };
  }

  return {
    toIso: toIso,
    parseIso: parseIso,
    addDays: addDays,
    isWeekend: isWeekend,
    isWorkingDay: isWorkingDay,
    countWorkingDays: countWorkingDays,
    isHalfDayOn: isHalfDayOn,
    dayAvailability: dayAvailability
  };
});
