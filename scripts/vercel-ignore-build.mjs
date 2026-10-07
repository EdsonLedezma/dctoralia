const productionBranch = "main";
const branch = process.env.VERCEL_GIT_COMMIT_REF;

if (branch === productionBranch) {
  console.log(`[vercel] Production build enabled for '${productionBranch}'.`);
  process.exitCode = 1;
} else {
  console.log(
    `[vercel] Build skipped for '${branch || "unknown branch"}'; only '${productionBranch}' is enabled.`,
  );
  process.exitCode = 0;
}
