#!/usr/bin/env node

const sg          = require('sg0');
const { _ }       = sg;
const util        = require('util');
const path        = require('path');
const pkgUp       = require('pkg-up');
const readPkg     = require('read-pkg');
// const glob        = util.promisify(require('glob'));
const glob        = require('glob');
const resolvePkg  = require('resolve-pkg');

console.log(process.argv, process.argv0);

(async function() {

  if (process.argv0 === 'sg-config-link-with-file') {
    return await sg_config_link_with_file();
  }
  return await sg_config_link_with_file();

})();

async function sg_config_link_with_file() {

  var workspace, workdir;

  // Find the workspace config
  workspace = await pkgUp();
  workdir = dirOf(workspace);
  workspace = await readPkg({cwd: workdir, normalize:false});

  if (!workspace.workspaces) {
    workspace = await pkgUp('..');
    workdir = dirOf(workspace);
    workspace = await readPkg({cwd: workdir, normalize:false});
  }

  if (!workspace.workspaces) {
    console.error(`No workspace found`);
    process.exit(2);
    return;
  }

  console.log({workspace});

  var packageList = sg.reduce(workspace.workspaces, [], (m, glb) => {
    return [ ...m, ...glob.sync(glb, {cwd: workdir}) ];
  });

  // packageList = packageList.map(p => `${p}/package.json`);

  console.log({packageList});

  var updatePackageList = sg.reduce(packageList, {}, (m, pkgDir) => {
    const packagePath = `${workdir}/${pkgDir}`;
    const updatePackagePath = path.join(workdir, pkgDir, 'package.json');
    const package = readPkg.sync({cwd: packagePath, normalize:false});
    const packageFilePath = `file:${resolvePkg(package.name, {cwd:workdir})}`;
    // const dirname = pkgDir.split(/[/\\]/g)[1];
    return sg.kv(m, package.name, {updatePackage: package, updatePackagePath, packageFilePath});
  });

  console.log({updatePackageList});

  var dependencies = sg.reduce(updatePackageList, {}, (m, data, npmName) => {
    return sg.kv(m, npmName, data.packageFilePath);
  });

  const updatedPackages = sg.reduce(updatePackageList, {}, (m, data, npmName) => {
    var updatedPackage = data.updatePackage;

    updatedPackage.dependencies = replace(updatedPackage.dependencies, dependencies);
    return sg.kv(m, npmName, {updatedPackage, updatedPackagePath: data.updatePackagePath, packageFilePath:data.packageFilePath});
  });
  console.log(sg.inspect({updatedPackages}));

  console.log({dependencies});
}

function dirOf(file) {
  return _.initial(file.split(/[/\\]/g)).join(path.sep);
}

function replace(orig, values) {
  return sg.reduce(orig, {}, (m,v,k) => {
    return sg.kv(m, k, values[k] || v);
  });
}
