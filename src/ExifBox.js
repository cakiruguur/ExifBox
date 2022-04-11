const { exiftool } = require("exiftool-vendored");
const { createWriteStream, existsSync, readdirSync } = require("fs");
const { basename, parse, join } = require("path");
const prompt = require("prompt");
const fsp = require("fs/promises");
const { getType } = require("mime");
const color = require("@colors/colors");
const { newVideo, newImage, setExif, watchFolder, Canvas } = require("./utils");

class ExifBox {
  #destF;
  #srcF;
  bufferCount = 0;
  fnameCount = 0;
  errorFiles = [];

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
        console.log(`${color.white.bold(basename(this.destFolder))} ${color.italic("klasöründeki dosya verileri okunuyor...")}`);
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
        console.log(`${color.white.bold(basename(this.sourceFolder))} ${color.italic("klasöründeki dosya verileri okunuyor...")}`);
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
      await this.exifInsert(file);
    } catch (error) {
      return error;
    }
  }

  static watchFolder(folder) {
    if (!folder) {
      throw new Error("Lütfen bir klasör ismi giriniz");
    }
    console.log(`${folder} klasörü izleniyor...`);
    const exifbox = new ExifBox();
    watchFolder(folder).on("add", async (path, stats) => {
      try {
        const parsed = parse(path);
        const fileObj = {
          ...parsed,
          path: path,
          mtime: stats.mtime,
          buf: await fsp.readFile(path),
        };

        await exifbox.exifInsert(fileObj);
      } catch (error) {
        console.log(error.message);
      }
    });
  }

  async exifInsert(file) {
    try {
      if (!file) throw new Error("Dosya gönderilmedi");
      if (!(file instanceof Object)) throw new Error("Gönderilen parametre bir obje değil");
      const newExif = await setExif(file);
      if (file.ext.includes("webp")) {
        await newImage(file);
      }
      if (file.MIMEType.includes("image") && file.MIMEType != "image/jpeg") {
        await Canvas(file);
      }
      if (file.MIMEType.includes("video") && file.MIMEType != "video/mp4") {
        await newVideo(file);
      }
      await exiftool.write(`${file.dir}/${file.base}`, newExif, ["-charset", "filename=utf8", "-fast", "-a"]);
      console.log(color.italic.grey("EXIF Yazılıyor..."));

      if (this.destFolder) {
        await fsp.mkdir(`${this.destFolder}/new`, { recursive: true });
        await fsp.rename(`${this.sourceFolder}/${file.base}`, `${this.destFolder}/new/${file.base}`);
        await fsp.mkdir(`${this.sourceFolder}/original/${parse(this.destFolder).name}`, { recursive: true });
        await fsp.rename(`${this.sourceFolder}/${file.base}_original`, `${this.sourceFolder}/original/${parse(this.destFolder).name}/${file.base}`);
        if (existsSync(`${this.destFolder}/${file.base}`)) {
          await fsp.unlink(`${this.destFolder}/${file.base}`);
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
      console.log("Yazma Hatası ->", file.base, "-", error.message.split("-")[0]);
      if (existsSync(`${file.dir}/${file.base}_original`)) {
        await fsp.unlink(`${file.dir}/${file.base}`);
        await fsp.rename(`${file.dir}/${file.base}_original`, `${file.dir}/${file.base}`);
      }
      if (this.destFolder) {
        await fsp.mkdir(`${this.destFolder}/error`, { recursive: true });
        await fsp.rename(`${this.destFolder}/${file.base}`, `${this.destFolder}/error/${file.base}`);
      } else {
        if (!existsSync(`${file.dir}/error`)) await fsp.mkdir(`${file.dir}/error`);
        await fsp.rename(`${file.dir}/${file.base}`, `${file.dir}/error/${file.base}`);
      }
    }
  }

  async againWrite(file) {
    // ------ Yeniden Yazma Denemesi ------

    const { again } = await prompt.get({
      properties: {
        again: {
          description: `Hatalı ${file.base} dosyasına yeniden yazma denensin mi?`,
          default: "yes",
        },
      },
    });

    if (again == "yes") {
      try {
        await fsp.mkdir(`${this.sourceFolder}/error`, { recursive: true });
        // Hatalı dosyalar error klasörüne kopyalanıyor
        await fsp.copyFile(`${this.sourceFolder}/${file.base}`, `${this.sourceFolder}/error/${file.base}`);
        // NewExif objesi ayarlanıyor
        const newExif = await setExif(file);
        // Canvas ile yeni fotoğraf oluşturuluyor
        if (file.MIMEType.includes("image")) await newImage(file);
        if (file.MIMEType.includes("video")) {
          await fsp.unlink(`${this.sourceFolder}/${file.base}`);
          await newVideo(file);
        }
        // Yeni Exif bilgileri dosyaya yazılıyor
        await exiftool.write(`${this.sourceFolder}/${file.base}`, newExif, ["-charset", "filename=utf8", "-fast"]);
        // Rewrite klasöründeki original dosyası siliniyor
        await fsp.unlink(`${this.sourceFolder}/${file.base}_original`);
        console.log(color.italic.grey(`${file.base}_original dosyası silindi.`));
        // İşlem başarılıysa kaynak klasöre new klasörü oluşturuluyor
        await fsp.mkdir(`${this.destFolder}/new`, { recursive: true });
        // Yeni dosya new klasörüne kopyalanıyor
        await fsp.copyFile(`${this.sourceFolder}/${file.base}`, `${this.destFolder}/new/${file.base}`);
        // Kaynak klasörde original klasörü oluşturuluyor
        await fsp.mkdir(`${this.sourceFolder}/original/${parse(this.destFolder).name}`, { recursive: true });
        // Yeni dosya kaynak klasörde original klasörüne taşınıyor
        await fsp.rename(`${this.sourceFolder}/${file.base}`, `${this.sourceFolder}/original/${parse(this.destFolder).name}/${file.base}`);
        // Hedef error klasöründen hatalı dosya siliniyor
        await fsp.unlink(`${this.destFolder}/error/${file.ext != ".jpg" ? file.name + file.ext : file.base}`);
        console.log(color.italic.grey(`Error klasöründen ${file.ext != ".jpg" ? file.name + file.ext : file.base} dosyası silindi.`));
        console.log(color.cyan(`Yeni ${file.base} dosyası başarıyla oluşturuldu`));
        if (readdirSync(`${this.destFolder}/error`).length == 0) {
          await fsp.rmdir(`${this.destFolder}/error`);
          console.log("Hedef error klasörü silindi");
        }
      } catch (error) {
        console.log("Tekrar yazma denemesi başarısız", error);
      }
    }
  }

  async findNamesAndInsert(lefts, sourceFiles) {
    try {
      for await (const destfile of lefts) {
        if (existsSync(`${this.sourceFolder}/${destfile.base}`)) {
          let find = sourceFiles?.find((sourcefile) => sourcefile.base == destfile.base);
          await this.exifInsert(find);
        } else {
          console.log(color.italic.red(`Kaynak klasörde ${destfile.base} dosyası bulunamadı`));
        }
      }
      if (this.fnameCount != 0) console.log(`İsmine bakılarak toplam ${this.fnameCount} dosya oluşturuldu`);
    } catch (error) {
      return error;
    }
  }

  async findBufferAndInsert() {
    try {
      const destFiles = await this.destFiles;
      const sourceFiles = await this.sourceFiles;

      const lefts = [];

      for await (const destfile of destFiles) {
        let find = sourceFiles?.find((sourcefile) => sourcefile.buf.compare(destfile.buf) === 0);
        if (find !== undefined) {
          find.destFolder = this.destFolder;
          await this.exifInsert(find);
        } else {
          lefts.push(destfile);
        }
      }

      console.log(`Buffer compare yöntemiyle ${this.bufferCount} adet dosya oluşturuldu...`);

      if (lefts.length != 0) {
        const { kalanSoru } = await prompt.get(this.#promptSchema.kalanSoru);
        if (kalanSoru == "yes") {
          await this.findNamesAndInsert(lefts, sourceFiles);
        }
      }
      exiftool.end();
      exiftool.on("end", () => {
        console.log("ExifBox kapandı");
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
        console.log("stats.json yazma işlemi bitti");
      });
      console.log(`${basename(sourcePath)} klasöründe stats.json dosyası oluşturuldu.`);
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
