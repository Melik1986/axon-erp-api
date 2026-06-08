const fs = require("fs");
const { execFileSync } = require("child_process");
const path = require("path");

const sourceDir = path.join(__dirname, "webapp");
const targetDir = path.join(__dirname, "dist");
const stagingDir = path.join(__dirname, "dist-staging");

fs.rmSync(targetDir, { recursive: true, force: true });
fs.rmSync(stagingDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, stagingDir, { recursive: true });
execFileSync("zip", ["-qr", path.join(targetDir, "warehouse-ops.zip"), "."], {
  cwd: stagingDir,
});
fs.rmSync(stagingDir, { recursive: true, force: true });
