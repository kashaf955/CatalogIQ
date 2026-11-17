import jwt, { type SignOptions } from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env";

export interface SessionToken {
  userId: string;
  tenantId: string;
  role: string;
  // Seconds since the epoch, from the JWT "iat" claim.
  issuedAt: number;
}

function requireJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }
  return JWT_SECRET;
}

const generateToken = (userId: string, role: string, tenantId: string) => {
  const secret = requireJwtSecret();
  if (!JWT_EXPIRES_IN) {
    throw new Error("JWT_EXPIRES_IN is not defined");
  }

  return jwt.sign({ userId, role, tenantId }, secret, {
    // e.g. "15m" or "1h"; read from the environment.
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
};

const verifyToken = (token: string | undefined): SessionToken | null => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, requireJwtSecret());
    if (typeof decoded === "string" || !decoded.userId || !decoded.tenantId) {
      return null;
    }

    return {
      userId: String(decoded.userId),
      tenantId: String(decoded.tenantId),
      role: String(decoded.role || ""),
      issuedAt: decoded.iat ?? 0,
    };
  } catch {
    return null;
  }
};

export { generateToken, verifyToken };
