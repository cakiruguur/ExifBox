const { exiftool } = require("exiftool-vendored");
const { createWriteStream, existsSync } = require("fs");
const { basename, parse, join } = require("path");
const prompt = require("prompt");
const fsp = require("fs/promises");
const { getType } = require("mime");
const { watchFolder, log } = require("./utils");
const ExifService = require("./services/ExifService");

class ExifBox {
  #destF;
  #srcF;
  bufferCount = 0;
  fnameCount = 0;

  constructor(options) {
    this.#srcF = options?.sourceFolder;
    this.#destF = options?.destFolder;
  }
  get destFolder() {
    return this.#destF;
  }
  get sourceFolder() {
    return this.#srcF;
  }
  get destFiles() {
    return (async () => {
      try {
        log.boldTitle(basename(this.destFolder), "klasöründeki dosya verileri okunuyor...");
        const files = (await fsp.readdir(this.destFolder, { withFileTypes: true })).filter((file) => file.isFile());
        const destArray = [];
        for await (const { name: destfile } of files) {
          const file = `${this.destFolder}/${destfile}`;
          const parsed = parse(file);
          const destObj = {
            ...parsed,
            MIMEType: getType(file),
            mtime: (await fsp.stat(file)).mtime,
            buf: await fsp.readFile(file),
          };
          destArray.push(destObj);
        }
        return destArray;
      } catch (error) {
        throw new Error(error);
      }
    })();
  }
  get sourceFiles() {
    return (async () => {
      try {
        log.boldTitle(basename(this.sourceFolder), "klasöründeki dosya verileri okunuyor...");
        const files = (await fsp.readdir(this.sourceFolder, { withFileTypes: true })).filter((file) => file.isFile());
        const sourceArray = [];
        for await (const { name: sourcefile } of files) {
          const file = `${this.sourceFolder}/${sourcefile}`;
          const parsed = parse(file);
          const sourceObj = {
            ...parsed,
            MIMEType: getType(file),
            mtime: (await fsp.stat(file)).mtime,
            buf: await fsp.readFile(file),
          };
          sourceArray.push(sourceObj);
        }

        if (!existsSync(`${this.sourceFolder}/stats.json`)) {
          const { jsonAsk } = await prompt.get(this.#promptSchema.jsonAsk);
          if (jsonAsk == "yes") {
            await this.statsToJson(sourceArray, this.sourceFolder);
          }
        }

        return sourceArray;
      } catch (error) {
        throw new Error(error);
      }
    })();
  }

  static async singleFile(file) {
    try {
      await ExifService.insert(file);
    } catch (error) {
      return error;
    }
  }

  static watchFolder(folder) {
    if (!folder) {
      throw new Error("Lütfen bir klasör ismi giriniz");
    }
    watchFolder(folder).on("add", async (path, stats) => {
      try {
        const parsed = parse(path);
        const fileObj = {
          ...parsed,
          path: path,
          mtime: stats.mtime,
          buf: await fsp.readFile(path),
        };

        await ExifService.insert(fileObj);
      } catch (error) {
        console.log(error.message);
      }
    });
  }

  async findNamesAndInsert(destFiles, sourceFiles) {
    try {
      for await (const destfile of destFiles) {
        if (existsSync(`${this.sourceFolder}/${destfile.base}`)) {
          let find = sourceFiles?.find((sourcefile) => sourcefile.base == destfile.base);
          await ExifService.insert(find);
        } else {
          log.error(`Kaynak klasörde ${destfile.base} dosyası bulunamadı`);
        }
      }
      if (this.fnameCount != 0) log.done(`İsmine bakılarak toplam ${this.fnameCount} dosya oluşturuldu`);
    } catch (error) {
      return error;
    }
  }

  async findBufferAndInsert() {
    try {
      let destFiles = await this.destFiles;
      let sourceFiles = await this.sourceFiles;

      const lefts = [];
      for await (const destfile of destFiles) {
        let find = sourceFiles?.find((sourcefile) => sourcefile.buf.compare(destfile.buf) === 0);
        if (find !== undefined) {
          find.destFolder = this.destFolder;
          await ExifService.insert(find);
        } else {
          lefts.push(destfile);
        }
      }

      return;
      log.done(`Buffer compare yöntemiyle ${this.bufferCount} adet dosya oluşturuldu...`);

      if (lefts.length != 0) {
        const { kalanSoru } = await prompt.get(this.#promptSchema.kalanSoru);
        if (kalanSoru == "yes") {
          await this.findNamesAndInsert(lefts, sourceFiles);
        }
      }
      exiftool.end();
      exiftool.on("end", () => {
        destFiles = [];
        sourceFiles = [];
        log.info("ExifBox kapandı");
      });
    } catch (error) {
      return error;
    }
  }

  async statsToJson(array, sourcePath) {
    try {
      const writer = createWriteStream(join(sourcePath, "stats.json"), { encoding: "utf-8" });
      writer.write("[");
      let arrayLength = array.length;
      for await (const file of array) {
        --arrayLength;
        const statObj = {
          dir: file.dir,
          base: file.base,
          ext: file.ext,
          name: file.name,
          mtime: file.mtime,
        };
        writer.write(`${JSON.stringify(statObj, null, 2)}${arrayLength == 0 ? "" : ","}`, (err) => {
          if (err) return console.log(err);
        });
      }
      writer.write("]");
      writer.end(() => {
        log.info("stats.json yazma işlemi bitti");
      });
      log.info(`${basename(sourcePath)} klasöründe stats.json dosyası oluşturuldu.`);
    } catch (error) {
      throw new Error(error);
    }
  }

  #promptSchema = {
    jsonAsk: {
      properties: {
        jsonAsk: {
          description: "Kaynak klasörde stats.json dosyası oluşturulsun mu?",
          default: "yes",
        },
      },
    },
    setExif: {
      properties: {
        mapLat: {
          description: "Map latitude değerini giriniz.",
          type: "number",
        },
        mapLong: {
          description: "Map longitude değerini giriniz",
          type: "number",
        },
      },
    },
    kalanSoru: {
      properties: {
        kalanSoru: {
          description: "Kalan dosyaları ismiyle aramak ister misiniz?",
          default: "yes",
        },
      },
    },
  };
}

module.exports = ExifBox;
