sap.ui.define([
  "sap/ui/core/format/DateFormat",
  "com/team/leavetracker/model/availability",
  "com/team/leavetracker/model/ruleTypes"
], function (DateFormat, availability, ruleTypes) {
  "use strict";

  var STATUS_STATE = {
    Draft: "None",
    Submitted: "Warning",
    Approved: "Success",
    Rejected: "Error",
    Cancelled: "None"
  };

  var STATUS_ICON = {
    Draft: "sap-icon://edit",
    Submitted: "sap-icon://pending",
    Approved: "sap-icon://accept",
    Rejected: "sap-icon://decline",
    Cancelled: "sap-icon://cancel"
  };

  var oMediumDate = DateFormat.getDateInstance({ style: "medium" });
  var oShortDay = DateFormat.getDateInstance({ pattern: "EEE d MMM" });

  function bundle(oController) {
    return oController.getOwnerComponent().getModel("i18n").getResourceBundle();
  }

  // Formatters are called with the controller as `this`.
  // Values from OData parts must use targetType: 'any' to arrive as raw booleans / ISO dates.
  return {
    /**
     * Privacy default from the design: members see "Out" unless the leave type is public;
     * managers always see the type.
     * @param {string} sTypeName leave type name
     * @param {boolean} bIsPublic whether the type is public
     * @param {boolean} bIsManager whether the viewer is a manager
     * @returns {string} the text to show
     */
    leaveTypeLabel: function (sTypeName, bIsPublic, bIsManager) {
      if (bIsManager === true || bIsPublic === true) {
        return sTypeName;
      }
      return bundle(this).getText("leaveType.out");
    },

    statusState: function (sStatus) {
      return STATUS_STATE[sStatus] || "None";
    },

    statusIcon: function (sStatus) {
      return STATUS_ICON[sStatus] || "";
    },

    /**
     * @param {string} sStatus status code, e.g. "Submitted"
     * @returns {string} translated status text
     */
    statusText: function (sStatus) {
      if (!sStatus) {
        return "";
      }
      return bundle(this).getText("status." + sStatus);
    },

    halfDayInfo: function (bStartHalfDay, bEndHalfDay) {
      if (bStartHalfDay !== true && bEndHalfDay !== true) {
        return "";
      }
      return bundle(this).getText("leave.halfDay");
    },

    /**
     * @param {string} sStart ISO start date
     * @param {string} [sEnd] ISO end date
     * @returns {string} e.g. "7 Dec 2026 – 9 Dec 2026" or a single date
     */
    dateRange: function (sStart, sEnd) {
      if (!sStart) {
        return "";
      }
      var sFrom = oMediumDate.format(availability.parseIso(sStart));
      if (!sEnd || sEnd === sStart) {
        return sFrom;
      }
      return sFrom + " – " + oMediumDate.format(availability.parseIso(sEnd));
    },

    shortDay: function (sIso) {
      return sIso ? oShortDay.format(availability.parseIso(sIso)) : "";
    },

    effectText: function (sEffect) {
      var o = ruleTypes.getEffect(sEffect);
      return o ? o.label : sEffect || "";
    },

    effectState: function (sEffect) {
      var o = ruleTypes.getEffect(sEffect);
      return o ? o.state : "None";
    },

    ruleTypeText: function (sType) {
      var o = ruleTypes.getType(sType);
      return o ? o.label : sType || "";
    },

    roleState: function (sRole) {
      return sRole === "Manager" ? "Information" : "None";
    }
  };
});
