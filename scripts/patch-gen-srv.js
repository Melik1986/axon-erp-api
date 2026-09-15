/**
 * Post-process after `cds build --production` for CF/HANA deploy.
 * - Ensures @cap-js/hana is a production dependency in gen/srv
 * - Syncs security overrides from root package.json (Snyk)
 * - Copies canonical seed CSV into gen/srv/db/data (local/dev parity)
 */
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const genSrvPkg = path.join(rootDir, "gen", "srv", "package.json");
const rootPkgPath = path.join(rootDir, "package.json");
const sourceDbData = path.join(rootDir, "db", "data");
const targetSrvDbData = path.join(rootDir, "gen", "srv", "db", "data");

const SECURITY_OVERRIDE_KEYS = ["qs", "ws", "body-parser", "proxy-addr"];

function fixCfStartScript(container) {
  if (!container?.scripts?.start?.includes("with-node24")) return false;
  container.scripts.start = "cds-serve";
  return true;
}

function ensureHanaDependency(container) {
  if (!container) return false;
  if (!container.dependencies) container.dependencies = {};
  if (container.dependencies["@cap-js/hana"] === "^2") return false;
  container.dependencies["@cap-js/hana"] = "^2";
  return true;
}

/** Mirror root security overrides into gen/srv so CF install pins fixed transitive deps. */
function syncSecurityOverrides(container) {
  const root = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
  const fromRoot = root.overrides || {};
  const next = {};
  for (const key of SECURITY_OVERRIDE_KEYS) {
    if (fromRoot[key] != null) next[key] = fromRoot[key];
  }
  const before = JSON.stringify(container.overrides || {});
  container.overrides = next;
  return before !== JSON.stringify(next);
}

function stripDevTooling(container) {
  let changed = false;
  if (container.devDependencies) {
    delete container.devDependencies;
    changed = true;
  }
  if (container.scripts?.postinstall) {
    delete container.scripts.postinstall;
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
pkgChanged = syncSecurityOverrides(pkg) || pkgChanged;
pkgChanged = stripDevTooling(pkg) || pkgChanged;
if (pkgChanged) {
  fs.writeFileSync(genSrvPkg, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  console.log("patch-gen-srv: updated gen/srv/package.json for CF");
}

ensureSeedData();
