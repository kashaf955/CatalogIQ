import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import Membership from "../models/membershipModel";
import Tenant from "../models/tenantModels";
import User from "../models/userModel";
import { generateToken } from "../utils/jwt";
import { slugify } from "../utils/slugify";

async function uniqueSlug(companyName: string): Promise<string> {
  const base = slugify(companyName);
  let slug = base;
  let suffix = 1;

  while (await Tenant.exists({ slug, isDeleted: false })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}

export class AuthController {
  register = async (req: Request, res: Response) => {
    const { companyName, name, email, password } = req.body as {
      companyName?: string;
      name?: string;
      email?: string;
      password?: string;
    };

    if (!companyName || !name || !email || !password) {
      return res.status(400).json({
        message: "companyName, name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
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
        { session }
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
        { session }
      );

      await session.commitTransaction();

      const token = generateToken(String(user._id), membership.role, String(tenant._id));

      return res.status(201).json({
        message: "Workspace created",
        accessToken: token,
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

      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        return res.status(409).json({ message: "Email or workspace already exists" });
      }

      throw error;
    } finally {
      session.endSession();
    }
  };

  login = async (req: Request, res: Response) => {
    const { email, password, tenantId } = req.body as {
      email?: string;
      password?: string;
      tenantId?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false }).select(
      "+password"
    );

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is inactive" });
    }

    const membershipQuery: Record<string, unknown> = {
      userId: user._id,
      status: "active",
    };

    if (tenantId) {
      membershipQuery.tenantId = tenantId;
    }

    const memberships = await Membership.find(membershipQuery);

    if (memberships.length === 0) {
      return res.status(403).json({ message: "No active workspace found" });
    }

    if (!tenantId && memberships.length > 1) {
      const tenants = await Tenant.find({
        _id: { $in: memberships.map((item) => item.tenantId) },
        isDeleted: false,
      }).select("name slug plan status");

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

    const membership = memberships[0];
    const tenant = await Tenant.findById(membership.tenantId);

    if (!tenant || tenant.status !== "active" || tenant.isDeleted) {
      return res.status(403).json({ message: "Workspace is not active" });
    }

    const token = generateToken(String(user._id), membership.role, String(tenant._id));

    return res.json({
      accessToken: token,
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

  logout = async (_req: Request, res: Response) => {
    return res.json({ message: "Logged out" });
  };

  me = async (req: Request, res: Response) => {
    return res.json({
      user: req.user,
      tenant: req.tenant,
      role: req.membership?.role,
    });
  };
}
