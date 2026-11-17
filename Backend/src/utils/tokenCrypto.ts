import crypto from "crypto";
import { TOKEN_ENCRYPTION_KEY } from "../config/env";
import { HttpError } from "./httpError";

const PREFIX = "enc.v1.";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const getKey = () => {
  if (!TOKEN_ENCRYPTION_KEY) {
    const error = new HttpError("TOKEN_ENCRYPTION_KEY is not defined", 500);
    throw error;
  }

  const key = Buffer.from(TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== KEY_LENGTH) {
    const error = new HttpError("TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64", 500);
    throw error;
  }
  return key;
};

const isEncrypted = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith(PREFIX);

// Mongoose setter: null and empty values pass through unchanged.
const encryptToken = <T>(plaintext: T): T | string => {
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

const decryptToken = <T>(value: T): T | string => {
  if (value == null) return value;
  const stored = String(value);
  if (!stored || !isEncrypted(stored)) return stored;

  const payload = Buffer.from(stored.slice(PREFIX.length), "base64");
  if (payload.length <= IV_LENGTH + TAG_LENGTH) {
    const error = new HttpError("Stored access token could not be decrypted", 500);
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
    const error = new HttpError("Stored access token could not be decrypted", 500);
    throw error;
  }
};

interface TokenHolder {
  get?: (path: string, type: null, options: { getters: boolean }) => unknown;
  connection?: { accessToken?: string | null } | null;
}

// The stored (encrypted) token, without running the decrypting getter.
const storedToken = (catalog: TokenHolder | null | undefined): string => {
  if (!catalog) return "";
  if (typeof catalog.get === "function") {
    return String(catalog.get("connection.accessToken", null, { getters: false }) || "");
  }
  return catalog.connection?.accessToken || "";
};

export {
  PREFIX,
  decryptToken,
  encryptToken,
  isEncrypted,
  storedToken,
};
