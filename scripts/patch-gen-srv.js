/**
 * Patches generated srv metadata after `cds build --production` to ensure
 * @cap-js/sqlite stays a production dependency for CF staging.
 *
 * CAP's build may omit @cap-js/sqlite from the generated package.json when
 * @cap-js/hana is also present in project dependencies, and the generated
 * package-lock.json can still keep it under devDependencies.
 */
const fs = require('fs');
const path = require('path');

const genSrvPkg = path.join(__dirname, '..', 'gen', 'srv', 'package.json');
const genSrvLock = path.join(__dirname, '..', 'gen', 'srv', 'package-lock.json');
const sourceDbData = path.join(__dirname, '..', 'db', 'data');
const targetDbData = path.join(__dirname, '..', 'gen', 'srv', 'db', 'data');

function ensureSqliteDependency(container) {
  if (!container) return false;

  let changed = false;

  if (!container.dependencies) container.dependencies = {};
  if (container.dependencies['@cap-js/sqlite'] !== '^2.4') {
    container.dependencies['@cap-js/sqlite'] = '^2.4';
    changed = true;
  }

  if (container.devDependencies && container.devDependencies['@cap-js/sqlite']) {
    delete container.devDependencies['@cap-js/sqlite'];
    if (Object.keys(container.devDependencies).length === 0) {
      delete container.devDependencies;
    }
    changed = true;
  }

  return changed;
}

function ensureSeedData() {
  if (!fs.existsSync(sourceDbData)) {
    console.warn('patch-gen-srv: seed source not found:', sourceDbData);
    return false;
  }

  fs.mkdirSync(path.dirname(targetDbData), { recursive: true });
  fs.rmSync(targetDbData, { recursive: true, force: true });
  fs.cpSync(sourceDbData, targetDbData, { recursive: true });
  console.log('patch-gen-srv: copied db/data into gen/srv');
  return true;
}

if (!fs.existsSync(genSrvPkg)) {
  console.error('patch-gen-srv: file not found:', genSrvPkg);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(genSrvPkg, 'utf8'));
if (ensureSqliteDependency(pkg)) {
  fs.writeFileSync(genSrvPkg, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log('patch-gen-srv: normalized @cap-js/sqlite in gen/srv/package.json');
} else {
  console.log('patch-gen-srv: @cap-js/sqlite already present in gen/srv/package.json');
}

ensureSeedData();

if (!fs.existsSync(genSrvLock)) {
  console.warn('patch-gen-srv: file not found:', genSrvLock);
  process.exit(0);
}

const lock = JSON.parse(fs.readFileSync(genSrvLock, 'utf8'));
const lockRoot = lock.packages && lock.packages[''];
const sqliteLockEntry = lock.packages && lock.packages['node_modules/@cap-js/sqlite'];
let lockChanged = false;

if (ensureSqliteDependency(lockRoot)) {
  lockChanged = true;
}

if (sqliteLockEntry) {
  if (sqliteLockEntry.dev || sqliteLockEntry.devOptional) {
    delete sqliteLockEntry.dev;
    delete sqliteLockEntry.devOptional;
    lockChanged = true;
  }
}

if (lockChanged) {
  fs.writeFileSync(genSrvLock, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  console.log('patch-gen-srv: normalized @cap-js/sqlite in gen/srv/package-lock.json');
} else {
  console.log('patch-gen-srv: @cap-js/sqlite already present in gen/srv/package-lock.json');
}
