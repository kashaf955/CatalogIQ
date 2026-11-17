import mongoose from "mongoose";
import { encryptToken, decryptToken } from "../utils/tokenCrypto";

const catalogSourceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["our_catalog", "manufacturer", "competitor"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    brands: {
      type: [String],
      default: [],
    },
    url: {
      type: String,
      trim: true,
    },
    connection: {
      kind: {
        type: String,
        enum: ["api", "csv", "excel", "feed", "website"],
      },
      platform: {
        type: String,
        trim: true,
      },
      storeHash: {
        type: String,
        trim: true,
      },
      accessToken: {
        type: String,
        select: false,
        set: encryptToken,
        get: decryptToken,
      },
      columnMap: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "error"],
      default: "active",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

catalogSourceSchema.index({ tenantId: 1, type: 1, name: 1 });

catalogSourceSchema.set("toJSON", {
  getters: false,
  transform(_doc, ret) {
    // The token itself never leaves the server; clients only learn if one is set.
    const connection = ret.connection as Record<string, unknown> | undefined;
    if (connection) {
      connection.accessTokenSet = Boolean(connection.accessToken);
      delete connection.accessToken;
    }
    return ret;
  },
});

const CatalogSource = mongoose.model("CatalogSource", catalogSourceSchema);

// A plain CatalogSource document, as returned by .lean().
export type CatalogRecord = mongoose.InferSchemaType<typeof catalogSourceSchema> & {
  _id: mongoose.Types.ObjectId;
};

// A loaded catalog document (with save(), set(), getters).
export type CatalogDocument = mongoose.HydratedDocumentFromSchema<typeof catalogSourceSchema>;

export default CatalogSource;
