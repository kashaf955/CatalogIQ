const CatalogSource = require("../models/catalogSourceModel");
const Product = require("../models/productModel");
const { fetchBigCommerceProducts } = require("../services/bigcommerceService");

const publicCatalog = (catalog) => {
  if (!catalog) return null;
  const data = catalog.toObject ? catalog.toObject() : { ...catalog };
  if (data.connection) {
    data.connection = { ...data.connection };
    data.connection.accessTokenSet = Boolean(data.connection.accessToken);
    delete data.connection.accessToken;
  }
  return data;
};

const catalogController = {
  getCatalog: async (req, res) => {
    try {
      const catalogs = await CatalogSource.find({
        tenantId: req.tenant.id,
        isDeleted: false,
      });
      return res.status(200).json(catalogs.map(publicCatalog));
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  getCatalogById: async (req, res) => {
    try {
      const catalog = await CatalogSource.findOne({
        _id: req.params.id,
        tenantId: req.tenant.id,
        isDeleted: false,
      }).select("+connection.accessToken");
      if (!catalog) {
        return res.status(404).json({ message: "Catalog not found" });
      }
      return res.status(200).json(publicCatalog(catalog));
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  createCatalog: async (req, res) => {
    try {
      const catalog = await CatalogSource.create({
        ...req.body,
        tenantId: req.tenant.id,
      });
      const created = await CatalogSource.findById(catalog._id).select(
        "+connection.accessToken"
      );
      return res.status(201).json(publicCatalog(created));
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  updateCatalog: async (req, res) => {
    try {
      const existing = await CatalogSource.findOne({
        _id: req.params.id,
        tenantId: req.tenant.id,
        isDeleted: false,
      }).select("+connection.accessToken");

      if (!existing) {
        return res.status(404).json({ message: "Catalog not found" });
      }

      const nextConnection = {
        ...(existing.connection?.toObject?.() || existing.connection || {}),
        ...(req.body.connection || {}),
      };
      if (!req.body.connection?.accessToken) {
        nextConnection.accessToken = existing.connection?.accessToken;
      }

      const catalog = await CatalogSource.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.tenant.id, isDeleted: false },
        { ...req.body, connection: nextConnection, tenantId: req.tenant.id },
        { new: true }
      ).select("+connection.accessToken");

      return res.status(200).json(publicCatalog(catalog));
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  deleteCatalog: async (req, res) => {
    try {
      const catalog = await CatalogSource.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.tenant.id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      return res.status(200).json(publicCatalog(catalog));
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  ingestCatalog: async (req, res) => {
    try {
      const catalog = await CatalogSource.findOne({
        _id: req.params.id,
        tenantId: req.tenant.id,
        isDeleted: false,
      }).select("+connection.accessToken");

      if (!catalog) {
        return res.status(404).json({ message: "Catalog not found" });
      }

      const kind = catalog.connection?.kind;
      const platform = String(catalog.connection?.platform || "").toLowerCase();

      if (kind !== "api" || platform !== "bigcommerce") {
        return res.status(400).json({
          message: "This source is not a BigCommerce API catalog",
        });
      }

      const fetched = await fetchBigCommerceProducts({
        storeHash: catalog.connection.storeHash,
        accessToken: catalog.connection.accessToken,
      });

      if (fetched.length === 0) {
        catalog.status = "active";
        await catalog.save();
        return res.status(200).json({
          message: "No products returned from BigCommerce",
          imported: 0,
        });
      }

      const ops = fetched.map((item) => ({
        updateOne: {
          filter: {
            tenantId: req.tenant.id,
            sourceId: catalog._id,
            "attributes.bigcommerceId": item.attributes.bigcommerceId,
            isDeleted: false,
          },
          update: {
            $set: {
              ...item,
              tenantId: req.tenant.id,
              sourceId: catalog._id,
              isDeleted: false,
              deletedAt: null,
            },
          },
          upsert: true,
        },
      }));

      const result = await Product.bulkWrite(ops);
      catalog.status = "active";
      await catalog.save();

      return res.status(200).json({
        message: "BigCommerce products imported",
        imported: fetched.length,
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
      });
    } catch (error) {
      return res.status(error.status || 500).json({ message: error.message });
    }
  },
};

module.exports = catalogController;
