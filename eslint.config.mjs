import fioriTools from "@sap-ux/eslint-plugin-fiori-tools";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "webapp/localService/**/*.json"]
  },
  ...fioriTools.configs.recommended,
  {
    // OData field names follow the CAP convention (team_ID, type_code), so allow them as properties.
    files: ["webapp/**/*.js"],
    languageOptions: {
      globals: { Promise: "readonly", Set: "readonly" }
    },
    rules: {
      camelcase: ["warn", { properties: "never" }]
    }
  },
  {
    // Mock server handlers run in Node.js, not in the browser.
    files: ["webapp/localService/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "writable", require: "readonly" }
    },
    rules: {
      "@sap-ux/fiori-tools/sap-no-global-variable": "off"
    }
  }
];
