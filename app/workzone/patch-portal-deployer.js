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

function patchDeployerRuntime(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");
  const replacements = [
    ["glob = require('glob'),", "globSync = require('glob').globSync,"],
    [
      `                    glob(pattern, options, (err, files) => {
                        files.forEach((filePath) => {
                            let fileData = fs.readFileSync(filePath);

                            //getting folder name 'portal-site', need to generate folder 'site'
                            filePath = filePath.substring('portal-'.length);
                            zip.file(filePath, fileData);
                        });
                        resolve(zip.generateNodeStream());
                    });`,
      `                    const files = globSync(pattern, options);
                    files.forEach((filePath) => {
                        let fileData = fs.readFileSync(filePath);
                        filePath = filePath.substring('portal-'.length);
                        zip.file(filePath, fileData);
                    });
                    resolve(zip.generateNodeStream());`,
    ],
    ["rimraf = require('rimraf'),", "rimraf = require('rimraf').rimraf,"],
  ];
  let changed = false;
  for (const [oldBlock, newBlock] of replacements) {
    if (content.includes(oldBlock)) {
      content = content.replace(oldBlock, newBlock);
      changed = true;
    }
  }
  if (!changed) {
    console.log("already patched: deployer.js runtime");
    return;
  }
  fs.writeFileSync(filePath, content, "utf8");
  console.log("patched: deployer.js runtime (glob/rimraf modern APIs)");
}

function patchDeployerMetadata() {
  if (!fs.existsSync(deployerPackageFile)) {
    console.log("patch-portal-deployer: deployer package.json not found");
    return;
  }
  const packageJson = JSON.parse(fs.readFileSync(deployerPackageFile, "utf8"));
  packageJson.dependencies = {
    ...packageJson.dependencies,
    axios: "1.16.1",
    glob: "11.1.0",
    rimraf: "5.0.10",
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
patchDeployerRuntime(deployerFile);
patchDeployerMetadata();
