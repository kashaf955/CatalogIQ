import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const fieldClass =
  "mt-2 w-full rounded-md border border-white/15 bg-[#1c1f24] px-3 py-2.5 text-white outline-none placeholder:text-gray-500 focus:border-indigo-400";

const templates = [
  {
    id: "our_api",
    label: "Our catalog — BigCommerce API",
    type: "our_catalog",
    kind: "api",
    platform: "bigcommerce",
  },
  {
    id: "our_excel",
    label: "Our catalog — Excel",
    type: "our_catalog",
    kind: "excel",
    platform: "",
  },
  {
    id: "mfr_excel",
    label: "Manufacturer — Excel",
    type: "manufacturer",
    kind: "excel",
    platform: "",
  },
  {
    id: "comp_web",
    label: "Competitor — Website",
    type: "competitor",
    kind: "website",
    platform: "",
  },
];

const templateIdFor = (type, kind, platform) => {
  const match = templates.find(
    (item) =>
      item.type === type &&
      item.kind === kind &&
      (item.platform || "") === (platform || "")
  );
  return match?.id || "our_excel";
};

const CatalogForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { role } = useSelector((state) => state.auth);
  const canManage = role === "owner" || role === "admin";

  const [templateId, setTemplateId] = useState("our_api");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [brands, setBrands] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(isEdit);

  const template = templates.find((item) => item.id === templateId) || templates[0];
  const showManufacturer = template.type === "manufacturer";
  const showUrl = template.kind === "api" || template.kind === "website";

  useEffect(() => {
    if (!canManage) {
      navigate("/dashboard/catalogs", { replace: true });
    }
  }, [canManage, navigate]);

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
        setTemplateId(
          templateIdFor(
            catalog.type,
            catalog.connection?.kind,
            catalog.connection?.platform
          )
        );
        setName(catalog.name || "");
        setDescription(catalog.description || "");
        setManufacturer(catalog.manufacturer || "");
        setBrands((catalog.brands || []).join(", "));
        setUrl(catalog.url || "");
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

    const payload = {
      name,
      description: description || undefined,
      type: template.type,
      manufacturer: showManufacturer ? manufacturer || undefined : undefined,
      brands: brands
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      url: showUrl ? url || undefined : undefined,
      connection: {
        kind: template.kind,
        platform: template.platform || undefined,
      },
      status,
    };

    try {
      if (isEdit) {
        await axios.put(`/api/v1/catalogs/${id}`, payload, {
          withCredentials: true,
        });
      } else {
        await axios.post("/api/v1/catalogs", payload, {
          withCredentials: true,
        });
      }
      navigate("/dashboard/catalogs");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save catalog");
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
          Workspace
        </p>
        <h1 className="mb-2 text-3xl font-semibold text-white">
          {isEdit ? "Edit catalog" : "Add catalog"}
        </h1>
        <p className="mb-6 text-gray-400">
          Save a source. Ingest and matching come later.
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
            {templates.map((item) => (
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

        {showUrl ? (
          <label className="mb-4 block text-sm text-gray-300">
            {template.kind === "website" ? "Website URL" : "API URL"}
            <input
              type="url"
              placeholder="https://"
              className={fieldClass}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
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
          className="w-full rounded-md bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-400"
        >
          {isEdit ? "Save changes" : "Create catalog"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          <Link
            to="/dashboard/catalogs"
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
