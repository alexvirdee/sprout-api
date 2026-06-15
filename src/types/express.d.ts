/**
 * Augment Express' Request with the authenticated user id set by the auth
 * middleware. Importing nothing keeps this a global augmentation.
 */

import 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
