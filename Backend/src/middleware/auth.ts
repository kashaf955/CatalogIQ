import Membership from "../models/membershipModel";
import Tenant from "../models/tenantModels";
import User from "../models/userModel";
import { verifyToken } from "../utils/jwt";
import type { NextFunction, Request, Response } from "express";
import type { Role } from "../types/express";

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token: string | undefined = req.cookies?.accessToken || undefined;

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [account, tenant, membership] = await Promise.all([
      User.findById(decoded.userId),
      Tenant.findById(decoded.tenantId),
      Membership.findOne({
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        status: "active",
      }),
    ]);

    if (!account || account.status !== "active" || account.isDeleted) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Sessions from before a password reset stop working. JWT times are in seconds.
    if (
      account.passwordChangedAt &&
      decoded.issuedAt < Math.floor(account.passwordChangedAt.getTime() / 1000)
    ) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!tenant || tenant.status !== "active" || tenant.isDeleted) {
      return res.status(403).json({ message: "Workspace is not active" });
    }

    if (!membership) {
      return res.status(403).json({ message: "You do not belong to this workspace" });
    }

    req.user = {
      id: String(account._id),
      name: account.name,
      email: account.email,
    };
    req.tenant = {
      id: String(tenant._id),
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
      autoAcceptScore: tenant.autoAcceptScore ?? null,
    };
    req.membership = {
      role: membership.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.membership?.role;

    if (!role || !roles.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};

export { authenticate, authorize };
