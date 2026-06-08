#!/usr/bin/env node
/**
 * Cloud verify — app-only HTML5 channel (no CDM destinations).
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const EXPECTED_VERSION = "1.0.31";
const CLOUD_SERVICE = "axon.warehouse.ops";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function fail(msg) {
  console.log(`FAIL: ${msg}`);
}

function getDestinations() {
  run(
    "cf service-key axon-destination axon-destinations-axon-destination-credentials > /tmp/dest-sk.json",
  );
  const raw = readFileSync("/tmp/dest-sk.json", "utf8");
  const sk = JSON.parse(raw.slice(raw.indexOf("{")));
  const { clientid, clientsecret, url } = sk.credentials.uaa;
  const token = JSON.parse(
    run(
      `curl -sS -X POST '${url}/oauth/token' -H 'Content-Type: application/x-www-form-urlencoded' -d 'grant_type=client_credentials&client_id=${encodeURIComponent(clientid)}&client_secret=${encodeURIComponent(clientsecret)}'`,
    ),
  ).access_token;
  return JSON.parse(
    run(
      `curl -sS -H 'Authorization: Bearer ${token}' 'https://destination-configuration.cfapps.us10.hana.ondemand.com/destination-configuration/v1/subaccountDestinations'`,
    ),
  );
}

section("Repo");
if (existsSync("app/workzone/cdm.json")) {
  fail("cdm.json still in repo");
} else {
  ok("no local cdm.json");
}

section("Destinations — no CDM DT");
try {
  const dests = getDestinations();
  const cdmDests = dests.filter(
    (d) => d.URL?.includes("/applications/cdm/") || /cdm/i.test(d.Name),
  );
  if (cdmDests.length === 0) {
    ok("no CDM destinations (parser cannot load stale cdm.json)");
  } else {
    fail(`CDM destinations still present: ${cdmDests.map((d) => d.Name).join(", ")}`);
  }
  const repo = dests.find((d) => d.Name === "axon-warehouse-ops-html5-repository");
  const rt = dests.find((d) => d.Name === "axon-warehouse-ops-html5-runtime");
  if (repo?.["sap.cloud.service"] === CLOUD_SERVICE) {
    ok("html5-repository sap.cloud.service=axon.warehouse.ops");
  } else {
    fail("html5-repository missing or wrong sap.cloud.service");
  }
  const auth = dests.find((d) => d.Name === "axon-warehouse-ops-auth");
  if (auth && !auth["sap.cloud.service"]) {
    ok("axon-warehouse-ops-auth has no sap.cloud.service (OData only)");
  } else {
    fail("axon-warehouse-ops-auth still has sap.cloud.service — run fix:workzone-destinations");
  }
  if (rt && rt["sap.cloud.service"] !== CLOUD_SERVICE) {
    ok(`html5-runtime sap.cloud.service=${rt["sap.cloud.service"] ?? "none"} (not duplicate)`);
  } else if (rt?.["sap.cloud.service"] === CLOUD_SERVICE) {
    fail("html5-runtime duplicates sap.cloud.service with repository");
  }
} catch (err) {
  fail(err.message);
}

section("HTML5 repo version");
try {
  const list = run("cf html5-list -d");
  if (list.includes(EXPECTED_VERSION)) {
    ok(`cloud html5 version ${EXPECTED_VERSION}`);
  } else {
    fail(`cloud not on v${EXPECTED_VERSION} yet — redeploy content module`);
    console.log(list);
  }
} catch (err) {
  fail(err.message);
}

section("Cockpit");
console.log(`
HTML5 Apps (saas_approuter) → Fetch updated content
  App date should move past 20/05/2026
  Toggle unlocks when app (no broken CDM) is registered

Content Manager → Content Explorer → HTML5 Apps → axon.warehouse.ops → Add
Content Manager → Everyone → assign app (4 inbounds as tiles manually or via app)
`);
