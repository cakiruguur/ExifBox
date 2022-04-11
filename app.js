const prompt = require("./src/utils/prompt");
const ExifBox = require("./src/ExifBox");
const { ffmpeg } = require("./src/utils/ffmpeg");

async function app() {
  // const file = "IMG_20211130_150014_583.webp";
  // ffmpeg(file).output("yeni.jpg").run();
  // return;
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
