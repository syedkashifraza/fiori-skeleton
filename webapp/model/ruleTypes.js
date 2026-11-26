sap.ui.define([], function () {
  "use strict";

  /*
   * Describes each rule type: which parameters the editor shows and what they mean.
   * Adding a rule type later = add an entry here + an engine function (design section 6).
   * params: any of "threshold", "subgroup", "period", "criticalPeriod"
   */
  var TYPES = [
    {
      key: "MAX_CONCURRENT",
      label: "Max people out at once",
      hint: "Limits how many people (team or subgroup) can be out on the same day.",
      params: ["threshold", "subgroup"],
      thresholdLabel: "Max people out",
      defaultEffect: "BLOCK"
    },
    {
      key: "MIN_AVAILABLE",
      label: "Min people available",
      hint: "Keeps a minimum number of people in for a subgroup.",
      params: ["threshold", "subgroup"],
      thresholdLabel: "Min people in",
      defaultEffect: "BLOCK"
    },
    {
      key: "MAX_CONSECUTIVE_DAYS",
      label: "Max consecutive days",
      hint: "Leave longer than this many working days.",
      params: ["threshold"],
      thresholdLabel: "Max working days",
      defaultEffect: "REQUIRE_APPROVAL"
    },
    {
      key: "CRITICAL_PERIOD",
      label: "Critical period",
      hint: "Leave overlapping a critical period, e.g. release week.",
      params: ["criticalPeriod"],
      defaultEffect: "REQUIRE_APPROVAL"
    },
    {
      key: "BLACKOUT",
      label: "Blackout",
      hint: "No leave at all during this period.",
      params: ["criticalPeriod"],
      defaultEffect: "BLOCK"
    },
    {
      key: "MIN_NOTICE_DAYS",
      label: "Minimum notice",
      hint: "Leave must be requested this many days in advance.",
      params: ["threshold"],
      thresholdLabel: "Days of notice",
      defaultEffect: "WARN"
    },
    {
      key: "MAX_PER_PERIOD",
      label: "Max days per period",
      hint: "Limits leave days per person in a month, quarter or year.",
      params: ["threshold", "period"],
      thresholdLabel: "Max days",
      defaultEffect: "REQUIRE_APPROVAL"
    }
  ];

  var EFFECTS = [
    { key: "BLOCK", label: "Block", state: "Error" },
    { key: "REQUIRE_APPROVAL", label: "Needs approval", state: "Warning" },
    { key: "WARN", label: "Warn", state: "Information" }
  ];

  var PERIODS = [
    { key: "MONTH", label: "Month" },
    { key: "QUARTER", label: "Quarter" },
    { key: "YEAR", label: "Year" }
  ];

  function find(aList, sKey) {
    return aList.filter(function (o) {
      return o.key === sKey;
    })[0];
  }

  return {
    types: TYPES,
    effects: EFFECTS,
    periods: PERIODS,
    getType: function (sKey) {
      return find(TYPES, sKey);
    },
    getEffect: function (sKey) {
      return find(EFFECTS, sKey);
    }
  };
});
