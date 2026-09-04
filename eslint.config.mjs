import nextConfig from "eslint-config-next";

const eslintConfig = [
    // Build output and tooling scratch space are not source. `.claude/` holds
    // git worktrees with their own full node_modules and .next inside the
    // repo, so linting them reports thousands of problems in generated code
    // that no one can act on. Git already excludes both.
    {
        ignores: [".next/**", ".claude/**", "next-env.d.ts"],
    },
    ...nextConfig,
];

export default eslintConfig;
