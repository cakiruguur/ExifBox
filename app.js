const prompt = require("./src/utils/prompt");
const ExifBox = require("./src/ExifBox");

async function app() {
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
