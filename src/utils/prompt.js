const path = require("path");
const { readdir, existsSync } = require("fs");
const colors = require("@colors/colors");
const prompt = require("prompt");
prompt.message = colors.green.bold(">> ");
prompt.delimiter = "";

module.exports = async () => {
  try {
    const { dest } = await prompt.get({
      properties: {
        dest: {
          description: colors.white("Hedef klasör"),
          default : "asml",
          required: true,
          message: colors.bgRed.white("Klasör adı girilmelidir"),
        },
      },
    });

    const destF = path.join(require("os").homedir(), "Desktop", dest);

    if (!existsSync(destF))
      throw new Error(colors.bgRed.white("Hedef klasör mevcut değildir !!"));

    const { src } = await prompt.get({
      properties: {
        src: {
          description: colors.white("Kaynak klasör"),
          default : "Fotolar2",
          required: true,
          message: colors.bgRed.white("Klasör adı girilmelidir"),
        },
      },
    });

    const srcF = path.join(require("os").homedir(), "Desktop", src);

    if (!existsSync(srcF))
      throw new Error(colors.bgRed.white("Kaynak klasör mevcut değildir !!"));

    return {
      destF,
      srcF,
    };

  } catch (error) {
    console.log(error.message)
  }
};
