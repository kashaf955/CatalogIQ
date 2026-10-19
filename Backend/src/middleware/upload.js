const multer = require("multer");
const path = require("path");

const allowed = new Set([".xlsx", ".xls", ".csv"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, done) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!allowed.has(ext)) {
      const error = new Error("Upload an .xlsx, .xls, or .csv file");
      error.status = 400;
      return done(error);
    }
    return done(null, true);
  },
});

module.exports = { upload };
