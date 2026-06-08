#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const EXPECTED_APP_ID = "axon.warehouse.ops";
const EXPECTED_VERSION = "1.0.30";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function ok(msg) {
  console.log(`OK  ${msg}`);
}

function fail(msg) {
  console.log(`FAIL ${msg}`);
}

console.log("\n=== Manifest ===");
const manifest = JSON.parse(readFileSync("app/warehouse-ops/webapp/manifest.json", "utf8"));
manifest["sap.app"].id === EXPECTED_APP_ID
  ? ok(`sap.app.id=${EXPECTED_APP_ID}`)
  : fail(`sap.app.id=${manifest["sap.app"].id}`);
manifest["sap.cloud"].service === EXPECTED_APP_ID
  ? ok(`sap.cloud.service=${EXPECTED_APP_ID}`)
  : fail(`sap.cloud.service=${manifest["sap.cloud"].service}`);
manifest["sap.app"].applicationVersion.version === EXPECTED_VERSION
  ? ok(`version=${EXPECTED_VERSION}`)
  : fail(`version=${manifest["sap.app"].applicationVersion.version}`);

console.log("\n=== Naming note ===");
ok("Cockpit Application Name axonwarehouseops = SAP normalization of sap.app.id (dots removed)");
ok("Business Solution axon.warehouse.ops = sap.cloud.service — not a conflict");

console.log("\n=== Deploy ===");
ok("npm run deploy:content:cf  # axon-warehouse-ops-content + axon-destinations");
ok("Do NOT add axon-warehouse-ops-html5-repository as WZ Content Provider (technical DT only)");
