import type { Request, Response } from "express";
import CatalogSource, { type CatalogDocument, type CatalogRecord } from "../models/catalogSourceModel";
import type { QueryFilter, UpdateQuery } from "mongoose";
import Product, { type ProductRecord } from "../models/productModel";
import { fetchBigCommerceProducts } from "../services/bigcommerceService";
import { parseExcelProducts } from "../services/excelService";
import { fetchWebsiteProducts } from "../services/websiteScrapeService";
import { fetchRestProducts } from "../services/restApiService";
import { logError } from "../utils/logger";
import { beginIngest, abortIngestJob, endIngest } from "../utils/ingestJobs";
import { encryptToken, isEncrypted, storedToken } from "../utils/tokenCrypto";
import { IngestAbortedError, errorMessage, errorStatus } from "../utils/httpError";
import { field, isObject, type JsonObject } from "../utils/json";
import type { Id, ProductInput } from "../types/domain";

const CATALOG_TYPES: unknown[] = ["our_catalog", "manufacturer", "competitor"];
const CONNECTION_KINDS: unknown[] = ["api", "csv", "excel", "feed", "website"];
const CATALOG_STATUSES: unknown[] = ["active", "inactive", "error"];

// How re-imported products are matched to the ones already saved.
type MatchKey = "sku" | "bigcommerceId";

const upsertProducts = async (
  tenantId: Id,
  sourceId: Id,
  items: ProductInput[],
  matchKey: MatchKey
) => {
  const ops = items
    .map((item) => {
      const filter: QueryFilter<ProductRecord> = { tenantId, sourceId, isDeleted: false };
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
          // Mongoose's update types reject null for a Date path, but the
          // schema default is null and restoring a deleted product resets it.
          update: {
            $set: {
              ...item,
              tenantId,
              sourceId,
              isDeleted: false,
              deletedAt: null,
            },
          } as UpdateQuery<ProductRecord>,
          upsert: true,
        },
      };
    })
    .filter((op) => op !== null);
  if (ops.length === 0) {
    return { upsertedCount: 0, modifiedCount: 0 };
  }
  return Product.bulkWrite(ops);
};

// The stored connection (with a nested path it may or may not be a subdocument).
const currentConnection = (existing: CatalogDocument | null | undefined): JsonObject => {
  const connection: unknown = existing?.connection;
  const toObject = field(connection, "toObject");
  const plain =
    typeof toObject === "function"
      ? (toObject as (options: { getters: boolean }) => unknown).call(connection, { getters: false }) || connection
      : connection;
  return isObject(plain) ? plain : {};
};

const connectionFrom = (body: JsonObject | undefined, existing?: CatalogDocument | null) => {
  const incomingRaw = field(body, "connection");
  const incoming: JsonObject = isObject(incomingRaw) ? incomingRaw : {};
  const current = currentConnection(existing);
  const next: JsonObject = {
    kind: CONNECTION_KINDS.includes(incoming.kind) ? incoming.kind : current.kind,
    platform:
      incoming.platform !== undefined ? incoming.platform : current.platform,
    storeHash:
      incoming.storeHash !== undefined ? incoming.storeHash : current.storeHash,
    columnMap:
      incoming.columnMap !== undefined ? incoming.columnMap : current.columnMap,
  };
  if (incoming.accessToken) {
    next.accessToken = encryptToken(String(incoming.accessToken));
  } else {
    const stored = storedToken(existing) || current.accessToken;
    if (stored) next.accessToken = encryptToken(stored);
  }
  return next;
};

const catalogFieldsFrom = (body: JsonObject, existing?: CatalogDocument | null) => {
  const fields: JsonObject = {};
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

// The catalog as sent to the browser: the access token never leaves the server.
const publicCatalog = (catalog: CatalogDocument | CatalogRecord | null) => {
  if (!catalog) return null;
  const data: JsonObject =
    "toObject" in catalog && typeof catalog.toObject === "function"
      ? catalog.toObject({ getters: false })
      : { ...catalog };
  if (isObject(data.connection)) {
    const connection: JsonObject = { ...data.connection };
    connection.accessTokenSet = Boolean(connection.accessToken);
    delete connection.accessToken;
    data.connection = connection;
  }
  return data;
};

const sealStoredToken = async (catalog: CatalogDocument) => {
  const stored = storedToken(catalog);
  if (!stored || isEncrypted(stored)) return;
  catalog.set("connection.accessToken", stored);
  await catalog.save();
};

const catalogController = {
  getCatalog: async (req: Request, res: Response) => {
    try {
      const catalogs = await CatalogSource.find({
        tenantId: req.tenant.id,
        isDeleted: false,
      });
      return res.status(200).json(catalogs.map(publicCatalog));
    } catch (error) {
      logError("catalogs.list", error);
      return res.status(500).json({ message: errorMessage(error) });
    }
  },

  getCatalogById: async (req: Request, res: Response) => {
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
      return res.status(500).json({ message: errorMessage(error) });
    }
  },

  createCatalog: async (req: Request, res: Response) => {
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
      return res.status(500).json({ message: errorMessage(error) });
    }
  },

  updateCatalog: async (req: Request, res: Response) => {
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
      return res.status(500).json({ message: errorMessage(error) });
    }
  },

  deleteCatalog: async (req: Request, res: Response) => {
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
      if (!catalog) {
        return res.status(404).json({ message: "Catalog not found" });
      }

      const products = await Product.updateMany(
        {
          tenantId: req.tenant.id,
          sourceId: catalog._id,
          isDeleted: false,
        },
        { isDeleted: true, deletedAt: new Date() }
      );

      console.log(
        `[catalogs] removed ${catalog._id} products=${products.modifiedCount}`
      );
      return res.status(200).json(publicCatalog(catalog));
    } catch (error) {
      logError("catalogs.delete", error, { id: req.params.id });
      return res.status(500).json({ message: errorMessage(error) });
    }
  },

  ingestCatalog: async (req: Request, res: Response) => {
    let job: AbortController | undefined;
    let catalog: CatalogDocument | null = null;
    let fetched: ProductInput[] = [];
    let matchKey: MatchKey = "sku";
    const reply = (status: number, body: unknown) => {
      if (res.headersSent) return;
      return res.status(status).json(body);
    };

    try {
      catalog = await CatalogSource.findOne({
        _id: req.params.id,
        tenantId: req.tenant.id,
        isDeleted: false,
      }).select("+connection.accessToken");

      if (!catalog) {
        return reply(404, { message: "Catalog not found" });
      }

      await sealStoredToken(catalog);
      job = beginIngest(String(catalog._id));
      const signal = job.signal;
      const catalogId = String(catalog._id);
      req.on("close", () => abortIngestJob(catalogId));

      const kind = catalog.connection?.kind;
      const platform = String(catalog.connection?.platform || "").toLowerCase();
      console.log(
        `[ingest] catalog=${catalog._id} name="${catalog.name}" kind=${kind || "none"} platform=${platform || "none"} url=${catalog.url || "none"}`
      );
      let label = "Products imported";

      if (kind === "excel" || kind === "csv") {
        if (!req.file?.buffer) {
          return reply(400, { message: "Upload an Excel or CSV file" });
        }
        fetched = parseExcelProducts(req.file.buffer);
        matchKey = "sku";
        label = "Excel products imported";
      } else if (kind === "api" && platform === "bigcommerce") {
        fetched = await fetchBigCommerceProducts({
          storeHash: catalog.connection?.storeHash ?? undefined,
          accessToken: catalog.connection?.accessToken ?? undefined,
          signal,
        });
        matchKey = "bigcommerceId";
        label = "BigCommerce products imported";
      } else if (kind === "website") {
        if (!catalog.url) {
          return reply(400, {
            message: "Add a competitor website URL before ingesting",
          });
        }
        fetched = await fetchWebsiteProducts({
          url: catalog.url,
          signal,
          onBatch: async (chunk) => {
            if (catalog) await upsertProducts(req.tenant.id, catalog._id, chunk, "sku");
          },
        });
        matchKey = "sku";
        label = "Competitor catalog imported";
      } else if (kind === "api") {
        if (!catalog.url) {
          return reply(400, {
            message: "Add an API URL before ingesting",
          });
        }
        fetched = await fetchRestProducts({
          url: catalog.url,
          accessToken: catalog.connection?.accessToken ?? undefined,
          signal,
        });
        matchKey = "sku";
        label = "API products imported";
      } else {
        return reply(400, {
          message: "This source has no ingest method",
        });
      }

      if (fetched.length === 0) {
        catalog.status = "active";
        await catalog.save();
        return reply(200, {
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
      return reply(200, {
        message: label,
        imported: fetched.length,
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
      });
    } catch (error) {
      if (error instanceof IngestAbortedError) {
        // Save what was read before the person stopped the ingest.
        const partial = Array.isArray(error.products)
          ? (error.products as ProductInput[])
          : fetched;
        let imported = 0;
        if (catalog && partial.length > 0) {
          const result = await upsertProducts(
            req.tenant.id,
            catalog._id,
            partial,
            matchKey
          );
          imported = partial.length;
          catalog.status = "active";
          await catalog.save();
          console.log(
            `[ingest] stopped catalog=${catalog._id} imported=${imported} upserted=${result.upsertedCount}`
          );
        } else {
          console.log(`[ingest] stopped catalog=${req.params.id} imported=0`);
        }
        return reply(200, {
          message: "Ingest stopped",
          imported,
          stopped: true,
        });
      }
      logError("ingest", error, { id: req.params.id });
      return reply(errorStatus(error), { message: errorMessage(error) });
    } finally {
      if (job) endIngest(String(req.params.id), job);
    }
  },

  abortIngest: async (req: Request, res: Response) => {
    try {
      const catalog = await CatalogSource.findOne({
        _id: req.params.id,
        tenantId: req.tenant.id,
        isDeleted: false,
      }).select("_id");

      if (!catalog) {
        return res.status(404).json({ message: "Catalog not found" });
      }

      const stopped = abortIngestJob(String(catalog._id));
      console.log(
        `[ingest] abort catalog=${catalog._id} running=${stopped ? "yes" : "no"}`
      );
      return res.status(200).json({
        message: stopped
          ? "Ingest stop requested"
          : "No ingest is running for this catalog",
        stopped,
      });
    } catch (error) {
      logError("ingest.abort", error, { id: req.params.id });
      return res.status(500).json({ message: errorMessage(error) });
    }
  },
};

export default catalogController;
