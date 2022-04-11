const videoFormatter = (ext) => {
  switch (ext.toLowerCase()) {
    case ".wmv":
      return {
        outOptions: ["-c:v", "libx264", "-crf", "23", "-c:a", "aac", "-q:a", "100"],
        outExt: ".mp4",
      };
      break;
    case ".avi":
      return {
        outOptions: ["-c:v", "copy", "-c:a", "copy"],
        outExt: ".mov",
      };
      break;
    case ".mp4":
      return {
        outOptions: ["-c:v", "copy", "-c:a", "copy"],
        outExt: ".mov",
      };
      break;
    case ".vob":
      return {
        outOptions: [],
        outExt: ".mp4",
      };
      break;
    default:
      console.log("Desteklenmeyen video formatı");
      break;
  }
};

module.exports = {
  videoFormatter,
};
