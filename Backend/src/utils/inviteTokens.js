const crypto = require("crypto");
const { FRONTEND_URL } = require("../config/env");

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Only the hash is stored, so a leaked database cannot be used to accept invites.
const hashInviteToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

const createInvite = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    hash: hashInviteToken(token),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    url: `${FRONTEND_URL}/invite/${token}`,
  };
};

module.exports = { createInvite, hashInviteToken };
