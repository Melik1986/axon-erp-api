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
const zipPath = path.join(targetDir, "warehouse-ops.zip");
execFileSync("zip", ["-qr", zipPath, "."], { cwd: stagingDir });
const zipListing = execFileSync("unzip", ["-l", zipPath], { encoding: "utf8" });
const hasRootManifest = /\n\s+\d+.*\smanifest\.json$/m.test(zipListing);
const hasNestedManifest = /\n\s+\d+.*\/(webapp|dist)\/manifest\.json$/m.test(zipListing);
if (!hasRootManifest || hasNestedManifest) {
  throw new Error(
    "warehouse-ops.zip must contain manifest.json at archive root, not under webapp/ or dist/",
  );
}
fs.rmSync(stagingDir, { recursive: true, force: true });
