const jwt = require("jsonwebtoken");
const { JWT_EXPIRES_IN, JWT_SECRET } = require("../config/env");

function requireJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }
  return JWT_SECRET;
}

const generateToken = (userId, role, tenantId) => {
  const secret = requireJwtSecret();
  if (!JWT_EXPIRES_IN) {
    throw new Error("JWT_EXPIRES_IN is not defined");
  }

  return jwt.sign({ userId, role, tenantId }, secret, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, requireJwtSecret());
    if (typeof decoded === "string" || !decoded.userId || !decoded.tenantId) {
      return null;
    }

    return {
      userId: String(decoded.userId),
      tenantId: String(decoded.tenantId),
      role: String(decoded.role || ""),
    };
  } catch {
    return null;
  }
};

module.exports = { generateToken, verifyToken };
