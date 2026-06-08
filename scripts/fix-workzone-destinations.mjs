#!/usr/bin/env node
/**
 * Fix duplicate sap.cloud.service and wrong html5 bindings for Work Zone Standard.
 * Keeps sap.cloud.service ONLY on subaccount axon-warehouse-ops-html5-repository.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const CLOUD_SERVICE = "axon.warehouse.ops";
const REPO_DEST = "axon-warehouse-ops-html5-repository";
const API = "https://destination-configuration.cfapps.us10.hana.ondemand.com/destination-configuration/v1";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function getToken() {
  run("cf service-key axon-destination axon-destinations-axon-destination-credentials > /tmp/dest-sk.json");
  const raw = readFileSync("/tmp/dest-sk.json", "utf8");
  const sk = JSON.parse(raw.slice(raw.indexOf("{")));
  const { clientid, clientsecret, url } = sk.credentials.uaa;
  return JSON.parse(
    run(
      `curl -sS -X POST '${url}/oauth/token' -H 'Content-Type: application/x-www-form-urlencoded' -d 'grant_type=client_credentials&client_id=${encodeURIComponent(clientid)}&client_secret=${encodeURIComponent(clientsecret)}'`,
    ),
  ).access_token;
}

function api(token, method, path, body) {
  const args = [
    "curl",
    "-sS",
    "-X",
    method,
    "-H",
    `'Authorization: Bearer ${token}'`,
    "-H",
    "'Content-Type: application/json'",
  ];
  if (body) {
    args.push("-d", `'${JSON.stringify(body).replace(/'/g, "'\\''")}'`);
  }
  args.push(`'${API}${path}'`);
  const out = run(args.join(" "));
  if (!out) {
    return {};
  }
  try {
    return JSON.parse(out);
  } catch {
    return { raw: out };
  }
}

function stripCloudService(dest) {
  const next = { ...dest };
  delete next["sap.cloud.service"];
  return next;
}

function log(action, name, result) {
  const err = result?.ErrorMessage ?? result?.error?.message;
  console.log(err ? `FAIL ${action} ${name}: ${err}` : `OK   ${action} ${name}`);
}

const token = getToken();
const subaccount = JSON.parse(
  run(`curl -sS -H 'Authorization: Bearer ${token}' '${API}/subaccountDestinations'`),
);
const instance = JSON.parse(
  run(`curl -sS -H 'Authorization: Bearer ${token}' '${API}/instanceDestinations'`),
);

for (const name of ["axon-warehouse-ops-auth", "axon-warehouse-ops-html5-runtime"]) {
  const dest = subaccount.find((d) => d.Name === name);
  if (!dest?.["sap.cloud.service"]) {
    console.log(`OK   skip subaccount ${name} (no sap.cloud.service)`);
    continue;
  }
  log("PUT subaccount", name, api(token, "PUT", `/subaccountDestinations/${name}`, stripCloudService(dest)));
}

const repo = subaccount.find((d) => d.Name === REPO_DEST);
if (repo?.["sap.cloud.service"] === CLOUD_SERVICE) {
  console.log(`OK   keep ${REPO_DEST} sap.cloud.service=${CLOUD_SERVICE}`);
} else {
  console.log(`FAIL ${REPO_DEST} missing sap.cloud.service`);
}

for (const name of ["axon-warehouse-ops-auth", "axon-warehouse-ops-html5-repository"]) {
  const dest = instance.find((d) => d.Name === name);
  if (!dest) {
    console.log(`OK   skip instance ${name} (absent)`);
    continue;
  }
  if (name === "axon-warehouse-ops-html5-repository") {
    log("DELETE instance", name, api(token, "DELETE", `/instanceDestinations/${name}`));
    continue;
  }
  if (!dest["sap.cloud.service"]) {
    console.log(`OK   skip instance ${name} (no sap.cloud.service)`);
    continue;
  }
  log("PUT instance", name, api(token, "PUT", `/instanceDestinations/${name}`, stripCloudService(dest)));
}

console.log("\nNext: npm run deploy:content:cf  (repo was empty — redeploy HTML5 zip)");
