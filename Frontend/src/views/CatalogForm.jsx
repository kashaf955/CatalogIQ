import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const fieldClass =
  "mt-2 w-full rounded-md border border-white/15 bg-[#1c1f24] px-3 py-2.5 text-white outline-none placeholder:text-gray-500 focus:border-indigo-400";

const templates = [
  {
    id: "our_excel",
    label: "Company catalog — Excel",
    type: "our_catalog",
    kind: "excel",
  },
  {
    id: "our_api",
    label: "Company catalog — API",
    type: "our_catalog",
    kind: "api",
  },
  {
    id: "mfr_excel",
    label: "Manufacturer — Excel",
    type: "manufacturer",
    kind: "excel",
  },
  {
    id: "comp_web",
    label: "Competitor — Website",
    type: "competitor",
    kind: "website",
  },
];

const templateIdFor = (type, kind) => {
  const match = templates.find((item) => item.type === type && item.kind === kind);
  return match?.id || "our_excel";
};

const CatalogForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "compare" ? "compare" : "company";
  const catalogsPath =
    tab === "compare" ? "/dashboard/catalogs?tab=compare" : "/dashboard/catalogs";
  const visibleTemplates = isEdit
    ? templates
    : templates.filter((item) =>
        tab === "compare"
          ? item.type === "manufacturer" || item.type === "competitor"
          : item.type === "our_catalog"
      );
  const navigate = useNavigate();
  const { role } = useSelector((state) => state.auth);
  const canManage = role === "owner" || role === "admin";

  const [templateId, setTemplateId] = useState(visibleTemplates[0].id);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [brands, setBrands] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [storeHash, setStoreHash] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [accessTokenSet, setAccessTokenSet] = useState(false);
  const [status, setStatus] = useState("active");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const template =
    templates.find((item) => item.id === templateId) ||
    visibleTemplates[0] ||
    templates[0];
  const showManufacturer = template.type === "manufacturer";
  const showWebsiteUrl = template.kind === "website";
  const showApi = template.kind === "api";
  const showExcel = template.kind === "excel";
  const showBigCommerce = showApi && platform === "bigcommerce";

  useEffect(() => {
    if (!canManage) {
      navigate(catalogsPath, { replace: true });
    }
  }, [canManage, catalogsPath, navigate]);

  useEffect(() => {
    if (!isEdit) {
      setTemplateId(visibleTemplates[0].id);
    }
  }, [tab, isEdit]);

  useEffect(() => {
    if (!isEdit) return;

    const loadCatalog = async () => {
      try {
        const response = await axios.get(`/api/v1/catalogs/${id}`, {
          withCredentials: true,
        });
        const catalog = response.data;
        if (!catalog?._id) {
          setError("Catalog not found");
          return;
        }
        setTemplateId(templateIdFor(catalog.type, catalog.connection?.kind));
        setName(catalog.name || "");
        setDescription(catalog.description || "");
        setManufacturer(catalog.manufacturer || "");
        setBrands((catalog.brands || []).join(", "));
        setUrl(catalog.url || "");
        setPlatform(catalog.connection?.platform || "");
        setStoreHash(catalog.connection?.storeHash || "");
        setAccessToken("");
        setAccessTokenSet(Boolean(catalog.connection?.accessTokenSet));
        setStatus(catalog.status || "active");
      } catch (err) {
        setError(err.response?.data?.message || "Could not load catalog");
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, [id, isEdit]);

  const handleTemplate = (nextId) => {
    setTemplateId(nextId);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (showExcel && !isEdit && !file) {
      setError("Choose an Excel or CSV file to upload");
      return;
    }

    const payload = {
      name,
      description: description || undefined,
      type: template.type,
      manufacturer: showManufacturer ? manufacturer || undefined : undefined,
      brands: brands
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      url: showWebsiteUrl || showApi ? url || undefined : undefined,
      connection: {
        kind: template.kind,
        platform: showApi ? platform || undefined : undefined,
        storeHash: showBigCommerce ? storeHash || undefined : undefined,
        accessToken: showApi && accessToken ? accessToken : undefined,
      },
      status,
    };

    try {
      setSaving(true);
      let catalogId = id;
      if (isEdit) {
        await axios.put(`/api/v1/catalogs/${id}`, payload, {
          withCredentials: true,
        });
      } else {
        const created = await axios.post("/api/v1/catalogs", payload, {
          withCredentials: true,
        });
        catalogId = created.data?._id;
      }

      if (showExcel && file && catalogId) {
        const form = new FormData();
        form.append("file", file);
        await axios.post(`/api/v1/catalogs/${catalogId}/ingest`, form, {
          withCredentials: true,
        });
        navigate(`/dashboard/products?source=${catalogId}`);
        return;
      }

      navigate(catalogId ? `/dashboard/catalogs/${catalogId}` : catalogsPath);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save catalog");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return null;

  if (loading) {
    return <p className="text-sm text-gray-400">Loading catalog...</p>;
  }

  return (
    <div className="flex justify-center py-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-indigo-400/40 bg-[#22262d] p-8 shadow-[0_0_32px_rgba(99,102,241,0.25)]"
      >
        <p className="mb-1 text-sm uppercase tracking-[0.18em] text-indigo-300">
          {tab === "compare" ? "Compare catalogs" : "Company catalog"}
        </p>
        <h1 className="mb-2 text-3xl font-semibold text-white">
          {isEdit ? "Edit catalog" : "Add catalog"}
        </h1>
        <p className="mb-6 text-gray-400">
          {tab === "compare"
            ? "Manufacturer Excel or a competitor website to match against your catalog."
            : "Your store catalog from Excel or an API."}
        </p>

        {error ? (
          <p className="mb-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <label className="mb-4 block text-sm text-gray-300">
          Source type
          <select
            className={fieldClass}
            value={templateId}
            onChange={(event) => handleTemplate(event.target.value)}
          >
            {visibleTemplates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-4 block text-sm text-gray-300">
          Name
          <input
            type="text"
            required
            placeholder="Chrome World master catalog"
            className={fieldClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="mb-4 block text-sm text-gray-300">
          Description
          <input
            type="text"
            placeholder="Optional"
            className={fieldClass}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {showManufacturer ? (
          <label className="mb-4 block text-sm text-gray-300">
            Manufacturer
            <input
              type="text"
              placeholder="Company name"
              className={fieldClass}
              value={manufacturer}
              onChange={(event) => setManufacturer(event.target.value)}
            />
          </label>
        ) : null}

        <label className="mb-4 block text-sm text-gray-300">
          Brands
          <input
            type="text"
            placeholder="Comma-separated, optional"
            className={fieldClass}
            value={brands}
            onChange={(event) => setBrands(event.target.value)}
          />
        </label>

        {showExcel ? (
          <label className="mb-4 block text-sm text-gray-300">
            Excel file
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              required={!isEdit}
              className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-indigo-500 file:px-3 file:py-1.5 file:text-sm file:text-white`}
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <span className="mt-2 block text-xs text-gray-400">
              {file
                ? file.name
                : isEdit
                  ? "Optional. Upload to replace products for this source."
                  : "Required. First row should be column headers (Name, SKU, Brand, Price…)."}
            </span>
          </label>
        ) : null}

        {showWebsiteUrl ? (
          <label className="mb-4 block text-sm text-gray-300">
            Competitor website
            <input
              type="url"
              required
              placeholder="https://competitor.com"
              className={fieldClass}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
        ) : null}

        {showApi ? (
          <>
            <label className="mb-4 block text-sm text-gray-300">
              API platform
              <select
                className={fieldClass}
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
              >
                <option value="">Generic REST API</option>
                <option value="bigcommerce">BigCommerce</option>
              </select>
            </label>
            <label className="mb-4 block text-sm text-gray-300">
              API URL
              <input
                type="url"
                required={!showBigCommerce}
                placeholder="https://api.example.com/products"
                className={fieldClass}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </label>
            <label className="mb-4 block text-sm text-gray-300">
              API token
              <input
                type="password"
                required={!isEdit || !accessTokenSet}
                placeholder={
                  accessTokenSet
                    ? "Saved — enter a new token to replace"
                    : "Bearer or store token"
                }
                className={fieldClass}
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                autoComplete="off"
              />
            </label>
            {showBigCommerce ? (
              <label className="mb-4 block text-sm text-gray-300">
                Store hash
                <input
                  type="text"
                  required
                  placeholder="Only if this API is BigCommerce"
                  className={fieldClass}
                  value={storeHash}
                  onChange={(event) => setStoreHash(event.target.value)}
                />
              </label>
            ) : null}
          </>
        ) : null}

        <label className="mb-6 block text-sm text-gray-300">
          Status
          <select
            className={fieldClass}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : showExcel && file
              ? isEdit
                ? "Save and upload"
                : "Create and upload"
              : isEdit
                ? "Save changes"
                : "Create catalog"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          <Link
            to={catalogsPath}
            className="text-indigo-300 hover:text-indigo-200"
          >
            Back to catalogs
          </Link>
        </p>
      </form>
    </div>
  );
};

export default CatalogForm;
