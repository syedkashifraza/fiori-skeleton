# Team Leave Tracker

SAPUI5 freestyle Fiori app (JavaScript, UI5 1.148 LTS) for planning team leave and availability.
Built so far: the Phase 0 scaffold (app shell, routing, role toggle, OData V4 mock service) and
all views from the design, working against mock data. The rule engine (Phase 2) is not built yet.

## Run

    npm install
    npm start            # member view, mock data: http://localhost:8080/index.html
    npm run start-manager   # same, as the manager test user (?role=manager)
    npm run start-flp    # inside an SAP Fiori launchpad sandbox
    npm run start-local  # UI5 served locally instead of from the CDN
    npm run lint
    npm run build        # output in dist/

The role switch in the shell bar (mock only) toggles between the test users
`priya.sharma@example.com` (member) and `jonas.weber@example.com` (manager).

## Pages

| Route | View | Who |
| --- | --- | --- |
| `#/` | Home: out today, my upcoming leave, pending approvals | All |
| `#/calendar` | Team calendar (PlanningCalendar), subgroup filter, holidays and critical periods | All |
| `#/availability/{date}` | Daily availability, 14-day risk strip, subgroup coverage cards | All |
| `#/myLeaves`, `#/myLeaves/{id}` | My requests, allowance, new request dialog; request detail with submit / cancel | All |
| `#/approvals/{id}` | Approval inbox (list + detail): rule hits, who else is out, coverage, approve / reject | Manager |
| `#/team` | Members and subgroups, add / edit dialogs | Manager |
| `#/rules/{id}` | Rule list and editor; fields depend on the rule type (`model/ruleTypes.js`) | Manager |
| `#/periods` | Critical periods and public holidays | Manager |

Members see colleagues' leave as "Out" unless the leave type is public (e.g. Training).

## Layout

| Path | What |
| --- | --- |
| `webapp/manifest.json` | OData V4 data source `/odata/v4/leave/`, routes |
| `webapp/Component.js` | user resolution, role switch, manager route guard |
| `webapp/model/models.js` | device and `user` models (mock users live here) |
| `webapp/model/availability.js` | pure date / working-day / availability logic, reusable server side |
| `webapp/model/teamData.js` | loads members, subgroups, leave, rules, periods as plain objects |
| `webapp/model/ruleTypes.js` | rule type config driving the rule editor |
| `webapp/model/formatter.js` | status, effect, date and privacy formatters |
| `webapp/view/`, `webapp/controller/` | one view + controller per page; dialogs in `view/fragment/` |
| `webapp/localService/mainService/metadata.xml` | CAP-shaped V4 metadata (entities, actions, `getAvailability`) |
| `webapp/localService/mainService/data/*.json` | seed data, one file per entity set |
| `webapp/localService/mainService/data/LeaveRequests.js` | mock `submit`, `approve`, `reject`, `cancel` actions |
| `ui5-mock.yaml` / `ui5-local.yaml` / `ui5.yaml` | mock + CDN / mock + local UI5 / real backend (Phase 4) |

## Seed data

8 members in one team (location `HQ`), 3 subgroups, 4 leave types, all 7 v1 rule types,
2 critical periods (release week 18-22 Jan 2027, go-live 25 Jan 2027), public holidays,
and leave requests in every status. Key scenarios:

- 26 Nov 2026: Carlos out, Tom out for a half day.
- 7-9 Dec 2026: Priya and Mei out, so the team is at its `MAX_CONCURRENT` limit and the
  Backend and Support rota subgroups are at their minimum.
- Omar's 13-day leave was approved over the `MAX_CONSECUTIVE_DAYS` rule (stored rule hit).
- Sara's request in release week is pending approval (stored `CRITICAL_PERIOD` hits).

The data is fixed in time; the home page uses the real current date.

## Mock data behaviour

Changes (new requests, approvals, edited rules) live in the mock server's memory and are reset
when `npm start` is restarted.

## Not built yet

- Rule engine (Phase 2): `submit` does not check rules yet, `validate` returns no hits and
  `override` returns 501. Stored rule hits in the seed data show what the UI will display.
- `getAvailability` is declared in the metadata; the UI computes availability client side with
  `model/availability.js` until then.
