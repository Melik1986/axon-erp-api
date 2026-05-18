/**
 * Patches gen/srv/package.json after `cds build --production` to ensure
 * @cap-js/sqlite is listed in dependencies so CF staging installs it.
 *
 * CAP's build may omit @cap-js/sqlite from the generated package.json when
 * @cap-js/hana is also present in project dependencies.
 */
const fs = require('fs');
const path = require('path');

const genSrvPkg = path.join(__dirname, '..', 'gen', 'srv', 'package.json');

if (!fs.existsSync(genSrvPkg)) {
  console.error('patch-gen-srv: file not found:', genSrvPkg);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(genSrvPkg, 'utf8'));

if (!pkg.dependencies) pkg.dependencies = {};

if (pkg.dependencies['@cap-js/sqlite']) {
  console.log('patch-gen-srv: @cap-js/sqlite already present:', pkg.dependencies['@cap-js/sqlite']);
} else {
  pkg.dependencies['@cap-js/sqlite'] = '^2.4';
  fs.writeFileSync(genSrvPkg, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log('patch-gen-srv: added @cap-js/sqlite ^2.4 to gen/srv/package.json dependencies');
}
