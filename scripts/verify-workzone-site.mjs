#!/usr/bin/env node
/**
 * Work Zone checks — app-only channel (no cdm.json).
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const SITE_ID = "b4c96273-a66c-47ab-be1b-f3ffa818d1f9";
const EXPECTED_APP_HOST = "a4ef3c28-f91e-4923-b12a-fdfb994691e5";
const EXPECTED_VERSION = "1.0.30";
const SITE_URL = `https://590c8b3dtrial.launchpad.cfapps.us10.hana.ondemand.com/site?siteId=${SITE_ID}`;
const ODATA_HEALTH =
  "https://590c8b3dtrial-590c8b3dtrial-dev-axon-odata-api.cfapps.us10-001.hana.ondemand.com/health";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function fail(msg) {
  console.log(`FAIL: ${msg}`);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

section("Local — no CDM");
if (existsSync("app/workzone/cdm.json")) {
  fail("app/workzone/cdm.json must be deleted");
} else {
  ok("cdm.json removed from repo");
}
if (run("grep -q 'cp app/workzone/cdm.json' mta.yaml && echo yes || echo no") === "no") {
  ok("mta.yaml does not copy cdm.json");
} else {
  fail("mta.yaml still copies cdm.json");
}

section("Manifest version");
const manifest = run("node -e \"console.log(require('./app/warehouse-ops/webapp/manifest.json')['sap.app'].applicationVersion.version)\"");
manifest === EXPECTED_VERSION
  ? ok(`manifest version ${EXPECTED_VERSION}`)
  : fail(`manifest version ${manifest}, expected ${EXPECTED_VERSION}`);

section("CF apps");
try {
  const apps = run("cf apps");
  for (const name of ["axon-odata-api", "axon-odata-api-app"]) {
    apps.includes(name) ? ok(`${name} present`) : fail(`${name} missing`);
  }
} catch (err) {
  fail(err.message);
}

section("OData health");
try {
  const code = run(`curl -sS -o /dev/null -w '%{http_code}' '${ODATA_HEALTH}'`);
  code === "200" ? ok(`health HTTP ${code}`) : fail(`health HTTP ${code}`);
} catch (err) {
  fail(err.message);
}

section("HTML5 repo");
try {
  const list = run("cf html5-list -di axon-destination");
  if (list.includes("axon.warehouse.ops") && list.includes(EXPECTED_VERSION)) {
    ok(`axon.warehouse.ops v${EXPECTED_VERSION} in repo`);
  } else {
    fail(`HTML5 app missing or not v${EXPECTED_VERSION}`);
    console.log(list);
  }
} catch (err) {
  fail(`cf html5-list: ${err.message}`);
}

section("Site shell");
try {
  const code = run(`curl -sS -o /dev/null -w '%{http_code}' -L '${SITE_URL}'`);
  code.startsWith("2") || code === "302" ? ok(`site HTTP ${code}`) : fail(`site HTTP ${code}`);
} catch (err) {
  fail(err.message);
}

console.log("\nCockpit: HTML5 Apps channel → Fetch → Content Explorer → add app to Everyone");
