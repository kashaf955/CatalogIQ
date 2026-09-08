import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env";

export type TokenPayload = {
  userId: string;
  tenantId: string;
  role: string;
};

function requireJwtSecret(): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }
  return JWT_SECRET;
}

export const generateToken = (userId: string, role: string, tenantId: string) => {
  const secret = requireJwtSecret();
  if (!JWT_EXPIRES_IN) {
    throw new Error("JWT_EXPIRES_IN is not defined");
  }

  return jwt.sign({ userId, role, tenantId }, secret, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, requireJwtSecret());
    if (typeof decoded === "string") {
      return null;
    }

    const payload = decoded as jwt.JwtPayload & TokenPayload;
    if (!payload.userId || !payload.tenantId) {
      return null;
    }

    return {
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      role: String(payload.role || ""),
    };
  } catch {
    return null;
  }
};
