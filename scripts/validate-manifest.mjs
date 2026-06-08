#!/usr/bin/env node
/**
 * Pre-deploy checks for Work Zone / HTML5 repo manifest contract.
 */
import { readFileSync } from "node:fs";

const MANIFEST_PATH = "app/warehouse-ops/webapp/manifest.json";
const EXPECTED_APP_ID = "axon.warehouse.ops";
const EXPECTED_INBOUNDS = 4;

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`OK   ${msg}`);
}

const raw = readFileSync(MANIFEST_PATH, "utf8");
const cloudMatches = raw.match(/"sap\.cloud"\s*:/g) ?? [];
if (cloudMatches.length !== 1) {
  fail(`sap.cloud must appear exactly once at root (found ${cloudMatches.length})`);
}
ok("single sap.cloud block at root");

const manifest = JSON.parse(raw);
if (manifest["sap.app"]?.["sap.cloud"]) {
  fail("sap.cloud must not be nested inside sap.app");
}
if (!manifest["sap.cloud"]?.public || manifest["sap.cloud"]?.service !== EXPECTED_APP_ID) {
  fail("sap.cloud must be { public: true, service: axon.warehouse.ops }");
}
ok(`sap.cloud.service=${EXPECTED_APP_ID}`);

const inbounds = manifest["sap.app"]?.crossNavigation?.inbounds;
if (!inbounds || typeof inbounds !== "object") {
  fail("sap.app.crossNavigation.inbounds missing");
}
const inboundKeys = Object.keys(inbounds);
if (inboundKeys.length !== EXPECTED_INBOUNDS) {
  fail(`expected ${EXPECTED_INBOUNDS} inbounds, got ${inboundKeys.length}`);
}
for (const key of inboundKeys) {
  const inbound = inbounds[key];
  if (!inbound.semanticObject || !inbound.action) {
    fail(`inbound ${key} missing semanticObject/action`);
  }
  if (!inbound.icon) {
    fail(`inbound ${key} missing icon (FLP tile requirement)`);
  }
  if (/\{\{/.test(inbound.title ?? "") || /\{\{/.test(inbound.subTitle ?? "")) {
    fail(`inbound ${key} uses i18n placeholders — WZ saas_approuter channel may not resolve them`);
  }
}
ok(`${EXPECTED_INBOUNDS} crossNavigation inbounds with semanticObject, action, icon`);

const version = manifest["sap.app"]?.applicationVersion?.version;
if (!version) {
  fail("sap.app.applicationVersion.version missing");
}
ok(`applicationVersion ${version}`);
