const Membership = require("../models/membershipModel");
const Tenant = require("../models/tenantModels");
const User = require("../models/userModel");
const { verifyToken } = require("../utils/jwt");

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken
      ? req.cookies.accessToken
      : undefined;

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
    };
    req.membership = {
      role: membership.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const role = req.membership?.role;

    if (!role || !roles.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
