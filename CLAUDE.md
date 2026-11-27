# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Team Leave Tracker: SAPUI5 freestyle Fiori app (JavaScript, `sap.ui.define` AMD modules, UI5 1.148.13 LTS, theme `sap_horizon`) against an OData V4 service at `/odata/v4/leave/`. Namespace / app ID: `com.team.leavetracker` (maps to `webapp/`).

Built in phases. Done: Phase 0 (scaffold, routing, role toggle, mock service) and all views against mock data. Not built: Phase 2 rule engine, Phase 3 XSUAA auth, Phase 4 CAP backend. Code comments marked "Phase N" / "Mock phase only" flag what gets replaced later — keep those seams intact. `README.md` has the page/route table and seed-data scenarios.

## Commands

```
npm start               # mock data, member user (ui5-mock.yaml), http://localhost:8080/index.html
npm run start-manager   # same, as manager (?role=manager)
npm run start-flp       # inside a Fiori launchpad sandbox (test/flp.html is served virtually by fiori-tools-preview)
npm run start-local     # mock data, UI5 downloaded locally instead of CDN (ui5-local.yaml)
npm run lint            # eslint . (fiori-tools recommended config)
npx eslint webapp/controller/Home.controller.js   # lint one file
npm run build           # ui5 build -> dist/
```

There are no tests yet. `ui5.yaml` (default config) points at a real backend that doesn't exist yet — always run via the mock configs.

## Architecture

**Two kinds of models.** The default model is the OData V4 model (`manifest.json`, `autoExpandSelect`, server operation mode). Tables and lists bind to it directly and are refreshed after writes with `getBinding("items").refresh()`. Anything computed (calendar, availability, coverage, who-else-is-out, rule editor lookups) instead calls `model/teamData.js` `load()`, which reads all relevant entity sets into plain JS objects (only `Approved`/`Submitted` leave counts as "out"), and puts the results into view-local `JSONModel`s. Most pages use both.

**User and roles.** `Component.js` owns identity: `model/models.js` builds the `user` JSON model from mock users (role from `?role=manager`), then `_resolveCurrentMember()` looks up the `Members` row by `userId` to fill `memberId`/`teamId`/`displayName`. Controllers must wait on `getOwnerComponent().whenUserReady()` before using those fields. The shell-bar role switch calls `Component.switchRole()`, which publishes `user`/`changed` on the component's own event bus (`getEventBus()`, not the core one); page controllers subscribe to reload. Manager-only routes are listed in `MANAGER_ROUTES` in `Component.js` — a new manager page must be added there as well as in `manifest.json` routing.

**Controllers** extend `controller/BaseController.js` (`getText` for i18n, `getUser`, `navTo`, `showError`, `callAction`). Bound OData actions (`submit`, `approve`, `reject`, `cancel`, `validate`, `override`) are invoked via `callAction(oContext, "approve", { note })`, which prefixes `LeaveService.`. Dialogs are XML fragments in `view/fragment/`. UI text lives in `i18n/i18n.properties`.

**Pure logic, shared later.** `model/availability.js` has no UI5 dependencies on purpose (ISO `YYYY-MM-DD` strings, local time, working-day/half-day math) so it can move into the mock server's `getAvailability` handler and later the CAP service. Keep it UI5-free. `model/ruleTypes.js` is the config that drives the rule editor; adding a rule type = new entry there + (Phase 2) an engine function.

**Mock service.** `@sap-ux/ui5-middleware-fe-mockserver` serves `webapp/localService/mainService/metadata.xml` (CAP-shaped: `team_ID`, `type_code` style foreign keys) with seed data from `data/*.json` (`generateMockData: false`). `data/LeaveRequests.js` runs in Node (CommonJS) and implements the bound actions with a status-transition table; `validate` returns `[]` and `override` returns 501 until Phase 2. Changes are in memory and reset on restart. Seed data is fixed around Nov 2026–Jan 2027 while the home page uses the real current date. `localService/**/*.js` is excluded from the build.

When changing the data model, update `metadata.xml`, the matching `data/*.json`, and any `$select`/`$expand` in `teamData.js` together.

## Lint conventions

ESLint allows non-camelCase *properties* (CAP field names like `team_ID`) and treats `webapp/localService/**/*.js` as Node CommonJS. Seed JSON is not linted.
