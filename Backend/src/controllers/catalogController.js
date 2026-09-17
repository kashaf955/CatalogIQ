const CatalogSource = require("../models/catalogSourceModel");

const catalogController = {
    getCatalog: async (req, res) => {
        try {
            const catalog = await CatalogSource.find({ tenantId: req.tenant.id, isDeleted: false });  
            res.status(200).json(catalog);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
        },
    getCatalogById: async (req, res) => {
        try {
            const catalog = await CatalogSource.findOne({ _id: req.params.id, tenantId: req.tenant.id, isDeleted: false }  );
            res.status(200).json(catalog);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    createCatalog: async (req, res) => {
        try {
            const catalog = await CatalogSource.create({ ...req.body, tenantId: req.tenant.id });
            res.status(201).json(catalog);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    updateCatalog: async (req, res) => {
        try {
            const catalog = await CatalogSource.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant.id, isDeleted: false }, { ...req.body, tenantId: req.tenant.id }, { new: true });
            res.status(200).json(catalog);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    deleteCatalog: async (req, res) => {
        try {
            const catalog = await CatalogSource.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant.id, isDeleted: false }, { isDeleted: true, deletedAt: new Date(), tenantId: req.tenant.id }, { new: true });
            res.status(200).json(catalog);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = catalogController;   