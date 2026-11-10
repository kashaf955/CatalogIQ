const dotenv = require("dotenv");

dotenv.config();

const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/catalogiq";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;
const TRUST_PROXY = Number(process.env.TRUST_PROXY) || 0;
// ANTHROPIC_API_KEY is read by the Claude SDK itself.
const AI_MODEL = process.env.AI_MODEL || "claude-opus-5-5";
// Most new AI calls one "AI check" run may make; cached answers are free.
const AI_MAX_CHECKS = Number(process.env.AI_MAX_CHECKS) || 100;
const AI_CONCURRENCY = Number(process.env.AI_CONCURRENCY) || 3;

const assertTokenEncryptionKey = () => {
  if (!TOKEN_ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not defined");
  }
  const key = Buffer.from(TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64");
  }
};

module.exports = {
  PORT,
  MONGO_URI,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN,
  FRONTEND_URL,
  TOKEN_ENCRYPTION_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  TRUST_PROXY,
  AI_MODEL,
  AI_MAX_CHECKS,
  AI_CONCURRENCY,
  assertTokenEncryptionKey,
};
