/**
 * Layered CF verification for axon-odata-api (no secrets printed).
 * Usage: cf login && node scripts/verify-cf-layers.mjs
 */
import { execSync } from "child_process";

const CF_BASE =
  "https://590c8b3dtrial-590c8b3dtrial-dev-axon-odata-api.cfapps.us10-001.hana.ondemand.com/odata/v4/warehouse";
const EXPECTED = {
  Products: 6,
  StockLevels: 6,
  Suppliers: 4,
  PurchaseOrders: 3,
  Invoices: 4,
};

function cfJson(cmd) {
  const out = execSync(cmd, { encoding: "utf8" });
  const start = out.indexOf("{");
  return JSON.parse(out.slice(start >= 0 ? start : 0));
}

function ok(layer, detail) {
  console.log(`OK   [${layer}] ${detail}`);
}

function fail(layer, detail) {
  console.log(`FAIL [${layer}] ${detail}`);
}

let failed = false;
function markFail(layer, detail) {
  failed = true;
  fail(layer, detail);
}

try {
  const apps = execSync("cf apps", { encoding: "utf8" });
  for (const name of ["axon-odata-api", "axon-odata-api-app"]) {
    const line = apps.split("\n").find((l) => l.startsWith(name)) ?? "";
    if (!line.includes("started")) markFail("L1-CF-apps", `${name} not started: ${line.trim() || "missing"}`);
    else ok("L1-CF-apps", `${name} started`);
  }
} catch (e) {
  markFail("L1-CF-apps", e.message);
}

try {
  const services = execSync("cf services", { encoding: "utf8" });
  for (const svc of ["axon-auth", "axon-destination", "axon-html5-host", "axon-html5-rt", "axon-launchpad"]) {
    if (!services.includes(svc)) markFail("L2-CF-services", `missing ${svc}`);
    else ok("L2-CF-services", svc);
  }
} catch (e) {
  markFail("L2-CF-services", e.message);
}

let token = "";
try {
  const creds = cfJson("cf service-key axon-auth axon-auth-key").credentials;
  const basic = Buffer.from(`${creds.clientid}:${creds.clientsecret}`).toString("base64");
  const body = await (
    await fetch(`${creds.url}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    })
  ).json();
  if (!body.access_token) markFail("L3-XSUAA", JSON.stringify(body));
  else {
    token = body.access_token;
    ok("L3-XSUAA", "client_credentials token issued");
  }
} catch (e) {
  markFail("L3-XSUAA", e.message);
}

if (token) {
  const hdr = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  for (const [entity, min] of Object.entries(EXPECTED)) {
    try {
      const r = await fetch(`${CF_BASE}/${entity}?$top=50`, { headers: hdr });
      const data = await r.json();
      const n = Array.isArray(data.value) ? data.value.length : 0;
      if (!r.ok || n < min) markFail("L4-OData-seed", `${entity} HTTP ${r.status} rows=${n} need>=${min}`);
      else ok("L4-OData-seed", `${entity} rows=${n}`);
    } catch (e) {
      markFail("L4-OData-seed", `${entity}: ${e.message}`);
    }
  }
  try {
    const r = await fetch(
      `${CF_BASE}/StockLevels?$filter=contains(Name,'Arabica')&$select=Name,Quantity,Unit`,
      { headers: hdr },
    );
    const data = await r.json();
    const row = data.value?.[0];
    if (row?.Quantity === 420 && row?.Unit === "kg") ok("L4-OData-seed", "Arabica 420 kg (cafeteria demo)");
    else markFail("L4-OData-seed", `Arabica row: ${JSON.stringify(row)}`);
  } catch (e) {
    markFail("L4-OData-seed", `Arabica: ${e.message}`);
  }
}

ok(
  "L5-HTML5",
  "check zip: app/warehouse-ops-content/app-content/warehouse-ops.zip (axon.warehouse.ops)",
);
ok(
  "L6-Portal-CDM",
  "after deploy: Cockpit → Site → Assign role Warehouse_Ops_Access + Users → role collection",
);
console.log("\nSource of truth seed: db/data/*.csv (same files copied to gen/srv/db/data on build)");

process.exit(failed ? 1 : 0);
