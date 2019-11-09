
/**
 * @file
 *
 */
const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, require('sg-env'));
const {_}                     = sg;
const tarfs                   = require('tar-fs');
const fs                      = require('fs');
const {writableNoopStream}    = require('noop-stream');
const os                      = require('os');
const path                    = require('path');

const mod                     = ra.modSquad(module, 'quick-tar');
const DIAG                    = sg.DIAG(module);
const ENV                     = sg.ENV();



// =======================================================================================================
// saveNginxConfigTarball

DIAG.usage({ aliases: { getTarStream: { args: {
  tarRoot   : 'root,path',
  name      : 'filename',
}}}});

DIAG.activeDevelopment(`--debug`);
// DIAG.activeName = 'getTarStream';

mod.async(DIAG.async({getTarStream: async function(argv, context) {
  const diag    = DIAG.diagnostic({argv, context});

  const {tarRoot}               = diag.args();
  var   {debugOutFile,devNull}  = diag.args();
  const {cwd,name,command}      = diag.args();

  if (!(diag.haveArgs({tarRoot})))                    { return diag.exit(); }

  var   result = {};

  var manifest;
  if (cwd || name) {
    manifest = sg.merge(manifest ||{}, {cwd,name});
  }

  if (command) {
    manifest = sg.merge(manifest ||{}, {command:{line:command, sudo: (command.indexOf('$SUDO') !== -1)}});
  }

  const {files}                 = diag.args();

  var   {map,finalize,finish,ignore,entries,mapStream,dmode,fmode,readable,writable}   = argv;
  if (manifest || files) {
    let oldFinish = (_.isFunction(finish) && finish);
    finish = function(thePack) {
      if (manifest) {
        thePack.entry({name: 'manifest.json'}, sg.safeJSONStringify(manifest));
      }

      if (files) {
        _.each(files, (contents, name) => {
          thePack.entry({...entryDefs(argv), name}, sg.safeJSONStringify(contents) || contents);
        });
      }

      if (oldFinish) {
        oldFinish(thePack, entryDefs(argv));
      } else {
        thePack.finalize();
      }
    };
  }

  var   packHelpers             = {map,finalize,finish,ignore,entries,mapStream,dmode,fmode,readable,writable};
  if (!('finalize' in packHelpers)) {
    packHelpers.finalize = !packHelpers.finish;
  }


  var pack = tarfs.pack(tarRoot, {...packHelpers});

  if (debugOutFile) {
    if (debugOutFile === true) {
      debugOutFile = path.join(os.tmpdir(), 'get-tar-stream-debug-output.tar');
    }
    pack.pipe(fs.createWriteStream(debugOutFile));
    result.debugOutFile = debugOutFile;
  }

  if (devNull) {
    pack.pipe(writableNoopStream());
  }

  return sg.merge(result, {ok:true, pack}, {cwd: (manifest ||{}).cwd, name: (manifest ||{}).name});
}}));


// =======================================================================================================

const entryDefs_ = {
  ubuntu: {
    uname:  'root',
    gname:  'root',
  },
  def: {
    mode:   parseInt('644', 8),
    uname:  'nginx',
    gname:  'root',
  },
};

function entryDefs(argv) {
  const {distro ='ubuntu'}  = argv;
  const {name,size,mode,mtime,type,linkname,uid,gid,uname,gname,devmajor,devminor} = argv;
  return { ...entryDefs_.def, ...(entryDefs_[distro] ||{}), name,size,mode,mtime,type,linkname,uid,gid,uname,gname,devmajor,devminor};
}

