const crypto = require("crypto");
const { FRONTEND_URL } = require("../config/env");

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

// Only the hash is stored, so a leaked database cannot be used to accept invites
// or reset passwords.
const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

const createLink = (path, ttlMs) => {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMs),
    url: `${FRONTEND_URL}/${path}/${token}`,
  };
};

const createInvite = () => createLink("invite", INVITE_TTL_MS);
const createPasswordReset = () => createLink("reset-password", RESET_TTL_MS);

module.exports = { createInvite, createPasswordReset, hashToken };
