const canvas = require("canvas");
const ffmpeg = require("../utils/ffmpeg");
const sharp = require("sharp");
const fsp = require("fs/promises");
const { parse } = require("path");
const color = require("@colors/colors");
const { existsSync } = require("fs");
const sendError = require("../errors/errorHandler");

class ConvertService {
  constructor(file) {
    this.file = file;
  }
  static async organizer(file) {
    const service = new ConvertService();
    const ext = file.ext.slice(1).toLowerCase()
    if (file.MIMEType.includes("image")) {
      if (ext == 'webp' || ext == 'png') return await service.imageConvert({fileObj})
      if (ext == "bmp") return await service.ffmpegToJpeg(file);
    } else if (file.MIMEType.includes("video")) {
      if (file.MIMEType != "video/mp4") return await this.videoConvert(file);
    } else {
      sendError('Dosya tipi uygun değil', 'ConvertService', true)
    }
  }
  async canvasImage(file) {
    try {
      const image = await canvas.loadImage(file.buf);
      const img = canvas.createCanvas(image.width, image.height);
      const ctx = img.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const buffer = img.toBuffer("image/jpeg");
      await fsp.writeFile(`${file.dir}/${file.name}_output.jpg`, buffer);
      await this.fileMoves(file, "jpg");
      console.log(color.green(`Canvas ile ${file.base} dosyası oluşturuldu`));
    } catch (error) {
      sendError(error.message, "CanvasImage");
    }
  }
  ffmpegToJpeg(fileObj) {
    const file = fileObj || this.file
    return new Promise((resolve, reject) => {
      ffmpeg(`${file.dir}/${file.base}`)
        .outputOptions(["-q:v", "1"])
        .output(`${file.dir}/${file.name}_output.jpg`)
        .on("start", (command) => {
          console.log("Image dönüştürme başladı ->", command);
        })
        .on("end", async () => {
          await this.fileMoves(file, "jpg");
          console.log(color.green(`Ffmpeg ile ${file.base} dosyası oluşturuldu`));
          return resolve();
        })
        .on("error", (err) => {
          return reject(err);
        })
        .run();
    });
  }
  videoConvert(file) {
    return new Promise((resolve, reject) => {
      const { outOptions, outExt } = this.videoFormatter(file.ext);
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
  }
  videoFormatter(ext) {
    switch (ext.toLowerCase()) {
      case ".wmv":
        return {
          outOptions: ["-c:v", "libx264", "-crf", "23", "-c:a", "aac", "-q:a", "100"],
          outExt: ".mp4",
        };
        break;
      case ".avi":
        return {
          outOptions: ["-c:v", "copy", "-c:a", "copy"],
          outExt: ".mov",
        };
        break;
      case ".mp4":
        return {
          outOptions: ["-c:v", "copy", "-c:a", "copy"],
          outExt: ".mov",
        };
        break;
      case ".vob":
        return {
          outOptions: [],
          outExt: ".mp4",
        };
        break;
      default:
        sendError("Desteklenmeyen dosya formatı", "videoFormatter");
        break;
    }
  }
  async imageConvert({ fileObj, format = "jpg", quality = 90 }) {
    const file = fileObj || this.file
    try {
      const buffer = await sharp(file.buf).toFormat(format, { quality }).toBuffer();
      await fsp.writeFile(`${file.dir}/${file.name}_output.${format}`, buffer);
      await this.fileMoves(file,format)
      console.log(`Sharp ile ${file.base} dosyası oluşturuldu`);
    } catch (error) {
      sendError(error, "imageConvert");
    }
  }
  async fileMoves(file, ext, mime) {
    const destDir = file.destFolder ? `${parse(destFolder).name}/` : "";
    await fsp.mkdir(`${file.dir}/original/${destDir}otherMIME`, { recursive: true });
    await fsp.rename(`${file.dir}/${file.base}`, `${file.dir}/original/${destDir}otherMIME/${file.base}`);
    file.base = `${file.name}_output.${ext}`;
    file.ext = `.${ext}`;
    if (mime) file.MIMEType = mime;
  }
}

module.exports = ConvertService;
