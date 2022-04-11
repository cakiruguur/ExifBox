const {exiftool} = require('exiftool-vendored');
const {dateHelper} = require('../helpers');
const sendError = require('../errors/errorHandler');

module.exports = async (file) => {
  try {
    const load = await exiftool.read(`${file.dir}/${file.base}`, ["-charset", "filename=utf8", "-fast"]);
    const dateObject = dateHelper.exifDateObject(file);
    const exifConfig = require("../exifConfig.json");
    const newExif = {};

    if (load["MIMEType"].includes("image")) {
      newExif.DateTimeOriginal = load["DateTimeOriginal"] || dateObject;
      newExif.FileModifyDate = load["DateTimeOriginal"] || dateObject;
      newExif.CreateDate = load["DateTimeOriginal"] || dateObject;
      newExif.ModifyDate = load["DateTimeOriginal"] || dateObject;
      newExif.DateAcquired = load["DateTimeOriginal"] || dateObject;

      for await (const [key, value] of Object.entries(exifConfig["IMAGE"])) {
        newExif[key] = load[key] || value;
      }
    } else if (load["MIMEType"].includes("video")) {
      newExif.CreateDate = load["CreateDate"]?.rawValue || dateObject;
      newExif.ModifyDate = load["CreateDate"]?.rawValue || dateObject;
      newExif.TrackCreateDate = load["CreateDate"]?.rawValue || dateObject;
      newExif.TrackModifyDate = load["CreateDate"]?.rawValue || dateObject;
      newExif.MediaCreateDate = load["CreateDate"]?.rawValue || dateObject;
      newExif.MediaModifyDate = load["CreateDate"]?.rawValue || dateObject;
      newExif.ContentCreateDate = load["CreateDate"]?.rawValue || dateObject;
      for await (const [key, value] of Object.entries(exifConfig["VIDEO"])) {
        newExif[key] = load[key] || value;
      }
    } else {
      throw new Error("Dosya tipi uygun değil!");
    }
    file.MIMEType = load['MIMEType']
    return newExif;
  } catch (error) {
    sendError(error, 'SetExif', true)
  }
};