# Team Leave Tracker

SAPUI5 freestyle Fiori app (JavaScript, UI5 1.148 LTS) for planning team leave and availability.
This is **Phase 0 (scaffold)** of the design: app shell, routing, role toggle and an OData V4
mock service with the full entity model and seed data.

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

## Layout

| Path | What |
| --- | --- |
| `webapp/manifest.json` | OData V4 data source `/odata/v4/leave/`, routes |
| `webapp/Component.js` | user resolution, role switch, manager route guard |
| `webapp/model/models.js` | device and `user` models (mock users live here) |
| `webapp/model/formatter.js` | status and privacy ("Out") formatters |
| `webapp/view/App.view.xml` | ShellBar + SideNavigation shell |
| `webapp/view/Home.view.xml` | out today, my upcoming leave, pending approvals |
| `webapp/view/Placeholder.view.xml` | stand-in for routes built in Phase 1 and 2 |
| `webapp/localService/mainService/metadata.xml` | CAP-shaped V4 metadata (entities, actions, `getAvailability`) |
| `webapp/localService/mainService/data/*.json` | seed data, one file per entity set |
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

## Not in Phase 0

The bound actions (`validate`, `submit`, `approve`, ...) and `getAvailability` are declared in
the metadata but have no mock implementation yet; they come with Phases 1 and 2.
