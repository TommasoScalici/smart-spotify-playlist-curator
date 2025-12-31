const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const globals = require("globals");
const prettier = require("eslint-config-prettier");

module.exports = tseslint.config(
    // Global ignores
    {
        ignores: ["lib/**/*", "**/*.js", "eslint.config.cjs"],
    },
    // Base JS config
    js.configs.recommended,
    // TypeScript recommended configs
    ...tseslint.configs.recommended,
    // Custom Rules & Settings
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node,
            },
            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        rules: {
            "quotes": ["error", "double"],
            "indent": ["error", 2], // Note: Prettier usually handles indent, but keeping as per old config
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": "warn",
            "no-unused-vars": "off", // Turned off in favor of @typescript-eslint/no-unused-vars
        },
    },
    // Prettier must be last to override others
    prettier
);
