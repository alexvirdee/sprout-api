/**
 * upload.middleware — multipart image upload (memory storage) for AI scans.
 * `singleImage(field)` runs multer and maps its errors to friendly 400s
 * (oversized / unsupported type / unreadable). The buffer lives in req.file;
 * nothing is written to disk.
 */

import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { AppError } from '../utils/AppError';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('UNSUPPORTED_TYPE'));
  },
});

export function singleImage(field: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(field)(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return next(AppError.badRequest('That image is too large — please use one under 8MB.'));
        }
        if (err instanceof Error && err.message === 'UNSUPPORTED_TYPE') {
          return next(AppError.badRequest('Please choose an image file (JPG or PNG).'));
        }
        return next(AppError.badRequest('We couldn’t read that image. Please try another.'));
      }
      next();
    });
  };
}
