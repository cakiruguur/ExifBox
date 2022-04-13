const {log} = require('../utils');
function handler(error, module = null,exit = false) {
  if (arguments.length == 1) {
    return log.error(error);
  }
  log.error(`${module} ->`, error);
  if(exit) process.exit(1)
}

module.exports = handler;
