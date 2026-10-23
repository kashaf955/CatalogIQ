const crypto = require("crypto");
const { TOKEN_ENCRYPTION_KEY } = require("../config/env");

const PREFIX = "enc.v1.";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const getKey = () => {
  if (!TOKEN_ENCRYPTION_KEY) {
    const error = new Error("TOKEN_ENCRYPTION_KEY is not defined");
    error.status = 500;
    throw error;
  }

  const key = Buffer.from(TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== KEY_LENGTH) {
    const error = new Error(
      "TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64"
    );
    error.status = 500;
    throw error;
  }
  return key;
};

const isEncrypted = (value) =>
  typeof value === "string" && value.startsWith(PREFIX);

const encryptToken = (plaintext) => {
  if (plaintext == null) return plaintext;
  const value = String(plaintext);
  if (!value) return value;
  if (isEncrypted(value)) return value;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const payload = Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
  return PREFIX + payload.toString("base64");
};

const decryptToken = (value) => {
  if (value == null) return value;
  const stored = String(value);
  if (!stored || !isEncrypted(stored)) return stored;

  const payload = Buffer.from(stored.slice(PREFIX.length), "base64");
  if (payload.length <= IV_LENGTH + TAG_LENGTH) {
    const error = new Error("Stored access token could not be decrypted");
    error.status = 500;
    throw error;
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = payload.subarray(IV_LENGTH + TAG_LENGTH);
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    const error = new Error("Stored access token could not be decrypted");
    error.status = 500;
    throw error;
  }
};

const storedToken = (catalog) => {
  if (!catalog) return "";
  if (typeof catalog.get === "function") {
    return catalog.get("connection.accessToken", null, { getters: false }) || "";
  }
  return catalog.connection?.accessToken || "";
};

module.exports = {
  PREFIX,
  decryptToken,
  encryptToken,
  isEncrypted,
  storedToken,
};
