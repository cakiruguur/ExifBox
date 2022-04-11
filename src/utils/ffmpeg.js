const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
const fsp = require("fs/promises");
const color = require("@colors/colors");
const { parse } = require("path");
const { existsSync } = require("fs");
const { videoFormatter } = require("../helpers/videoHelper");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const newVideo = (file) => {
  return new Promise((resolve, reject) => {
    const { outOptions, outExt } = videoFormatter(file.ext);
    ffmpeg(`${file.dir}/${file.base}`)
      .outputOptions(outOptions)
      .output(`${file.dir}/${file.name}${outExt}`)
      .on("start", (command) => {
        console.log("Video dönüştürme başladı ->", command);
      })
      .on("end", async () => {
        await fsp.mkdir(`${file.dir}/original/${parse(file.destFolder).name}/otherMIME`, { recursive: true });
        await fsp.rename(`${file.dir}/${file.base}`, `${file.dir}/original/${parse(file.destFolder).name}/otherMIME/${file.base}`);
        if (existsSync(`${file.destFolder}/${file.base}`)) await fsp.unlink(`${file.destFolder}/${file.base}`);
        file.base = `${file.name}${outExt}`;
        file.ext = outExt;
        return resolve();
      })
      .on("error", (err) => {
        return reject(err);
      })
      .run();
  });
};

const newImage = (file) => {
  const destDir = file.destFolder ? `${parse(file.destFolder).name}/` : "";
  return new Promise((resolve, reject) => {
    ffmpeg(`${file.dir}/${file.base}`)
      .outputOptions(["-q:v", "1"])
      .output(`${file.dir}/${file.name}_output.jpg`)
      .on("start", (command) => {
        console.log("Image dönüştürme başladı ->", command);
      })
      .on("end", async () => {
        await fsp.mkdir(`${file.dir}/original/${destDir}otherMIME`, { recursive: true });
        await fsp.rename(`${file.dir}/${file.base}`, `${file.dir}/original/${destDir}otherMIME/${file.base}`);
        file.base = `${file.name}_output.jpg`;
        file.ext = ".jpg";
        file.MIMEType = "image/jpeg";
        console.log(color.green(`Ffmpeg ile ${file.base} dosyası oluşturuldu`));
        return resolve();
      })
      .on("error", (err) => {
        return reject(err);
      })
      .run();
  });
};

module.exports = { newVideo, newImage, ffmpeg };
