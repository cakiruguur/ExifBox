const prompt = require("./src/utils/prompt");
const ExifBox = require("./src/ExifBox");
const {readdir} = require('fs/promises');
const { resolve } = require('path');
const { ffmpeg } = require("./src/utils");

async function app() {
  // const file = "DSCF3836.mov"
  // ffmpeg(file).outputOptions(["-qscale", 0]).output('yeni.mp4').run()
  // return
  switch (process.argv[2]) {
    case "watchFolder":
      try {
        const folder = process.argv[3];
        ExifBox.watchFolder(folder);
      } catch (error) {
        console.log(error.message);
      }
      break;
    case "withName":
      break;
    case "withBuffer":
      const { destF, srcF } = await prompt();
      try {
        const exifbox = new ExifBox({
          destFolder: destF,
          sourceFolder: srcF,
        });
        await exifbox.findBufferAndInsert();
      } catch (error) {
        console.log(error);
      }
      break;
    default:
      console.log("Parametre girin");
      break;
  }
}

app();
