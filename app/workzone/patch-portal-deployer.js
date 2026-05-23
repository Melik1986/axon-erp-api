const fs = require("fs");
const path = require("path");

const libDir = path.join(
  __dirname,
  "node_modules",
  "@sap",
  "portal-cf-content-deployer",
  "src",
  "lib",
);
const utilsFile = path.join(libDir, "utils.js");
const deployerFile = path.join(libDir, "deployer.js");

const oldStr = "xsenv.cfServiceCredentials({tag: 'portal-service'})";
const newStr = "xsenv.cfServiceCredentials({tag: 'launchpad'})";

if (fs.existsSync(utilsFile)) {
  let c = fs.readFileSync(utilsFile, "utf8");
  if (c.includes(oldStr)) {
    c = c.split(oldStr).join(newStr);
    fs.writeFileSync(utilsFile, c, "utf8");
    console.log("patched: utils.js");
  } else {
    console.log("already patched: utils.js");
  }
}

if (fs.existsSync(deployerFile)) {
  let c = fs.readFileSync(deployerFile, "utf8");
  if (c.includes(oldStr)) {
    c = c.split(oldStr).join(newStr);
    fs.writeFileSync(deployerFile, c, "utf8");
    console.log("patched: deployer.js");
  } else {
    console.log("already patched: deployer.js");
  }
}
