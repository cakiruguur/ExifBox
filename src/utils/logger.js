const c = require("@colors/colors");
const log = console.log.bind(console);
const schema = {
  success: c.cyan,
  info: c.italic.grey,
  warn: c.yellow,
  error: c.red,
  done: c.green,
};
// c.setTheme(schema);

const logger = function () {
  return log(...arguments);
};

for (const [k, v] of Object.entries(schema)) {
  logger[k] = (...arg) => log(v(...arg))
}

logger.boldTitle = function (title, text) {
  return log(`${c.white.bold(title)} ${c.italic(text)}`);
};

module.exports = logger;
