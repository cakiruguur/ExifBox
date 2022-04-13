const chokidar = require("chokidar");
const { mkdirSync } = require("fs");
const desktop = `${require("os").homedir}/Desktop`;
const c = require("@colors/colors");

module.exports = (folder) => {
  mkdirSync(`${desktop}/${folder}`, { recursive: true });
  const watcher = chokidar.watch(`${desktop}/${folder}`, {
    alwaysStat: true,
    ignored: (path) => ["new", "original", "tmp", "error", "_output"].some((s) => path.includes(s)),
    persistent: true,
    ignoreInitial: true,
    useFsEvents: true,
    awaitWriteFinish : true,
    usePolling : true,
    interval : 1000
  });

  watcher.on("ready", () => {
    console.log(c.italic.grey(`${folder} klasörü izleniyor...`));
  });

  return watcher;
};
