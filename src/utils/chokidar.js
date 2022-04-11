const chokidar = require("chokidar");
const { mkdirSync } = require("fs");
const desktop = `${require("os").homedir}/Desktop`

module.exports = (folder) => {
  mkdirSync(`${desktop}/${folder}`, { recursive : true });
  const watcher = chokidar.watch(`${desktop}/${folder}`, {
    alwaysStat: true,
    ignored: (path) => ["new", "original","_exiftool_tmp","error","_output"].some((s) => path.includes(s)),
    persistent: true,
    ignoreInitial: true,
    useFsEvents : true,
    interval : 5000
  });

  return watcher
};
