const { newVideo, ffmpeg, newImage } = require("./ffmpeg");
const setExif = require("./setExif");
const Canvas = require("./newImage");
const watchFolder = require('./chokidar');

module.exports = {
  Canvas,
  newVideo,
  setExif,
  watchFolder,
  ffmpeg,
  newImage
};
