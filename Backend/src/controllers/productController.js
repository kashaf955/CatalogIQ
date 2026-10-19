const Product = require("../models/productModel");

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
      .limit(500)
      .lean();

    return res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getProducts };
