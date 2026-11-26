sap.ui.define([], function () {
  "use strict";

  var STATUS_STATE = {
    Draft: "None",
    Submitted: "Warning",
    Approved: "Success",
    Rejected: "Error",
    Cancelled: "None"
  };

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
      return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("leaveType.out");
    },

    statusState: function (sStatus) {
      return STATUS_STATE[sStatus] || "None";
    },

    /**
     * @param {string} sStatus status code, e.g. "Submitted"
     * @returns {string} translated status text
     */
    statusText: function (sStatus) {
      if (!sStatus) {
        return "";
      }
      return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("status." + sStatus);
    },

    halfDayInfo: function (bStartHalfDay, bEndHalfDay) {
      if (bStartHalfDay !== true && bEndHalfDay !== true) {
        return "";
      }
      return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("leave.halfDay");
    }
  };
});
