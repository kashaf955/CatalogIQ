import multer from "multer";
import path from "path";
import { HttpError } from "../utils/httpError";

const allowed = new Set([".xlsx", ".xls", ".csv"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, done) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!allowed.has(ext)) {
      const error = new HttpError("Upload an .xlsx, .xls, or .csv file", 400);
      return done(error);
    }
    return done(null, true);
  },
});

export { upload };
