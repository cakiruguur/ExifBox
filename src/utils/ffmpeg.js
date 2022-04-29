const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

  // WEBM ffmpeg('file.webm').outputOptions(['-c:v','copy']).output('newfile.mp4').run()

module.exports = ffmpeg;
