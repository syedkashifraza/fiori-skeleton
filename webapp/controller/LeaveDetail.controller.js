sap.ui.define([
  "com/team/leavetracker/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageBox, MessageToast) {
  "use strict";

  return BaseController.extend("com.team.leavetracker.controller.LeaveDetail", {
    onInit: function () {
      this.getView().setModel(new JSONModel({ busy: false }), "detail");
      this.getRouter().getRoute("leaveDetail").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function (oEvent) {
      var sId = oEvent.getParameter("arguments").id;
      this.getView().bindElement({
        path: "/LeaveRequests(" + sId + ")",
        parameters: { $$updateGroupId: "leaveDetail" }
      });
    },

    halfDayText: function (bStart, bEnd) {
      if (bStart === true && bEnd === true) {
        return this.getText("detail.halfBoth");
      }
      if (bStart === true) {
        return this.getText("detail.halfStart");
      }
      if (bEnd === true) {
        return this.getText("detail.halfEnd");
      }
      return this.getText("detail.halfNone");
    },

    onNavBack: function () {
      this.navTo("myLeaves");
    },

    _runAction: function (sAction, sSuccessKey) {
      var oContext = this.getView().getBindingContext();
      var oDetail = this.getModel("detail");
      oDetail.setProperty("/busy", true);
      return this.callAction(oContext, sAction).then(function () {
        MessageToast.show(this.getText(sSuccessKey));
        this.getView().getElementBinding().refresh();
      }.bind(this)).catch(this.showError.bind(this)).finally(function () {
        oDetail.setProperty("/busy", false);
      });
    },

    onSubmit: function () {
      this._runAction("submit", "request.submitted");
    },

    onCancelRequest: function () {
      MessageBox.confirm(this.getText("detail.cancelConfirm"), {
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.OK) {
            this._runAction("cancel", "detail.cancelled");
          }
        }.bind(this)
      });
    }
  });
});
