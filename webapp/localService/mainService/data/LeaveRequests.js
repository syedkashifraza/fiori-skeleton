/**
 * Mock implementation of the bound actions on LeaveRequests.
 * Data still comes from LeaveRequests.json; this file only adds behaviour.
 *
 * Phase 2 replaces the simple status changes in `submit` and `validate` with calls
 * to the shared ruleEngine.js. In Phase 4 the same logic moves into the CAP service.
 */
const MOCK_MANAGER = "jonas.weber@example.com";

const ALLOWED_FROM = {
  submit: ["Draft"],
  approve: ["Submitted"],
  reject: ["Submitted"],
  cancel: ["Draft", "Submitted", "Approved"]
};

module.exports = {
  executeAction: async function (actionDefinition, actionData, keys, odataRequest) {
    const name = actionDefinition.name.split(".").pop().replace(/\(.*\)$/, "");

    if (name === "validate") {
      return []; // Phase 2: run the rule engine
    }
    if (name === "override") {
      return this.throwError("Overriding a blocked request comes with the rule engine (Phase 2)", 501);
    }

    const [entry] = await this.base.fetchEntries(keys, odataRequest);
    if (!entry) {
      return this.throwError("Leave request not found", 404);
    }
    const allowed = ALLOWED_FROM[name];
    if (!allowed) {
      return this.throwError(`Unknown action ${name}`, 400);
    }
    if (allowed.indexOf(entry.status) === -1) {
      return this.throwError(`Cannot ${name} a request with status ${entry.status}`, 400);
    }

    const now = new Date().toISOString();
    const changes = { modifiedAt: now };
    switch (name) {
      case "submit":
        changes.status = "Submitted";
        break;
      case "approve":
        Object.assign(changes, { status: "Approved", decidedBy: MOCK_MANAGER, decidedAt: now, decisionNote: actionData.note || null });
        break;
      case "reject":
        if (!actionData.note) {
          return this.throwError("A reason is required to reject a request", 400);
        }
        Object.assign(changes, { status: "Rejected", decidedBy: MOCK_MANAGER, decidedAt: now, decisionNote: actionData.note });
        break;
      case "cancel":
        changes.status = "Cancelled";
        break;
      default:
        break;
    }
    await this.base.updateEntry(keys, changes, odataRequest);
    return Object.assign({}, entry, changes);
  }
};
