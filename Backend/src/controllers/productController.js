const Product = require("../models/productModel");
const { logError } = require("../utils/logger");

const getProducts = async (req, res) => {
  try {
    const filter = {
      tenantId: req.tenant.id,
      isDeleted: false,
    };
    if (req.query.sourceId) {
      filter.sourceId = req.query.sourceId;
    }

    const products = await Product.find(filter)
      .sort({ name: 1 })
      .limit(5000)
      .lean();

    return res.status(200).json(products);
  } catch (error) {
    logError("products.list", error);
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
    const filter = {
      tenantId: req.tenant.id,
      isDeleted: false,
    };

    if (ids.length > 0) {
      filter._id = { $in: ids };
    } else if (sourceId) {
      filter.sourceId = sourceId;
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

module.exports = { getProducts, deleteProduct, deleteProductsBulk };
