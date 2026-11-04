// One-off: CatalogIQ now has only owner and manager roles. Move every admin
// and reviewer membership to manager.
// Run with: npm run migrate:roles
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/database");
const Membership = require("../src/models/membershipModel");

const run = async () => {
  await connectDB();

  // Bypass schema validation; "admin" and "reviewer" are no longer in the enum.
  const result = await Membership.collection.updateMany(
    { role: { $in: ["admin", "reviewer"] } },
    { $set: { role: "manager" } }
  );

  console.log(`[migrate:roles] moved ${result.modifiedCount} memberships to manager`);
};

run()
  .catch((error) => {
    console.error("[migrate:roles] failed", error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
