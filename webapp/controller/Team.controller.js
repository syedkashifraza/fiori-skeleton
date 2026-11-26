sap.ui.define([
  "com/team/leavetracker/controller/BaseController",
  "com/team/leavetracker/model/teamData",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast"
], function (BaseController, teamData, JSONModel, Filter, FilterOperator, MessageToast) {
  "use strict";

  var MEMBER_FIELDS = ["displayName", "userId", "role", "location", "annualAllowance", "active"];

  return BaseController.extend("com.team.leavetracker.controller.Team", {
    onInit: function () {
      this.getView().setModel(new JSONModel({ busy: false, memberCount: 0, subgroupCount: 0 }), "team");
      this.getView().setModel(new JSONModel({}), "mem");
      this.getView().setModel(new JSONModel({}), "sg");
      this.getRouter().getRoute("team").attachPatternMatched(this._refresh, this);
    },

    _refresh: function () {
      this.byId("membersTable").getBinding("items").refresh();
      this.byId("subgroupsTable").getBinding("items").refresh();
    },

    onMembersReceived: function (oEvent) {
      this.getModel("team").setProperty("/memberCount", oEvent.getSource().getCount() || 0);
    },

    onSubgroupsReceived: function (oEvent) {
      this.getModel("team").setProperty("/subgroupCount", oEvent.getSource().getCount() || 0);
    },

    onMemberSearch: function (oEvent) {
      var sQuery = oEvent.getParameter("newValue");
      this.byId("membersTable").getBinding("items").filter(sQuery ? new Filter({
        filters: [
          new Filter({ path: "displayName", operator: FilterOperator.Contains, value1: sQuery, caseSensitive: false }),
          new Filter({ path: "userId", operator: FilterOperator.Contains, value1: sQuery, caseSensitive: false })
        ],
        and: false
      }) : []);
    },

    // ----- Members -----

    onAddMember: function () {
      this._openMemberDialog(null);
    },

    onEditMember: function (oEvent) {
      this._openMemberDialog(oEvent.getSource().getBindingContext());
    },

    _openMemberDialog: function (oContext) {
      var oData = oContext ? oContext.getObject() : {
        displayName: "", userId: "", role: "Member", location: "HQ", annualAllowance: 25, active: true
      };
      var oMem = this.getModel("mem");
      oMem.setData({
        title: this.getText(oContext ? "team.editMember" : "team.addMember"),
        nameState: "None",
        emailState: "None"
      });
      MEMBER_FIELDS.forEach(function (f) {
        oMem.setProperty("/" + f, f === "annualAllowance" ? Number(oData[f]) : oData[f]);
      });
      this._oMemberContext = oContext;
      if (!this._pMemberDialog) {
        this._pMemberDialog = this.loadFragment({ name: "com.team.leavetracker.view.fragment.MemberDialog" });
      }
      this._pMemberDialog.then(function (oDialog) {
        oDialog.open();
      });
    },

    onSaveMember: function () {
      var oMem = this.getModel("mem");
      var d = oMem.getData();
      var bValid = true;
      oMem.setProperty("/nameState", d.displayName ? "None" : "Error");
      oMem.setProperty("/emailState", /^[^@\s]+@[^@\s]+$/.test(d.userId || "") ? "None" : "Error");
      bValid = !!d.displayName && /^[^@\s]+@[^@\s]+$/.test(d.userId || "");
      if (!bValid) {
        return;
      }
      var oValues = {};
      MEMBER_FIELDS.forEach(function (f) {
        oValues[f] = f === "annualAllowance" ? String(d[f]) : d[f];
      });

      var pSave;
      if (this._oMemberContext) {
        var oContext = this._oMemberContext;
        pSave = Promise.all(MEMBER_FIELDS.map(function (f) {
          return oContext.getProperty(f) === oValues[f] ? null : oContext.setProperty(f, oValues[f]);
        }));
      } else {
        oValues.team_ID = this.getOwnerComponent().getModel("user").getProperty("/teamId");
        pSave = this.byId("membersTable").getBinding("items").create(oValues).created();
      }
      this.byId("memberDialog").close();
      pSave.then(function () {
        MessageToast.show(this.getText("team.memberSaved"));
      }.bind(this)).catch(this.showError.bind(this));
    },

    onCloseMemberDialog: function () {
      this.byId("memberDialog").close();
    },

    // ----- Subgroups -----

    onAddSubgroup: function () {
      this._openSubgroupDialog(null);
    },

    onEditSubgroup: function (oEvent) {
      this._openSubgroupDialog(oEvent.getSource().getBindingContext());
    },

    _openSubgroupDialog: function (oContext) {
      var oGroup = oContext ? oContext.getObject() : { name: "", description: "", minAvailable: 1, members: [] };
      var oSg = this.getModel("sg");
      oSg.setData({
        title: this.getText(oContext ? "team.editSubgroup" : "team.addSubgroup"),
        busy: true,
        nameState: "None",
        name: oGroup.name,
        description: oGroup.description,
        minAvailable: oGroup.minAvailable,
        memberIds: (oGroup.members || []).map(function (l) {
          return l.member_ID;
        }),
        links: (oGroup.members || []).map(function (l) {
          return { ID: l.ID, member_ID: l.member_ID };
        }),
        allMembers: []
      });
      this._oSubgroupContext = oContext;
      if (!this._pSubgroupDialog) {
        this._pSubgroupDialog = this.loadFragment({ name: "com.team.leavetracker.view.fragment.SubgroupDialog" });
      }
      this._pSubgroupDialog.then(function (oDialog) {
        oDialog.open();
        return teamData.readAll(this.getModel(), "/Members", { $select: "ID,displayName", $orderby: "displayName" },
          [new Filter("active", FilterOperator.EQ, true)]);
      }.bind(this)).then(function (aMembers) {
        oSg.setProperty("/allMembers", aMembers);
        oSg.setProperty("/busy", false);
      }).catch(this.showError.bind(this));
    },

    /**
     * Saves the subgroup fields, then adds and removes SubgroupMembers links to match the selection.
     */
    onSaveSubgroup: function () {
      var oSg = this.getModel("sg");
      var d = oSg.getData();
      if (!d.name) {
        oSg.setProperty("/nameState", "Error");
        return;
      }
      var oModel = this.getModel();
      var oContext = this._oSubgroupContext;
      var oValues = { name: d.name, description: d.description || null, minAvailable: Number(d.minAvailable) || 0 };
      oSg.setProperty("/busy", true);

      var pGroup;
      if (oContext) {
        pGroup = Promise.all(Object.keys(oValues).map(function (f) {
          return oContext.getProperty(f) === oValues[f] ? null : oContext.setProperty(f, oValues[f]);
        })).then(function () {
          return oContext.getProperty("ID");
        });
      } else {
        oValues.team_ID = this.getOwnerComponent().getModel("user").getProperty("/teamId");
        var oCreated = this.byId("subgroupsTable").getBinding("items").create(oValues);
        pGroup = oCreated.created().then(function () {
          return oCreated.getProperty("ID");
        });
      }

      pGroup.then(function (sGroupId) {
        var aWanted = d.memberIds || [];
        var aHave = d.links.map(function (l) {
          return l.member_ID;
        });
        var oLinks = oModel.bindList("/SubgroupMembers");
        var aAdds = aWanted.filter(function (id) {
          return aHave.indexOf(id) === -1;
        }).map(function (id) {
          return oLinks.create({ subgroup_ID: sGroupId, member_ID: id }).created();
        });
        var aRemoves = d.links.filter(function (l) {
          return aWanted.indexOf(l.member_ID) === -1;
        }).map(function (l) {
          return oModel.delete("/SubgroupMembers(" + l.ID + ")", "$auto");
        });
        return Promise.all(aAdds.concat(aRemoves));
      }).then(function () {
        MessageToast.show(this.getText("team.subgroupSaved"));
        this.byId("subgroupDialog").close();
        this._refresh();
      }.bind(this)).catch(this.showError.bind(this)).finally(function () {
        oSg.setProperty("/busy", false);
      });
    },

    onCloseSubgroupDialog: function () {
      this.byId("subgroupDialog").close();
    }
  });
});
