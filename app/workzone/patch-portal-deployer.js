const fs = require("fs");
const path = require("path");

const deployerRoot = path.join(
  __dirname,
  "node_modules",
  "@sap",
  "portal-cf-content-deployer",
);
const libDir = path.join(deployerRoot, "src", "lib");
const utilsFile = path.join(libDir, "utils.js");
const deployerFile = path.join(libDir, "deployer.js");
const deployerPackageFile = path.join(deployerRoot, "package.json");
const deployerShrinkwrapFile = path.join(deployerRoot, "npm-shrinkwrap.json");

const oldStr = "xsenv.cfServiceCredentials({tag: 'portal-service'})";
const newStr = "xsenv.cfServiceCredentials({tag: 'launchpad'})";

function patchLaunchpadCredentials(filePath, label) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");
  if (content.includes(oldStr)) {
    content = content.split(oldStr).join(newStr);
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`patched: ${label}`);
    return;
  }
  console.log(`already patched: ${label}`);
}

function patchDeployerErrorLogging(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");
  const oldError =
    "            errorMessage = 'Deploy to portal service failed, got status = ' + err.response.status + ', data: ' + err.response.data;";
  const newError =
    "            errorMessage = 'Deploy to portal service failed, got status = ' + err.response.status + ', data: ' + JSON.stringify(err.response.data);";
  if (!content.includes(oldError)) {
    console.log("already patched: deployer.js error logging");
    return;
  }
  content = content.replace(oldError, newError);
  fs.writeFileSync(filePath, content, "utf8");
  console.log("patched: deployer.js error logging");
}

function patchDeployerMetadata() {
  if (!fs.existsSync(deployerPackageFile)) {
    console.log("patch-portal-deployer: deployer package.json not found");
    return;
  }
  const packageJson = JSON.parse(fs.readFileSync(deployerPackageFile, "utf8"));
  packageJson.dependencies = {
    ...packageJson.dependencies,
    glob: "7.2.3",
    rimraf: "3.0.2",
    "form-data": "3.0.4",
    jszip: "3.10.1",
  };
  fs.writeFileSync(deployerPackageFile, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  console.log("patched: portal-cf-content-deployer/package.json metadata");
  if (fs.existsSync(deployerShrinkwrapFile)) {
    fs.unlinkSync(deployerShrinkwrapFile);
    console.log("removed: portal-cf-content-deployer/npm-shrinkwrap.json (stale SCA metadata)");
  }
}

patchLaunchpadCredentials(utilsFile, "utils.js");
patchLaunchpadCredentials(deployerFile, "deployer.js");
patchDeployerErrorLogging(deployerFile);
patchDeployerMetadata();
