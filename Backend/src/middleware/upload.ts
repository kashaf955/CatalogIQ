import multer from "multer";

const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export const catalogFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const lower = file.originalname.toLowerCase();
    if (ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv, .xlsx or .xls files are allowed"));
    }
  },
});
