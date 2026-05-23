/**
 * Post-process after `cds build --production` for CF/HANA deploy.
 * - Ensures @cap-js/hana is a production dependency in gen/srv
 * - Copies canonical seed CSV into gen/srv/db/data (local/dev parity)
 */
const fs = require("fs");
const path = require("path");

const genSrvPkg = path.join(__dirname, "..", "gen", "srv", "package.json");
const sourceDbData = path.join(__dirname, "..", "db", "data");
const targetSrvDbData = path.join(__dirname, "..", "gen", "srv", "db", "data");

function fixCfStartScript(container) {
  if (!container?.scripts?.start?.includes("with-node24")) return false;
  container.scripts.start = "cds-serve";
  return true;
}

function ensureHanaDependency(container) {
  if (!container) return false;
  let changed = false;
  if (!container.dependencies) container.dependencies = {};
  if (container.dependencies["@cap-js/hana"] !== "^2") {
    container.dependencies["@cap-js/hana"] = "^2";
    changed = true;
  }
  return changed;
}

function ensureSeedData() {
  if (!fs.existsSync(sourceDbData)) {
    console.warn("patch-gen-srv: seed source not found:", sourceDbData);
    return false;
  }
  fs.mkdirSync(path.dirname(targetSrvDbData), { recursive: true });
  fs.rmSync(targetSrvDbData, { recursive: true, force: true });
  fs.cpSync(sourceDbData, targetSrvDbData, { recursive: true });
  console.log("patch-gen-srv: copied db/data into gen/srv/db/data");
  return true;
}

if (!fs.existsSync(genSrvPkg)) {
  console.error("patch-gen-srv: file not found:", genSrvPkg);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(genSrvPkg, "utf8"));
let pkgChanged = ensureHanaDependency(pkg);
pkgChanged = fixCfStartScript(pkg) || pkgChanged;
if (pkgChanged) {
  fs.writeFileSync(genSrvPkg, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  console.log("patch-gen-srv: updated gen/srv/package.json for CF");
}

ensureSeedData();
