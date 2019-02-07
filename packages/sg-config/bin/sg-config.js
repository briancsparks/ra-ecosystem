#!/usr/bin/env node

const sg          = require('sg-argv');
const { _ }       = sg;
const util        = require('util');
const path        = require('path');
const fs          = require('fs');
const pkgUp       = require('pkg-up');
const readPkg     = require('read-pkg');
// const glob        = util.promisify(require('glob'));
const glob        = require('glob');
const resolvePkg  = require('resolve-pkg');

const ARGV        = sg.ARGV();

console.log(process.argv, process.argv0, {ARGV});

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

  console_log({workspace});
  console_info(`Using workspace file at ${workdir}...`);

  var packageList = sg.reduce(workspace.workspaces, [], (m, glb) => {
    return [ ...m, ...glob.sync(glb, {cwd: workdir}) ];
  });

  console_log({packageList});

  var updatePackageList = sg.reduce(packageList, {}, (m, pkgDir) => {
    const packagePath             = `${workdir}/${pkgDir}`;

    const origPackagePath         = path.join(workdir, pkgDir, 'package.json');
    const origPackageJson         = fs.readFileSync(origPackagePath, 'utf8');

    const package                 = readPkg.sync({cwd: packagePath, normalize:false});      /* the formally-read in package.json contents */
    const dependencyReplacement   = `file:${resolvePkg(package.name, {cwd:workdir})}`;

    console_info(`  Package ${package.name} is at ${dependencyReplacement}`);

    return sg.kv(m, package.name, {updatePackage: package, origPackageJson, origPackagePath, dependencyReplacement});
  });

  console_log({updatePackageList});

  var dependencies = sg.reduce(updatePackageList, {}, (m, data, npmName) => {
    return sg.kv(m, npmName, data.dependencyReplacement);
  });

  const updatedPackages = sg.reduce(updatePackageList, {}, (m, data, npmName) => {
    const { origPackageJson }   = data;
    const updatedPackage        = JSON.parse(JSON.stringify(data.updatePackage));

    updatedPackage.dependencies = replace(updatedPackage.dependencies, dependencies);

    return sg.kv(m, npmName, {origPackageJson, updatedPackage, updatedPackagePath: data.origPackagePath, dependencyReplacement: data.dependencyReplacement});
  });
  console_log(sg.inspect({updatedPackages}));

  console_log({dependencies});

  _.each(updatedPackages, (data, npmName) => {
    const { updatedPackage } = data;

    console_info(`\n  Writing ${data.updatedPackagePath}`);
    _.each(updatedPackage.dependencies, (v,k) => {
      console_info(`    ${k}:${v}`);
    });

    if (!ARGV.dry_run) {
      fs.writeFileSync(data.updatedPackagePath, JSON.stringify(updatedPackage));
    }
  });

  console_log(`updated... take a look`);

  if (ARGV.restore) {
    sg.setTimeout(10 * 1000, () => {
      console_info(`\nRestoring...`);
      _.each(updatedPackages, (data, npmName) => {
        const { origPackageJson } = data;
        console_info(`  ${data.updatedPackagePath}`);
        if (!ARGV.dry_run) {
          fs.writeFileSync(data.updatedPackagePath, origPackageJson);
        }
      });

      console_log(`done...`);
    });

  } else {
    console_info(`\n------------------------------------`);
    console_info(`Recover with:\n`);
    console_info(`cd ${process.cwd()}`);
    _.each(updatedPackages, (data, npmName) => {
      console_info(`git checkout ${data.updatedPackagePath}`);
    });
  }
}

function console_log(...args) {
  if (ARGV.debug || ARGV.verbose) {
    return console.error(...args);
  }
}

function console_info(...args) {
  if (!ARGV.quiet) {
    return console.info(...args);
  }
}


function dirOf(file) {
  return _.initial(file.split(/[/\\]/g)).join(path.sep);
}

function replace(orig, values) {
  return sg.reduce(orig, {}, (m,v,k) => {
    return sg.kv(m, k, values[k] || v);
  });
}
