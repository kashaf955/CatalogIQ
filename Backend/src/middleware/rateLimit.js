const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const MINUTE = 60 * 1000;

const limiter = (options, message) =>
  rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message },
    ...options,
  });

const ipOf = (req) => ipKeyGenerator(req.ip);

// 409 means the password was right and the person still has to pick a workspace.
const loginSucceeded = (_req, res) =>
  res.statusCode < 400 || res.statusCode === 409;

const TOO_MANY_LOGINS = "Too many failed sign-in attempts. Try again in 15 minutes.";

// Keyed on IP + email so a stranger guessing passwords cannot lock the real
// person out from another network.
const loginAccountLimit = limiter(
  {
    windowMs: 15 * MINUTE,
    limit: 10,
    skipSuccessfulRequests: true,
    requestWasSuccessful: loginSucceeded,
    keyGenerator: (req) =>
      `${ipOf(req)}|${String(req.body?.email || "").toLowerCase()}`,
  },
  TOO_MANY_LOGINS
);

// Catches one address guessing across many accounts.
const loginIpLimit = limiter(
  {
    windowMs: 15 * MINUTE,
    limit: 100,
    skipSuccessfulRequests: true,
    requestWasSuccessful: loginSucceeded,
    keyGenerator: ipOf,
  },
  TOO_MANY_LOGINS
);

const registerLimit = limiter(
  { windowMs: 60 * MINUTE, limit: 10, keyGenerator: ipOf },
  "Too many sign-ups from this address. Try again later."
);

const passwordResetLimit = limiter(
  { windowMs: 15 * MINUTE, limit: 5, keyGenerator: ipOf },
  "Too many password reset requests. Try again in 15 minutes."
);

const tokenLinkLimit = limiter(
  { windowMs: 15 * MINUTE, limit: 60, keyGenerator: ipOf },
  "Too many attempts. Try again in 15 minutes."
);

// Runs after authenticate. Stops a workspace being used to send bulk email.
const inviteSendLimit = limiter(
  {
    windowMs: 60 * MINUTE,
    limit: 30,
    keyGenerator: (req) => req.tenant.id,
  },
  "Too many invites sent. Try again in an hour."
);

module.exports = {
  loginAccountLimit,
  loginIpLimit,
  registerLimit,
  passwordResetLimit,
  tokenLinkLimit,
  inviteSendLimit,
};
