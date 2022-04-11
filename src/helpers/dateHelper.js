const { ExifDateTime } = require("exiftool-vendored");

const toRaw = (mtime) => {
  if (!(mtime instanceof Date)) {
    throw new Error("Geçerli bir tarih bilgisi girmelisiniz");
  }
  const mTime = mtime.toISOString().split("T");
  const YMD = mTime[0].split("-").join(":");
  const HMS = mTime[1].split(".")[0];
  const rawDate = `${YMD} ${HMS}`;
  return rawDate;
};

const toItems = (mtime) => {
  const mTime = mtime.toISOString().split("T");
  const dateItems = {
    ye: parseInt(mTime[0].slice(0, 4)),
    mo: parseInt(mTime[0].slice(5, 7)),
    da: parseInt(mTime[0].slice(8, 10)),
    ho: parseInt(mTime[1].slice(0, 2)),
    mi: parseInt(mTime[1].slice(3, 5)),
    se: parseInt(mTime[1].slice(6, 8)),
    ms: mtime.getMilliseconds(),
    tz: 180,
  };

  return dateItems;
};

const toItemsMatched = (regex, mtime) => {
  const YMD = regex[2];
  const mTime = mtime.toISOString().split("T");
  const dateItems = {
    ye: YMD.slice(0, 4),
    mo: YMD.slice(4, 6),
    da: YMD.slice(6, 8),
    ms: mtime.getMilliseconds(),
    tz: 180,
  };
  if (regex[3].startsWith("WA")) {
    dateItems["ho"] = parseInt(mTime[1].slice(0, 2));
    dateItems["mi"] = parseInt(mTime[1].slice(3, 5));
    dateItems["se"] = parseInt(mTime[1].slice(6, 8));
  } else {
    const HMS = regex[3];
    dateItems["ho"] = HMS.slice(0, 2);
    dateItems["mi"] = HMS.slice(2, 4);
    dateItems["se"] = HMS.slice(4, 6);
  }
  return dateItems;
};

const exifDateObject = (file) => {
  const regex = file.name.match(/^(IMG|VID)[-_](\d{8})[-_](\d{6}|WA)\w*/);
  if (regex) {
    const { ye, mo, da, ho, mi, se, ms, tz } = toItemsMatched(regex, file.mtime);
    return new ExifDateTime(ye, mo, da, ho, mi, se, ms, tz, `${ye}:${mo}:${da} ${ho}:${mi}:${se}+03:00`, "UTC+3");
  } else {
    const { ye, mo, da, ho, mi, se, ms, tz } = toItems(file.mtime);
    return new ExifDateTime(ye, mo, da, ho, mi, se, ms, tz, `${toRaw(file.mtime)}+03:00`, "UTC+3");
  }
};

module.exports = {
  toItems,
  toRaw,
  exifDateObject,
};
