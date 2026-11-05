const crypto = require("crypto");
const Membership = require("../models/membershipModel");
const User = require("../models/userModel");
const Tenant = require("../models/tenantModels");
const { createInvite } = require("../utils/inviteTokens");
const { sendInviteEmail } = require("../services/mailService");

// Owner is set at sign-up and cannot be handed out through an invite.
const INVITE_ROLES = ["manager"];

class TenantController {
  addMembership = async (req, res) => {
    try {
      const { email, name, role } = req.body;
      const tenantId = req.tenant.id;

      if (typeof email !== "string" || !email.includes("@") || !role) {
        return res.status(400).json({ message: "email and role are required" });
      }

      if (!INVITE_ROLES.includes(role)) {
        return res.status(400).json({
          message: "Invalid role. Invite people as manager",
        });
      }

      let user = await User.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
      });

      if (!user) {
        user = new User({
          name: name || email.split("@")[0],
          email: email.toLowerCase(),
          password: crypto.randomBytes(32).toString("hex"),
          passwordSet: false,
        });
        await user.save();
      }

      // Everyone has to accept, so nobody is added to a workspace without
      // agreeing to it. The reply is the same whether or not the email already
      // has an account, so this cannot be used to find out who has one.
      const invite = createInvite();
      const membership = await Membership.create({
        tenantId,
        userId: user._id,
        role,
        status: "invited",
        inviteTokenHash: invite.hash,
        inviteExpiresAt: invite.expiresAt,
      });

      const emailSent = await sendInviteEmail({
        to: user.email,
        inviterName: req.user.name,
        workspace: req.tenant.name,
        role,
        inviteUrl: invite.url,
        hasAccount: user.passwordSet,
      });

      return res.status(201).json({
        message: emailSent
          ? `Invite emailed to ${user.email}.`
          : "Invite created, but the email could not be sent. Share the link below.",
        emailSent,
        // Only handed back when email failed: the link page shows whether the
        // person already has an account.
        inviteUrl: emailSent ? null : invite.url,
        inviteExpiresAt: invite.expiresAt,
        membership: {
          id: String(membership._id),
          role: membership.role,
          status: membership.status,
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
        inviteExpiresAt: item.inviteExpiresAt,
        // Until they accept, only the email the owner typed is shown.
        user: !item.userId
          ? null
          : item.status === "invited"
            ? { email: item.userId.email }
            : {
                id: String(item.userId._id),
                name: item.userId.name,
                email: item.userId.email,
                status: item.userId.status,
              },
      })),
    });
  };

  regenerateInvite = async (req, res) => {
    const membership = await Membership.findOne({
      _id: req.params.memberId,
      tenantId: req.tenant.id,
    });

    if (!membership) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (membership.status !== "invited") {
      return res.status(400).json({ message: "This member already joined" });
    }

    const invite = createInvite();
    membership.inviteTokenHash = invite.hash;
    membership.inviteExpiresAt = invite.expiresAt;
    await membership.save();

    const user = await User.findById(membership.userId);
    const emailSent = user
      ? await sendInviteEmail({
          to: user.email,
          inviterName: req.user.name,
          workspace: req.tenant.name,
          role: membership.role,
          inviteUrl: invite.url,
          hasAccount: user.passwordSet,
        })
      : false;

    return res.json({
      message: emailSent
        ? `Invite re-sent to ${user.email}. Older links no longer work.`
        : "New invite link created, but the email could not be sent. Older links no longer work.",
      emailSent,
      inviteUrl: emailSent ? null : invite.url,
      inviteExpiresAt: invite.expiresAt,
    });
  };

  getSettings = async (req, res) => {
    return res.json({ autoAcceptScore: req.tenant.autoAcceptScore });
  };

  updateSettings = async (req, res) => {
    const raw = req.body?.autoAcceptScore;
    const autoAcceptScore =
      raw === null || raw === "" || raw === undefined ? null : Number(raw);

    if (
      autoAcceptScore !== null &&
      (!Number.isFinite(autoAcceptScore) ||
        autoAcceptScore < 0 ||
        autoAcceptScore > 100)
    ) {
      return res
        .status(400)
        .json({ message: "Auto-accept score must be between 0 and 100" });
    }

    await Tenant.updateOne({ _id: req.tenant.id }, { autoAcceptScore });
    return res.json({ autoAcceptScore });
  };
}

removeMembership = async (req, res) => {
  const membership = await Membership.findOne({
    _id: req.params.memberId,
    tenantId: req.tenant.id,
  });

  if (!membership) {
    return res.status(404).json({ message: "Member not found" });
  }

  if (membership.role === "owner") {
    return res.status(403).json({ message: "Cannot remove the owner" });
  }

  if (String(membership.userId) === req.user.id) {
    return res.status(400).json({ message: "You cannot remove yourself" });
  }

  await membership.deleteOne();

  // An account made by this invite that was never used has nothing else to keep.
  if (membership.status === "invited") {
    const user = await User.findById(membership.userId);
    const otherMemberships = await Membership.exists({ userId: membership.userId });
    if (user && !user.passwordSet && !otherMemberships) {
      await user.deleteOne();
    }
  }

  return res.json({
    message: membership.status === "invited" ? "Invite revoked" : "Member removed",
  });
};     

module.exports = { TenantController, removeMembership };