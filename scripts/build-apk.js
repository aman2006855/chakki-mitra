const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const apiDir = path.resolve("src/app/api");
const backupDir = path.resolve(".apk-build-api-backup");

// Move API routes out of the way for static export
if (fs.existsSync(apiDir)) {
  fs.renameSync(apiDir, backupDir);
}

try {
  // Set env var to enable static export in next.config.ts
  const env = { ...process.env, NEXT_STATIC_EXPORT: "1" };
  const result = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
} finally {
  // Restore API routes
  if (fs.existsSync(backupDir)) {
    fs.mkdirSync(path.dirname(apiDir), { recursive: true });
    fs.renameSync(backupDir, apiDir);
  }
}
