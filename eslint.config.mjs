import fioriTools from "@sap-ux/eslint-plugin-fiori-tools";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "webapp/localService/**/*.json"]
  },
  ...fioriTools.configs.recommended
];
