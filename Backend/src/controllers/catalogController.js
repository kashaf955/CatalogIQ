const CatalogSource = require("../models/catalogSourceModel");
const Product = require("../models/productModel");
const { fetchBigCommerceProducts } = require("../services/bigcommerceService");
const { parseExcelProducts } = require("../services/excelService");
const { fetchWebsiteProducts } = require("../services/websiteScrapeService");
const { fetchRestProducts } = require("../services/restApiService");
const { logError } = require("../utils/logger");
const {
  encryptToken,
  isEncrypted,
  storedToken,
} = require("../utils/tokenCrypto");

const CATALOG_TYPES = ["our_catalog", "manufacturer", "competitor"];
const CONNECTION_KINDS = ["api", "csv", "excel", "feed", "website"];
const CATALOG_STATUSES = ["active", "inactive", "error"];

const upsertProducts = async (tenantId, sourceId, items, matchKey) => {
  const ops = items
    .map((item) => {
      const filter = { tenantId, sourceId, isDeleted: false };
      if (matchKey === "bigcommerceId") {
        const bigcommerceId = item.attributes?.bigcommerceId;
        if (bigcommerceId == null || bigcommerceId === "") return null;
        filter["attributes.bigcommerceId"] = bigcommerceId;
      } else {
        if (!item.sku) return null;
        filter.sku = item.sku;
      }
      return {
        updateOne: {
          filter,
          update: {
            $set: {
              ...item,
              tenantId,
              sourceId,
              isDeleted: false,
              deletedAt: null,
            },
          },
          upsert: true,
        },
      };
    })
    .filter(Boolean);
  if (ops.length === 0) {
    return { upsertedCount: 0, modifiedCount: 0 };
  }
  return Product.bulkWrite(ops);
};

const connectionFrom = (body, existing) => {
  const incoming = body?.connection || {};
  const current =
    existing?.connection?.toObject?.({ getters: false }) ||
    existing?.connection ||
    {};
  const next = {
    kind: CONNECTION_KINDS.includes(incoming.kind) ? incoming.kind : current.kind,
    platform:
      incoming.platform !== undefined ? incoming.platform : current.platform,
    storeHash:
      incoming.storeHash !== undefined ? incoming.storeHash : current.storeHash,
    columnMap:
      incoming.columnMap !== undefined ? incoming.columnMap : current.columnMap,
  };
  if (incoming.accessToken) {
    next.accessToken = encryptToken(incoming.accessToken);
  } else {
    const stored = storedToken(existing) || current.accessToken;
    if (stored) next.accessToken = encryptToken(stored);
  }
  return next;
};

const catalogFieldsFrom = (body, existing) => {
  const fields = {};
  if (body.name !== undefined) fields.name = body.name;
  if (body.description !== undefined) fields.description = body.description;
  if (CATALOG_TYPES.includes(body.type)) fields.type = body.type;
  if (body.manufacturer !== undefined) fields.manufacturer = body.manufacturer;
  if (Array.isArray(body.brands)) fields.brands = body.brands;
  if (body.url !== undefined) fields.url = body.url;
  if (CATALOG_STATUSES.includes(body.status)) fields.status = body.status;
  if (body.connection !== undefined || existing) {
    fields.connection = connectionFrom(body, existing);
  }
  return fields;
};

const publicCatalog = (catalog) => {
  if (!catalog) return null;
  const data = catalog.toObject
    ? catalog.toObject({ getters: false })
    : { ...catalog };
  if (data.connection) {
    data.connection = { ...data.connection };
    data.connection.accessTokenSet = Boolean(data.connection.accessToken);
    delete data.connection.accessToken;
  }
  return data;
};

const sealStoredToken = async (catalog) => {
  const stored = storedToken(catalog);
  if (!stored || isEncrypted(stored)) return;
  catalog.set("connection.accessToken", stored);
  await catalog.save();
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
      logError("catalogs.list", error);
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
      logError("catalogs.get", error, { id: req.params.id });
      return res.status(500).json({ message: error.message });
    }
  },

  createCatalog: async (req, res) => {
    try {
      const payload = catalogFieldsFrom(req.body);
      if (!payload.name || !payload.type) {
        return res.status(400).json({ message: "Name and type are required" });
      }
      payload.tenantId = req.tenant.id;
      const catalog = await CatalogSource.create(payload);
      const created = await CatalogSource.findById(catalog._id).select(
        "+connection.accessToken"
      );
      return res.status(201).json(publicCatalog(created));
    } catch (error) {
      logError("catalogs.create", error);
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

      const catalog = await CatalogSource.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.tenant.id, isDeleted: false },
        catalogFieldsFrom(req.body, existing),
        { new: true }
      ).select("+connection.accessToken");

      return res.status(200).json(publicCatalog(catalog));
    } catch (error) {
      logError("catalogs.update", error, { id: req.params.id });
      return res.status(500).json({ message: error.message });
    }
  },

  deleteCatalog: async (req, res) => {
    try {
      const catalog = await CatalogSource.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.tenant.id, isDeleted: false },
        {
          isDeleted: true,
          deletedAt: new Date(),
          "connection.accessToken": "",
        },
        { new: true }
      );
      return res.status(200).json(publicCatalog(catalog));
    } catch (error) {
      logError("catalogs.delete", error, { id: req.params.id });
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

      await sealStoredToken(catalog);

      const kind = catalog.connection?.kind;
      const platform = String(catalog.connection?.platform || "").toLowerCase();
      console.log(
        `[ingest] catalog=${catalog._id} name="${catalog.name}" kind=${kind || "none"} platform=${platform || "none"} url=${catalog.url || "none"}`
      );
      let fetched = [];
      let matchKey = "sku";
      let label = "Products imported";

      if (kind === "excel" || kind === "csv") {
        if (!req.file?.buffer) {
          return res.status(400).json({ message: "Upload an Excel or CSV file" });
        }
        fetched = parseExcelProducts(req.file.buffer);
        matchKey = "sku";
        label = "Excel products imported";
      } else if (kind === "api" && platform === "bigcommerce") {
        fetched = await fetchBigCommerceProducts({
          storeHash: catalog.connection.storeHash,
          accessToken: catalog.connection.accessToken,
        });
        matchKey = "bigcommerceId";
        label = "BigCommerce products imported";
      } else if (kind === "website") {
        if (!catalog.url) {
          return res.status(400).json({
            message: "Add a competitor website URL before ingesting",
          });
        }
        const companySources = await CatalogSource.find({
          tenantId: req.tenant.id,
          type: "our_catalog",
          isDeleted: false,
        }).select("_id");
        const queries = await Product.find({
          tenantId: req.tenant.id,
          sourceId: { $in: companySources.map((source) => source._id) },
          isDeleted: false,
        }).select("_id sku mpn name brand");
        fetched = await fetchWebsiteProducts({
          url: catalog.url,
          queries,
        });
        matchKey = "sku";
        label = "Competitor products imported";
      } else if (kind === "api") {
        if (!catalog.url) {
          return res.status(400).json({
            message: "Add an API URL before ingesting",
          });
        }
        fetched = await fetchRestProducts({
          url: catalog.url,
          accessToken: catalog.connection?.accessToken,
        });
        matchKey = "sku";
        label = "API products imported";
      } else {
        return res.status(400).json({
          message: "This source has no ingest method",
        });
      }

      if (fetched.length === 0) {
        catalog.status = "active";
        await catalog.save();
        return res.status(200).json({
          message: "No products found in this source",
          imported: 0,
        });
      }

      const result = await upsertProducts(
        req.tenant.id,
        catalog._id,
        fetched,
        matchKey
      );
      catalog.status = "active";
      await catalog.save();

      console.log(
        `[ingest] done catalog=${catalog._id} imported=${fetched.length} upserted=${result.upsertedCount} modified=${result.modifiedCount}`
      );
      return res.status(200).json({
        message: label,
        imported: fetched.length,
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
      });
    } catch (error) {
      logError("ingest", error, { id: req.params.id });
      return res.status(error.status || 500).json({ message: error.message });
    }
  },
};

module.exports = catalogController;
