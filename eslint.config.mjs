import tseslint from "typescript-eslint";

export default tseslint.config(
    ...tseslint.configs.recommended,
    {
        ignores: ["node_modules/**", "dist/**", "src/public/**", "coverage/**", "**/*.d.ts", "src/types/**", "test__OLD/**"]
    },
    {
        rules: {
            "semi": ["error", "always"],
            "quotes": ["error", "double"],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-inferrable-types": [
                "warn", {
                    "ignoreParameters": true
                }
            ],
            "@typescript-eslint/no-unused-vars": "warn"
        }
    }
);
