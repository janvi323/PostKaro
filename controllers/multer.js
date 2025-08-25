const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, path.join("public/images/uploads"));
    } else if (file.mimetype.startsWith("audio/")) {
      cb(null, path.join("public/audios/uploads"));
    } else {
      cb(new Error("File type not supported"), false);
    }
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype.startsWith("audio/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only images, videos, and audio files are allowed"), false);
  }
};

module.exports = multer({ storage, fileFilter });
