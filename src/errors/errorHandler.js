const colors = require("@colors/colors");

function handler(error, module = null,exit = false) {
  if (arguments.length == 1) {
    return console.error(colors.red(error));
  }
  console.error(colors.red(`${module} ->`, error));
  if(exit) process.exit(1)
}

module.exports = handler;
