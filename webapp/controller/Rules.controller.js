sap.ui.define([
  "com/team/leavetracker/controller/BaseController",
  "com/team/leavetracker/model/teamData",
  "com/team/leavetracker/model/ruleTypes",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (BaseController, teamData, ruleTypes, JSONModel, MessageBox, MessageToast) {
  "use strict";

  // Edits are collected in this deferred group and sent on Save; Cancel resets them.
  var GROUP = "ruleEdit";

  return BaseController.extend("com.team.leavetracker.controller.Rules", {
    onInit: function () {
      this.getView().setModel(new JSONModel({
        layout: "OneColumn",
        count: 0,
        busy: false,
        editing: false,
        isNew: false,
        types: ruleTypes.types,
        effects: ruleTypes.effects,
        periods: ruleTypes.periods,
        subgroups: [],
        criticalPeriods: []
      }), "rv");
      this.getRouter().getRoute("rules").attachPatternMatched(this._onListMatched, this);
      this.getRouter().getRoute("ruleDetail").attachPatternMatched(this._onDetailMatched, this);
    },

    _loadLookups: function () {
      var oRv = this.getModel("rv");
      return teamData.load(this.getModel()).then(function (oData) {
        oRv.setProperty("/subgroups", [{ key: "", text: this.getText("rules.wholeTeam") }].concat(
          oData.subgroups.map(function (g) {
            return { key: g.ID, text: g.name };
          })));
        oRv.setProperty("/criticalPeriods", oData.criticalPeriods.map(function (p) {
          return { ID: p.ID, text: p.name + " (" + this.formatter.dateRange.call(this, p.startDate, p.endDate) + ")" };
        }.bind(this)));
      }.bind(this)).catch(this.showError.bind(this));
    },

    _onListMatched: function () {
      this._discardChanges();
      this.getModel("rv").setProperty("/layout", "OneColumn");
      this.byId("rulesTable").removeSelections(true);
      this._loadLookups();
    },

    _onDetailMatched: function (oEvent) {
      var sId = oEvent.getParameter("arguments").id;
      var oRv = this.getModel("rv");
      this._discardChanges();
      oRv.setProperty("/layout", "TwoColumnsMidExpanded");
      oRv.setProperty("/isNew", false);
      oRv.setProperty("/editing", true);
      this._loadLookups();
      var oPage = this.byId("ruleEditPage");
      oPage.setBindingContext(null);
      oPage.bindElement({
        path: "/Rules(" + sId + ")",
        parameters: { $$updateGroupId: GROUP }
      });
    },

    _discardChanges: function () {
      if (this.getModel().hasPendingChanges(GROUP)) {
        this.getModel().resetChanges(GROUP);
      }
      this.getModel("rv").setProperty("/editing", false);
    },

    // ----- Formatters driven by model/ruleTypes.js -----

    hasParam: function (sType, sParam) {
      var o = ruleTypes.getType(sType);
      return !!o && o.params.indexOf(sParam) !== -1;
    },

    thresholdLabel: function (sType) {
      var o = ruleTypes.getType(sType);
      return (o && o.thresholdLabel) || "";
    },

    editTitle: function (bNew, sType) {
      return bNew ? this.getText("rules.newTitle") : this.formatter.ruleTypeText(sType);
    },

    ruleHint: function (sType) {
      var o = ruleTypes.getType(sType);
      return o ? o.hint : "";
    },

    // ----- Events -----

    onRulesReceived: function (oEvent) {
      this.getModel("rv").setProperty("/count", oEvent.getSource().getCount() || 0);
    },

    onSelectRule: function (oEvent) {
      this.navTo("ruleDetail", { id: oEvent.getParameter("listItem").getBindingContext().getProperty("ID") });
    },

    onNewRule: function () {
      var oRv = this.getModel("rv");
      var oType = ruleTypes.types[0];
      var oContext = this.byId("rulesTable").getBinding("items").create({
        team_ID: this.getOwnerComponent().getModel("user").getProperty("/teamId"),
        ruleType: oType.key,
        effect: oType.defaultEffect,
        threshold: 2,
        active: true,
        description: ""
      });
      var oPage = this.byId("ruleEditPage");
      oPage.unbindElement();
      oPage.setBindingContext(oContext);
      oRv.setProperty("/isNew", true);
      oRv.setProperty("/editing", true);
      oRv.setProperty("/layout", "TwoColumnsMidExpanded");
      this._loadLookups();
    },

    // Picking a type applies its default effect and clears parameters it does not use.
    onRuleTypeChange: function (oEvent) {
      var oContext = this.byId("ruleEditPage").getBindingContext();
      var oType = ruleTypes.getType(oEvent.getParameter("selectedItem").getKey());
      oContext.setProperty("effect", oType.defaultEffect);
      if (oType.params.indexOf("subgroup") === -1) {
        oContext.setProperty("subgroup_ID", null);
      }
      if (oType.params.indexOf("criticalPeriod") === -1) {
        oContext.setProperty("criticalPeriod_ID", null);
      }
      if (oType.params.indexOf("period") === -1) {
        oContext.setProperty("period", null);
      } else if (!oContext.getProperty("period")) {
        oContext.setProperty("period", "MONTH");
      }
      if (oType.params.indexOf("threshold") === -1) {
        oContext.setProperty("threshold", null);
      } else if (oContext.getProperty("threshold") === null) {
        oContext.setProperty("threshold", 1);
      }
    },

    // "Whole team" is the empty key; store it as null.
    onSubgroupChange: function (oEvent) {
      var sKey = oEvent.getParameter("selectedItem").getKey();
      this.byId("ruleEditPage").getBindingContext().setProperty("subgroup_ID", sKey || null);
    },

    onSave: function () {
      var oContext = this.byId("ruleEditPage").getBindingContext();
      var oType = ruleTypes.getType(oContext.getProperty("ruleType"));
      if (oType.params.indexOf("criticalPeriod") !== -1 && !oContext.getProperty("criticalPeriod_ID")) {
        MessageBox.warning(this.getText("rules.needCriticalPeriod"));
        return;
      }
      var oRv = this.getModel("rv");
      var bNew = oRv.getProperty("/isNew");
      oRv.setProperty("/busy", true);
      this.getModel().submitBatch(GROUP).then(function () {
        if (this.getModel().hasPendingChanges(GROUP)) {
          throw new Error(this.getText("rules.saveFailed"));
        }
        return bNew ? oContext.created() : null;
      }.bind(this)).then(function () {
        MessageToast.show(this.getText("rules.saved"));
        oRv.setProperty("/editing", false);
        this.byId("rulesTable").getBinding("items").refresh();
        this.navTo("rules");
      }.bind(this)).catch(this.showError.bind(this)).finally(function () {
        oRv.setProperty("/busy", false);
      });
    },

    onCancel: function () {
      this._discardChanges();
      this.navTo("rules");
      this.getModel("rv").setProperty("/layout", "OneColumn");
    },

    onDelete: function () {
      var oContext = this.byId("ruleEditPage").getBindingContext();
      MessageBox.confirm(this.getText("rules.deleteConfirm"), {
        onClose: function (sAction) {
          if (sAction !== MessageBox.Action.OK) {
            return;
          }
          this._discardChanges();
          oContext.delete("$auto").then(function () {
            MessageToast.show(this.getText("rules.deleted"));
            this.byId("rulesTable").getBinding("items").refresh();
            this.navTo("rules");
          }.bind(this)).catch(this.showError.bind(this));
        }.bind(this)
      });
    }
  });
});
