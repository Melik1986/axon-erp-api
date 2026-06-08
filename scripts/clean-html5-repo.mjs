#!/usr/bin/env node
/**
 * Wipe HTML5 repo content and phantom subaccount registrations before redeploy.
 * Requires: cf login, html5-plugin (cf install-plugin -r CF-Community "html5-plugin")
 */
import { execSync } from "node:child_process";

const HTML5_HOST = "axon-html5-host";
const DEST_INSTANCE = "axon-destination";
const APP_ID = "axon.warehouse.ops";

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  try {
    const out = execSync(cmd, {
      encoding: "utf8",
      stdio: opts.ignoreFail ? ["pipe", "pipe", "pipe"] : "inherit",
    });
    if (typeof out === "string" && out.trim()) {
      console.log(out.trim());
    }
    return out ?? "";
  } catch (err) {
    if (opts.ignoreFail) {
      const msg = err.stderr?.toString() ?? err.message;
      console.log(msg.trim());
      return "";
    }
    throw err;
  }
}

function assertCfAuth() {
  const out = run("cf target", { ignoreFail: true });
  if (/Authentication has expired|log back in/i.test(out)) {
    console.error("\nFAIL: cf auth expired. Run:");
    console.error(
      "  cf login -a https://api.cf.us10-001.hana.ondemand.com -o 590c8b3dtrial_590c8b3dtrial -s dev",
    );
    process.exit(1);
  }
}

function listSection(title, cmd) {
  console.log(`\n=== ${title} ===`);
  run(cmd, { ignoreFail: true });
}

function wipeHostContent() {
  console.log(`\n=== Delete all content on ${HTML5_HOST} ===`);
  run(`cf html5-delete --content -n ${HTML5_HOST}`, { ignoreFail: true });
}

function deletePhantomSubaccountEntries(listOutput) {
  const hostIds = [...listOutput.matchAll(/app-host-id[:\s]+([0-9a-f-]{36})/gi)].map((m) => m[1]);
  const unique = [...new Set(hostIds)];
  if (unique.length === 0) {
    console.log("\nNo app-host-id values parsed from subaccount list (OK if repo empty).");
    return;
  }
  console.log(`\n=== Phantom / subaccount entries (${unique.length}) ===`);
  for (const id of unique) {
    run(`cf html5-delete -d ${id}`, { ignoreFail: true });
  }
}

console.log("HTML5 repo cleanup — axon.warehouse.ops");
assertCfAuth();

listSection("Space HTML5 apps", "cf html5-list");
const subaccountList = run("cf html5-list -d", { ignoreFail: true });
run(`cf html5-list -di ${DEST_INSTANCE}`, { ignoreFail: true });

wipeHostContent();
deletePhantomSubaccountEntries(subaccountList);

listSection("After cleanup — space", "cf html5-list");
listSection("After cleanup — subaccount via destination", `cf html5-list -di ${DEST_INSTANCE}`);

console.log("\nOK  Repo wiped. Next:");
console.log("  npm run deploy:content:cf");
console.log(`  Cockpit → HTML5 Apps channel → Fetch → assign ${APP_ID} to Everyone`);
