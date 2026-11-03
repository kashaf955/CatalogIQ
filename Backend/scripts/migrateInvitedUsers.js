// One-off: accounts created by the old invite flow got a random password and
// no way to change it. Mark them so the new invite link lets them pick one.
// Run with: npm run migrate:invites
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/database");
const Membership = require("../src/models/membershipModel");
const User = require("../src/models/userModel");

const run = async () => {
  await connectDB();

  const invitedUserIds = await Membership.distinct("userId", {
    status: "invited",
  });
  const activeUserIds = await Membership.distinct("userId", {
    userId: { $in: invitedUserIds },
    status: "active",
  });
  const active = new Set(activeUserIds.map(String));
  const neverJoined = invitedUserIds.filter((id) => !active.has(String(id)));

  // Only touch accounts written before passwordSet existed.
  const result = await User.updateMany(
    { _id: { $in: neverJoined }, passwordSet: { $exists: false } },
    { passwordSet: false }
  );

  console.log(
    `[migrate:invites] marked ${result.modifiedCount} of ${neverJoined.length} pending invite accounts`
  );
  console.log(
    "[migrate:invites] open Members and click 'Copy invite link' for each pending invite"
  );
};

run()
  .catch((error) => {
    console.error("[migrate:invites] failed", error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
