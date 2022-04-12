const { ExifTool, ExifDateTime } = require("exiftool-vendored");
const ConvertService = require("./ConvertService");
const color = require("@colors/colors");
const sendError = require("../errors/errorHandler");
const fsp = require("fs/promises");
const { existsSync, readdirSync } = require("fs");
const { parse } = require("path");
const prompt = require("prompt");

class ExifService extends ExifTool {
  constructor() {
    super({
      taskRetries: 0,
    });
  }
  async insert(file, exif) {
    this.on("taskError", async (error, task) => {
      sendError(error, "ExifInsert");
      if (task.toString().startsWith("Write")) {
        const { again } = await prompt.get({
          properties: {
            again: {
              description: `Hatalı ${file.base} dosyasına yeniden yazma denensin mi?`,
              default: "yes",
            },
          },
        });

        if (again == "yes") {
          const convert = new ConvertService();
          const newExif = await this.setExif(file);
          await convert.ffmpegToJpeg(file);
          await this.insert(file, newExif);
        } else {
            console.log('Vazgeçildi...')
        }
      }
    });
    try {
      if (!file) throw new Error("Dosya gönderilmedi");
      if (!(file instanceof Object)) throw new Error("Gönderilen parametre bir obje değil");
      const newExif = exif || (await this.setExif(file));
      await ConvertService.organizer(file);
      await this.write(`${file.dir}/${file.base}`, newExif, ["-charset", "filename=utf8", "-fast", "-a"]);
      console.log(color.italic.grey("EXIF Yazılıyor..."));
      if (file.destFolder) {
        await fsp.mkdir(`${file.destFolder}/new`, { recursive: true });
        await fsp.rename(`${file.sourceFolder}/${file.base}`, `${file.destFolder}/new/${file.base}`);
        await fsp.mkdir(`${file.sourceFolder}/original/${parse(file.destFolder).name}`, { recursive: true });
        await fsp.rename(`${file.sourceFolder}/${file.base}_original`, `${file.sourceFolder}/original/${parse(file.destFolder).name}/${file.base}`);
        if (existsSync(`${file.destFolder}/${file.base}`)) {
          await fsp.unlink(`${file.destFolder}/${file.base}`);
          console.log(color.italic.grey(`Hedef klasördeki ${file.base} dosyası silindi.`));
        }
      } else {
        await fsp.mkdir(`${file.dir}/new`, { recursive: true });
        await fsp.rename(`${file.dir}/${file.base}`, `${file.dir}/new/${file.name}${file.ext}`);
        await fsp.mkdir(`${file.dir}/original`, { recursive: true });
        await fsp.rename(`${file.dir}/${file.base}_original`, `${file.dir}/original/${file.name}${file.ext}`);
      }
      console.log(color.cyan(`Yeni ${file.base} dosyası başarıyla oluşturuldu`));
    } catch (error) {
        if(!error.stack.includes('WriteTask')) sendError(error,'ExifInsert')
    }
  }

  async setExif(file) {
    try {
      const load = await this.read(`${file.dir}/${file.base}`, ["-charset", "filename=utf8", "-fast"]);
      const dateObject = this.helpers.exifDateObject(file);
      const exifConfig = require("../exifConfig.json");
      const newExif = {};

      if (load["MIMEType"].includes("image")) {
        newExif.DateTimeOriginal = load["DateTimeOriginal"] || dateObject;
        newExif.FileModifyDate = load["DateTimeOriginal"] || dateObject;
        newExif.CreateDate = load["DateTimeOriginal"] || dateObject;
        newExif.ModifyDate = load["DateTimeOriginal"] || dateObject;
        newExif.DateAcquired = load["DateTimeOriginal"] || dateObject;

        for await (const [key, value] of Object.entries(exifConfig["IMAGE"])) {
          newExif[key] = load[key] || value;
        }
      } else if (load["MIMEType"].includes("video")) {
        newExif.CreateDate = load["CreateDate"]?.rawValue || dateObject;
        newExif.ModifyDate = load["CreateDate"]?.rawValue || dateObject;
        newExif.TrackCreateDate = load["CreateDate"]?.rawValue || dateObject;
        newExif.TrackModifyDate = load["CreateDate"]?.rawValue || dateObject;
        newExif.MediaCreateDate = load["CreateDate"]?.rawValue || dateObject;
        newExif.MediaModifyDate = load["CreateDate"]?.rawValue || dateObject;
        newExif.ContentCreateDate = load["CreateDate"]?.rawValue || dateObject;
        for await (const [key, value] of Object.entries(exifConfig["VIDEO"])) {
          newExif[key] = load[key] || value;
        }
      } else {
        throw new Error("Dosya tipi uygun değil!");
      }
      file.MIMEType = load["MIMEType"];
      return newExif;
    } catch (error) {
      sendError(error, "SetExif", true);
    }
  }

  helpers = {
    exifDateObject: (file) => {
      const regex = file.name.match(/^(IMG|VID)[-_](\d{8})[-_](\d{6}|WA)\w*/);
      if (regex) {
        const { ye, mo, da, ho, mi, se, ms, tz } = this.helpers.toItemsMatched(regex, file.mtime);
        return new ExifDateTime(ye, mo, da, ho, mi, se, ms, tz, `${ye}:${mo}:${da} ${ho}:${mi}:${se}+03:00`, "UTC+3");
      } else {
        const { ye, mo, da, ho, mi, se, ms, tz } = this.helpers.toItems(file.mtime);
        return new ExifDateTime(ye, mo, da, ho, mi, se, ms, tz, `${this.helpers.toRaw(file.mtime)}+03:00`, "UTC+3");
      }
    },
    toRaw: (mtime) => {
      if (!(mtime instanceof Date)) {
        throw new Error("Geçerli bir tarih bilgisi girmelisiniz");
      }
      const mTime = mtime.toISOString().split("T");
      const YMD = mTime[0].split("-").join(":");
      const HMS = mTime[1].split(".")[0];
      const rawDate = `${YMD} ${HMS}`;
      return rawDate;
    },
    toItems: (mtime) => {
      const mTime = mtime.toISOString().split("T");
      const dateItems = {
        ye: parseInt(mTime[0].slice(0, 4)),
        mo: parseInt(mTime[0].slice(5, 7)),
        da: parseInt(mTime[0].slice(8, 10)),
        ho: parseInt(mTime[1].slice(0, 2)),
        mi: parseInt(mTime[1].slice(3, 5)),
        se: parseInt(mTime[1].slice(6, 8)),
        ms: mtime.getMilliseconds(),
        tz: 180,
      };

      return dateItems;
    },
    toItemsMatched: (regex, mtime) => {
      const YMD = regex[2];
      const mTime = mtime.toISOString().split("T");
      const dateItems = {
        ye: YMD.slice(0, 4),
        mo: YMD.slice(4, 6),
        da: YMD.slice(6, 8),
        ms: mtime.getMilliseconds(),
        tz: 180,
      };
      if (regex[3].startsWith("WA")) {
        dateItems["ho"] = parseInt(mTime[1].slice(0, 2));
        dateItems["mi"] = parseInt(mTime[1].slice(3, 5));
        dateItems["se"] = parseInt(mTime[1].slice(6, 8));
      } else {
        const HMS = regex[3];
        dateItems["ho"] = HMS.slice(0, 2);
        dateItems["mi"] = HMS.slice(2, 4);
        dateItems["se"] = HMS.slice(4, 6);
      }
      return dateItems;
    },
  };
}
module.exports = new ExifService();
