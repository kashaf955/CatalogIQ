const Product = require("../models/productModel");
const { logError } = require("../utils/logger");

const PAGE_SIZE_DEFAULT = 100;
const PAGE_SIZE_MAX = 250;

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchFilter = (query) => {
  const needle = String(query || "").trim();
  if (!needle) return {};
  const pattern = new RegExp(escapeRegex(needle), "i");
  return {
    $or: [
      { name: pattern },
      { sku: pattern },
      { mpn: pattern },
      { gtin: pattern },
      { brand: pattern },
      { fitment: pattern },
      { category: pattern },
      { description: pattern },
      { availability: pattern },
    ],
  };
};

const getProducts = async (req, res) => {
  try {
    const filter = {
      tenantId: req.tenant.id,
      isDeleted: false,
    };
    if (req.query.sourceId) {
      filter.sourceId = req.query.sourceId;
    }

    Object.assign(filter, searchFilter(req.query.q));

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      PAGE_SIZE_MAX,
      Math.max(1, parseInt(req.query.limit, 10) || PAGE_SIZE_DEFAULT)
    );

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      products,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit) || 1),
    });
  } catch (error) {
    logError("products.list", error);
    return res.status(500).json({ message: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      tenantId: req.tenant.id,
      isDeleted: false,
    }).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json(product);
  } catch (error) {
    logError("products.get", error, { id: req.params.id });
    return res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.tenant.id,
        isDeleted: false,
      },
      { isDeleted: true, deletedAt: new Date() },
      { returnDocument: "after" }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    console.log(`[products] deleted ${product._id} sku=${product.sku || "none"}`);
    return res.status(200).json({ message: "Product removed", id: product._id });
  } catch (error) {
    logError("products.delete", error, { id: req.params.id });
    return res.status(500).json({ message: error.message });
  }
};

const deleteProductsBulk = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.filter(Boolean)
      : [];
    const sourceId = req.query.sourceId || req.body?.sourceId;
    const allMatching = req.body?.allMatching === true;
    const filter = {
      tenantId: req.tenant.id,
      isDeleted: false,
    };

    if (ids.length > 0) {
      filter._id = { $in: ids };
    } else if (allMatching || sourceId) {
      if (sourceId) filter.sourceId = sourceId;
      Object.assign(filter, searchFilter(req.query.q || req.body?.q));
    } else {
      return res.status(400).json({
        message: "Select products or a catalog source to remove",
      });
    }

    const result = await Product.updateMany(filter, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    console.log(
      `[products] deleted ${result.modifiedCount} filter=${ids.length ? `ids:${ids.length}` : `source=${sourceId}`}`
    );
    return res.status(200).json({
      message: "Products removed",
      removed: result.modifiedCount,
    });
  } catch (error) {
    logError("products.deleteBulk", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getProducts, getProduct, deleteProduct, deleteProductsBulk };
