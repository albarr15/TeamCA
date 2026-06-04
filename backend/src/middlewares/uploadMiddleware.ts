import type { NextFunction, Request, Response } from "express";
import multer from "multer";

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");

    if (!isCsv) {
      cb(new Error("Only .csv files are allowed."));
      return;
    }

    cb(null, true);
  },
}).single("file");

export const uploadCsv = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  csvUpload(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    const message =
      err instanceof multer.MulterError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to upload CSV.";

    res.status(400).json({ message });
  });
};
