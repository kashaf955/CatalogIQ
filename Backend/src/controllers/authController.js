const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Membership = require("../models/membershipModel");
const Tenant = require("../models/tenantModels");
const User = require("../models/userModel");
const { generateToken } = require("../utils/jwt");
const { slugify } = require("../utils/slugify");
const { createPasswordReset, hashToken } = require("../utils/inviteTokens");
const { sendPasswordResetEmail } = require("../services/mailService");

const findInvite = async (token) => {
  if (!token) return null;
  const membership = await Membership.findOne({
    inviteTokenHash: hashToken(token),
    status: "invited",
    inviteExpiresAt: { $gt: new Date() },
  });
  if (!membership) return null;

  const [user, tenant] = await Promise.all([
    User.findOne({ _id: membership.userId, isDeleted: false }),
    Tenant.findOne({ _id: membership.tenantId, isDeleted: false }),
  ]);
  if (!user || !tenant || tenant.status !== "active") return null;

  return { membership, user, tenant };
};

async function uniqueSlug(companyName) {
  const base = slugify(companyName);
  let slug = base;
  let suffix = 1;

  while (await Tenant.exists({ slug, isDeleted: false })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}

class AuthController {
  register = async (req, res) => {
    const { companyName, name, email, password } = req.body;

    if (!companyName || !name || !email || !password) {
      return res.status(400).json({
        message: "companyName, name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const slug = await uniqueSlug(companyName);
      const [tenant] = await Tenant.create(
        [
          {
            name: companyName,
            slug,
            email: email.toLowerCase(),
          },
        ],
        { session },
      );

      const user = new User({
        name,
        email: email.toLowerCase(),
        password,
      });
      await user.save({ session });

      const [membership] = await Membership.create(
        [
          {
            tenantId: tenant._id,
            userId: user._id,
            role: "owner",
            status: "active",
          },
        ],
        { session },
      );

      await session.commitTransaction();

      const token = generateToken(
        String(user._id),
        membership.role,
        String(tenant._id),
      );

      res.cookie("accessToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
        path: "/",
      });

      return res.status(201).json({
        message: "Workspace created",
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
        },
        tenant: {
          id: String(tenant._id),
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          status: tenant.status,
        },
        role: membership.role,
      });
    } catch (error) {
      await session.abortTransaction();

      if (error && error.code === 11000) {
        return res
          .status(409)
          .json({ message: "Email or workspace already exists" });
      }

      throw error;
    } finally {
      session.endSession();
    }
  };

  login = async (req, res) => {
    const { email, password, tenantId } = req.body;

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }

    if (tenantId && !mongoose.isValidObjectId(tenantId)) {
      return res.status(400).json({ message: "Invalid workspace" });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is inactive" });
    }

    const membershipQuery = {
      userId: user._id,
      status: "active",
    };

    if (tenantId) {
      membershipQuery.tenantId = tenantId;
    }

    let memberships = await Membership.find(membershipQuery);

    if (memberships.length === 0) {
      return res.status(403).json({ message: "No active workspace found" });
    }

    if (!tenantId && memberships.length > 1) {
      const tenants = await Tenant.find({
        _id: { $in: memberships.map((item) => item.tenantId) },
        isDeleted: false,
        status: "active",
      }).select("name slug plan status");

      if (tenants.length === 0) {
        return res.status(403).json({ message: "Workspace is not active" });
      }

      if (tenants.length > 1) {
        return res.status(409).json({
          message: "Select a workspace",
          tenants: tenants.map((tenant) => ({
            id: String(tenant._id),
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan,
            status: tenant.status,
          })),
        });
      }

      memberships = memberships.filter(
        (item) => String(item.tenantId) === String(tenants[0]._id)
      );
    }

    const membership = memberships[0];
    const tenant = await Tenant.findById(membership.tenantId);

    if (!tenant || tenant.status !== "active" || tenant.isDeleted) {
      return res.status(403).json({ message: "Workspace is not active" });
    }

    const token = generateToken(
      String(user._id),
      membership.role,
      String(tenant._id),
    );

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
      path: "/",
    });

    return res.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
      },
      tenant: {
        id: String(tenant._id),
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
      },
      role: membership.role,
    });
  };

  getInvite = async (req, res) => {
    const invite = await findInvite(req.params.token);
    if (!invite) {
      return res
        .status(404)
        .json({ message: "This invite link is invalid or has expired" });
    }

    return res.json({
      email: invite.user.email,
      name: invite.user.name,
      workspace: invite.tenant.name,
      role: invite.membership.role,
      needsPassword: !invite.user.passwordSet,
    });
  };

  acceptInvite = async (req, res) => {
    const invite = await findInvite(req.params.token);
    if (!invite) {
      return res
        .status(404)
        .json({ message: "This invite link is invalid or has expired" });
    }

    const { membership, user, tenant } = invite;

    // The link is handed out by the owner, so it may only set a password on an
    // account that never had one; it must not reset someone's real password
    // or sign them in without it.
    if (user.passwordSet) {
      membership.status = "active";
      membership.inviteTokenHash = undefined;
      membership.inviteExpiresAt = null;
      await membership.save();
      return res.json({
        message: `You joined ${tenant.name}. Sign in with your existing password.`,
        signIn: true,
      });
    }

    const { name, password } = req.body || {};
    if (typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }
    if (typeof name === "string" && name.trim()) user.name = name.trim();
    user.password = password;
    user.passwordSet = true;
    user.isVerified = true;
    await user.save();

    membership.status = "active";
    membership.inviteTokenHash = undefined;
    membership.inviteExpiresAt = null;
    await membership.save();

    const token = generateToken(
      String(user._id),
      membership.role,
      String(tenant._id),
    );

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
      path: "/",
    });

    return res.json({
      message: `Welcome to ${tenant.name}`,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
      },
      tenant: {
        id: String(tenant._id),
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
      },
      role: membership.role,
    });
  };

  forgotPassword = async (req, res) => {
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email) {
      return res.status(400).json({ message: "Enter your email" });
    }

    const user = await User.findOne({
      email,
      isDeleted: false,
      status: "active",
    });

    if (user) {
      const reset = createPasswordReset();
      await User.updateOne(
        { _id: user._id },
        { passwordResetHash: reset.hash, passwordResetExpires: reset.expiresAt }
      );
      // Not awaited, so response time does not reveal whether the account exists.
      sendPasswordResetEmail({ to: user.email, resetUrl: reset.url });
    }

    return res.json({
      message: "If that email has an account, we sent a link to reset the password.",
    });
  };

  resetPassword = async (req, res) => {
    const { password } = req.body || {};
    if (typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({
      passwordResetHash: hashToken(req.params.token),
      passwordResetExpires: { $gt: new Date() },
      isDeleted: false,
    }).select("+passwordResetHash");

    if (!user) {
      return res
        .status(400)
        .json({ message: "This reset link is invalid or has expired" });
    }

    user.password = password;
    user.passwordSet = true;
    user.isVerified = true;
    user.passwordChangedAt = new Date();
    user.passwordResetHash = undefined;
    user.passwordResetExpires = null;
    await user.save();

    return res.json({ message: "Password updated. Sign in with your new password." });
  };

  logout = async (_req, res) => {
    return res
      .clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      })
      .json({ message: "Logged out" });
  };

  me = async (req, res) =>
    res.json({
      user: req.user,
      tenant: req.tenant,
      role: req.membership?.role,
    });
}

module.exports = { AuthController };
