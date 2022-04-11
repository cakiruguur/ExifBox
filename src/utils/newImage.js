const canvas = require("canvas");
const fsp = require("fs/promises");
const { parse } = require("path");
const sendError = require("../errors/errorHandler");

module.exports = async (file) => {
  try {
    const destDir = file.destFolder ? `${parse(file.destFolder).name}/` : "";
    const image = await canvas.loadImage(file.buf);
    const img = canvas.createCanvas(image.width, image.height);
    const ctx = img.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const buffer = img.toBuffer("image/jpeg");
    await fsp.mkdir(`${file.dir}/original/${destDir}otherMIME`, { recursive: true });
    await fsp.rename(`${file.dir}/${file.base}`, `${file.dir}/original/${destDir}otherMIME/${file.base}`);
    await fsp.writeFile(`${file.dir}/${file.base}`, buffer);
    console.log(color.green(`Canvas ile ${file.base} dosyası oluşturuldu`));
  } catch (error) {
    sendError(error.message, "NewImage");
  }
};
