/**
 * Runs before any module import (jest `setupFiles`). Sets the env the app's
 * config/env requires, so importing the app in tests never fails validation.
 * (dotenv won't override these already-set values.)
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-16-characters-long';
process.env.JWT_EXPIRES_IN = '7d';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/sprout-test';
process.env.MONGODB_DB = 'sprout-test';
process.env.CLIENT_ORIGIN = 'http://localhost:8081';
// Keep the suite hermetic: never let a real .env OPENAI_API_KEY trigger a live
// AI call. Tests that exercise the AI path mock the provider explicitly.
process.env.OPENAI_API_KEY = '';
