const crypto = require("crypto");
const Membership = require("../models/membershipModel");
const User = require("../models/userModel");

const INVITE_ROLES = ["admin", "reviewer", "member"];

class TenantController {
  addMembership = async (req, res) => {
    try {
      const { email, name, role } = req.body;
      const tenantId = req.tenant.id;

      if (!email || !role) {
        return res.status(400).json({ message: "email and role are required" });
      }

      if (!INVITE_ROLES.includes(role)) {
        return res.status(400).json({
          message: "Invalid role. Use admin, reviewer, or member",
        });
      }

      let user = await User.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
      });

      let createdUser = false;

      if (!user) {
        const inviteName = name || email.split("@")[0];
        user = new User({
          name: inviteName,
          email: email.toLowerCase(),
          password: crypto.randomBytes(32).toString("hex"),
        });
        await user.save();
        createdUser = true;
      }

      const membership = await Membership.create({
        tenantId,
        userId: user._id,
        role,
        status: createdUser ? "invited" : "active",
      });

      return res.status(201).json({
        message: createdUser ? "Member invited" : "Member added",
        membership: {
          id: String(membership._id),
          tenantId: String(membership.tenantId),
          userId: String(membership.userId),
          role: membership.role,
          status: membership.status,
        },
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      if (error && error.code === 11000) {
        return res.status(409).json({ message: "User is already a member of this workspace" });
      }
      throw error;
    }
  };

  listMembers = async (req, res) => {
    const members = await Membership.find({ tenantId: req.tenant.id }).populate(
      "userId",
      "name email status"
    );

    return res.json({
      members: members.map((item) => ({
        id: String(item._id),
        role: item.role,
        status: item.status,
        user: item.userId
          ? {
              id: String(item.userId._id),
              name: item.userId.name,
              email: item.userId.email,
              status: item.userId.status,
            }
          : null,
      })),
    });
  };
}

module.exports = { TenantController };
