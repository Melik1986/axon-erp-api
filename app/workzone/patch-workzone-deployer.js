const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname,
  "node_modules",
  "@sap",
  "site-content-deployer",
  "lib",
  "deploy-tasks-manager.js",
);

if (!fs.existsSync(file)) {
  console.log(
    "patch-workzone-deployer: deploy-tasks-manager.js not found yet, skipping",
  );
  process.exit(0);
}

let content = fs.readFileSync(file, "utf8");

const oldCheck = "if (isArrayInclude(tags, 'portal')) {";
const newCheck =
  "if (isArrayInclude(tags, 'portal') || isArrayInclude(tags, 'launchpad') || isArrayInclude(tags, 'build-workzone-standard')) {";

if (content.includes(newCheck)) {
  console.log("patch-workzone-deployer: already patched");
  process.exit(0);
}

if (!content.includes(oldCheck)) {
  console.error(
    "patch-workzone-deployer: expected pattern not found in deploy-tasks-manager.js",
  );
  process.exit(1);
}

content = content.replace(oldCheck, newCheck);
fs.writeFileSync(file, content, "utf8");
console.log(
  "patch-workzone-deployer: patched getPortalServicesCredentials to support launchpad / build-workzone-standard tags",
);
