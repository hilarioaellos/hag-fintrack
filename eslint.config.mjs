import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  // Exclude generated and non-app files from linting
  {
    ignores: ["scripts/**", "src/convex-generated/**"],
  },
  ...coreWebVitals,
  ...nextTypescript,
  // Disable React Compiler / purity rules — project does not use babel-plugin-react-compiler
  {
    rules: {
      "react-compiler/react-compiler": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
