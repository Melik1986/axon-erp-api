/**
 * Block G prerequisites verifiable from repo + CF CLI (before Cockpit steps G.5–G.6).
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const LAUNCHPAD_SITE =
  "https://590c8b3dtrial.launchpad.cfapps.us10.hana.ondemand.com/site?siteId=b4c96273-a66c-47ab-be1b-f3ffa818d1f9";
const ODATA_URL =
  "https://590c8b3dtrial-590c8b3dtrial-dev-axon-odata-api.cfapps.us10-001.hana.ondemand.com";

function ok(step, msg) {
  console.log(`OK   [${step}] ${msg}`);
}
function fail(step, msg) {
  console.log(`FAIL [${step}] ${msg}`);
}

let bad = false;
function markFail(step, msg) {
  bad = true;
  fail(step, msg);
}

// G.3 CDM ↔ manifest
const cdmA = fs.readFileSync(path.join(root, "app/workzone/CommonDataModel.json"), "utf8");
const cdmB = fs.readFileSync(path.join(root, "app/workzone/portal-site/CommonDataModel.json"), "utf8");
if (cdmA !== cdmB) markFail("G.3", "CommonDataModel.json files differ");
else ok("G.3", "portal-site and workzone CDM identical");

const cdm = JSON.parse(cdmA);
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "app/warehouse-ops/webapp/manifest.json"), "utf8")
);
const appId = manifest["sap.app"]?.id;
const inbounds = Object.keys(manifest["sap.app"]?.crossNavigation?.inbounds ?? {});
const roleId = cdm.payload?.roles?.[0]?.identification?.id;
const vizIds = cdm.payload?.catalogs?.flatMap((c) =>
  (c.payload?.viz ?? []).map((v) => v.vizId)
);

if (appId !== "axon.warehouse.ops") markFail("G.3", `sap.app.id=${appId}`);
else ok("G.3", "sap.app.id axon.warehouse.ops");

for (const v of ["WarehouseOps-display", "WarehouseCatalog-display"]) {
  if (!inbounds.includes(v) || !vizIds.includes(v)) markFail("G.3", `vizId ${v} mismatch`);
  else ok("G.3", `vizId ${v} in manifest + CDM`);
}

if (roleId !== "Warehouse_Ops_Access") markFail("G.3", `role id=${roleId}`);
else ok("G.3", "role Warehouse_Ops_Access in CDM");

// G.4 portal deploy
try {
  const tasks = execSync("cf tasks axon-portal-deployer", { encoding: "utf8" });
  if (!tasks.includes("SUCCEEDED")) markFail("G.4", "no SUCCEEDED portal deploy task");
  else ok("G.4", "axon-portal-deployer deploy task SUCCEEDED");
} catch (e) {
  markFail("G.4", e.message);
}

// G.2 destinations in mta (static check)
const mta = fs.readFileSync(path.join(root, "mta.yaml"), "utf8");
if (!mta.includes("Name: srv-api") || !mta.includes(ODATA_URL.replace("https://", "")))
  markFail("G.2", "mta.yaml srv-api URL");
else ok("G.2", `srv-api → ${ODATA_URL}`);

if (!mta.includes("axon-workzone-runtime") || !mta.includes("CEP.HTML5contentprovider"))
  markFail("G.2", "axon-workzone-runtime CEP flag");
else ok("G.2", "axon-workzone-runtime + HTML5 content provider in mta");

const zip = path.join(root, "app/warehouse-ops-content/app-content/warehouse-ops.zip");
if (!fs.existsSync(zip)) markFail("G.2", "warehouse-ops.zip missing — run npm run build:mtar");
else ok("G.2", "warehouse-ops.zip present");

console.log("\n--- Cockpit (you) — strict plan order ---");
console.log("G.1  BTP → Security → Users → business IdP user → Role Collections tab:");
console.log("     • Already assigned: Launchpad_Admin, Launchpad_External_User");
console.log("     • Open Warehouse_Ops_Access RC → Roles must include axon-integration Admin/User");
console.log("G.2  BTP → Connectivity → Destinations → srv-api + axon-workzone-runtime → Check Connection");
console.log("G.5  Work Zone → Channel Manager → HTML5 Apps → Assign to site warehouse-ops → Save");
console.log("G.6  Site Manager → site warehouse-ops → Roles: Everyone + Warehouse_Ops_Access");
console.log("G.8  Open:", LAUNCHPAD_SITE);
console.log("     Expect 2 tiles; hashes #WarehouseOps-display #WarehouseCatalog-display");

process.exit(bad ? 1 : 0);
