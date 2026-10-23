import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import ProcessingBar from "../components/ProcessingBar.jsx";

const fieldClass =
  "rounded-md border border-white/15 bg-[#1c1f24] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-indigo-400";

const dash = (value) =>
  value === 0 || (value != null && String(value).trim() !== "")
    ? String(value)
    : "—";

const stripHtml = (value) =>
  String(value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();

const sanitizeHtml = (html) =>
  String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");

const DetailField = ({ label, children, wide }) => (
  <div className={wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <div className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-200">
      {children || "—"}
    </div>
  </div>
);

const Products = () => {
  const { role } = useSelector((state) => state.auth);
  const canManage = role === "owner" || role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalogs, setCatalogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [selected, setSelected] = useState([]);
  const [openId, setOpenId] = useState(null);
  const source = searchParams.get("source") || "";

  useEffect(() => {
    const load = async () => {
      try {
        const catalogsResponse = await axios.get("/api/v1/catalogs", {
          withCredentials: true,
        });
        setCatalogs(
          Array.isArray(catalogsResponse.data) ? catalogsResponse.data : []
        );
        try {
          const productsResponse = await axios.get("/api/v1/products", {
            withCredentials: true,
            params: source ? { sourceId: source } : undefined,
          });
          setProducts(
            Array.isArray(productsResponse.data)
              ? productsResponse.data
              : productsResponse.data?.products || []
          );
          setSelected([]);
        } catch {
          setProducts([]);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Could not load products");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [source]);

  const sourceKey = (value) => {
    if (!value) return "";
    if (typeof value === "object") return String(value._id || value);
    return String(value);
  };

  const catalogName = (id) =>
    catalogs.find((catalog) => catalog._id === id)?.name || "—";
  const sourceCatalog = catalogs.find((catalog) => catalog._id === source);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (source && sourceKey(product.sourceId) !== source) return false;
      if (!needle) return true;
      return [
        product.name,
        product.sku,
        product.mpn,
        product.gtin,
        product.brand,
        product.fitment,
        product.category,
        product.description,
        product.availability,
      ]
        .filter(Boolean)
        .some((value) => stripHtml(value).toLowerCase().includes(needle));
    });
  }, [products, query, source]);

  const rowIds = useMemo(
    () => rows.map((product) => product._id).filter(Boolean),
    [rows]
  );
  const allSelected =
    rowIds.length > 0 && rowIds.every((id) => selected.includes(id));

  const toggleOne = (productId) => {
    setSelected((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  };

  const toggleAll = () => {
    setSelected((current) =>
      allSelected
        ? current.filter((id) => !rowIds.includes(id))
        : [...new Set([...current, ...rowIds])]
    );
  };

  const dropIds = (ids) => {
    const removed = new Set(ids);
    setProducts((current) =>
      current.filter((product) => !removed.has(product._id))
    );
    setSelected((current) => current.filter((id) => !removed.has(id)));
  };

  const removeProduct = async (productId) => {
    setError(null);
    try {
      await axios.delete(`/api/v1/products/${productId}`, {
        withCredentials: true,
      });
      dropIds([productId]);
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove product");
    }
  };

  const removeSelected = async () => {
    const ids = selected.filter((id) => rowIds.includes(id));
    if (ids.length === 0) return;
    const confirmed = window.confirm(
      `Remove ${ids.length} selected product${ids.length === 1 ? "" : "s"}?`
    );
    if (!confirmed) return;

    setError(null);
    setRemoving(true);
    setProgress(allSelected && source ? null : 0);
    try {
      if (allSelected && source) {
        await axios.delete("/api/v1/products", {
          withCredentials: true,
          params: { sourceId: source },
        });
        setProducts((current) =>
          current.filter((product) => String(product.sourceId) !== source)
        );
        setSelected([]);
      } else {
        const chunkSize = 400;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          await axios.delete("/api/v1/products", {
            withCredentials: true,
            data: { ids: chunk },
          });
          setProgress(Math.round(((i + chunk.length) / ids.length) * 100));
        }
        dropIds(ids);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove products");
    } finally {
      setRemoving(false);
      setProgress(null);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-indigo-300">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold text-white">
            {sourceCatalog ? sourceCatalog.name : "Products"}
          </h1>
          <p className="mt-2 text-gray-400">
            {loading
              ? "Rows ingested from a catalog source."
              : source
                ? `${rows.length} product${rows.length === 1 ? "" : "s"} in this catalog`
                : `${rows.length} product${rows.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canManage && selected.length > 0 ? (
            <button
              type="button"
              disabled={removing}
              onClick={removeSelected}
              className="rounded-md border border-red-400/40 px-4 py-2.5 text-center font-medium text-red-300 hover:border-red-400 disabled:opacity-50"
            >
              {removing
                ? "Removing..."
                : `Remove selected (${selected.filter((id) => rowIds.includes(id)).length})`}
            </button>
          ) : null}
          <Link
            to="/dashboard/catalogs"
            className="rounded-md bg-indigo-500 px-4 py-2.5 text-center font-medium text-white hover:bg-indigo-400"
          >
            Ingest a catalog
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          className={fieldClass}
          value={source}
          onChange={(event) => {
            const next = event.target.value;
            if (next) setSearchParams({ source: next });
            else setSearchParams({});
          }}
        >
          <option value="">All sources</option>
          {catalogs.map((catalog) => (
            <option key={catalog._id} value={catalog._id}>
              {catalog.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search name, SKU, MPN, brand, description"
          className={`${fieldClass} sm:min-w-72`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {removing ? (
        <ProcessingBar
          label="Removing products..."
          percent={progress}
        />
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-indigo-400/30 bg-[#22262d] shadow-[0_0_24px_rgba(99,102,241,0.12)]">
        {error ? (
          <p className="px-4 py-3 text-sm text-red-300">{error}</p>
        ) : null}
        {loading ? (
          <p className="px-4 py-6 text-sm text-gray-400">Loading products...</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">
            No products yet. Run ingest on a catalog source.
          </p>
        ) : (
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead className="border-b border-white/10 text-gray-400">
              <tr>
                {canManage ? (
                  <th className="px-4 py-3 font-medium">
                    <label className="inline-flex items-center gap-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-white/30 bg-[#1c1f24]"
                      />
                      All
                    </label>
                  </th>
                ) : null}
                <th className="px-4 py-3 font-medium">No.</th>
                <th className="px-4 py-3 font-medium">Image</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">MPN</th>
                <th className="px-4 py-3 font-medium">GTIN</th>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Availability</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium"> </th>
                {canManage ? <th className="px-4 py-3 font-medium"> </th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((product, index) => {
                const open = openId === product._id;
                const image = (product.images || [])[0];
                const customFields = Array.isArray(product.attributes?.customFields)
                  ? product.attributes.customFields
                  : [];
                const colSpan = 14 + (canManage ? 2 : 0);
                return (
                  <React.Fragment key={product._id || product.sku}>
                    <tr className="border-b border-white/5">
                      {canManage ? (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(product._id)}
                            onChange={() => toggleOne(product._id)}
                            className="h-4 w-4 rounded border-white/30 bg-[#1c1f24]"
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            className="h-12 w-12 rounded-md object-cover"
                          />
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white">{dash(product.name)}</td>
                      <td
                        className="max-w-72 truncate px-4 py-3 text-gray-300"
                        title={stripHtml(product.description)}
                      >
                        {stripHtml(product.description) || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{dash(product.sku)}</td>
                      <td className="px-4 py-3 text-gray-300">{dash(product.mpn)}</td>
                      <td className="px-4 py-3 text-gray-300">{dash(product.gtin)}</td>
                      <td className="px-4 py-3 text-gray-300">{dash(product.brand)}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {product.price != null
                          ? `${product.currency || "USD"} ${Number(product.price).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{dash(product.category)}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {dash(product.availability)}
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-300">
                        {dash(product.status)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {catalogName(product.sourceId)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenId(open ? null : product._id)
                          }
                          className="text-indigo-300 hover:text-indigo-200"
                        >
                          {open ? "Hide" : "Details"}
                        </button>
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeProduct(product._id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            Remove
                          </button>
                        </td>
                      ) : null}
                    </tr>
                    {open ? (
                      <tr className="border-b border-white/5 bg-[#1c1f24]/80">
                        <td colSpan={colSpan} className="px-4 py-5">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailField label="Description" wide>
                              {product.description ? (
                                <div
                                  className="max-h-64 overflow-auto rounded-md border border-white/10 bg-[#22262d] p-3 [&_a]:text-indigo-300 [&_img]:max-h-40 [&_img]:max-w-full"
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(product.description),
                                  }}
                                />
                              ) : (
                                "—"
                              )}
                            </DetailField>
                            <DetailField label="Fitment">
                              {dash(product.fitment)}
                            </DetailField>
                            <DetailField label="Weight">
                              {dash(product.weight)}
                            </DetailField>
                            <DetailField label="Dimensions (W × H × D)">
                              {product.width || product.height || product.depth
                                ? [product.width, product.height, product.depth]
                                    .map((value) => (value != null ? value : "—"))
                                    .join(" × ")
                                : "—"}
                            </DetailField>
                            <DetailField label="Replacement MPN">
                              {dash(product.replacementMpn)}
                            </DetailField>
                            <DetailField label="Source URL">
                              {product.sourceUrl ? (
                                <a
                                  href={
                                    product.sourceUrl.startsWith("http")
                                      ? product.sourceUrl
                                      : `https://${product.sourceUrl.replace(/^\/+/, "")}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-300 hover:text-indigo-200"
                                >
                                  {product.sourceUrl}
                                </a>
                              ) : (
                                "—"
                              )}
                            </DetailField>
                            <DetailField label="BigCommerce ID">
                              {dash(product.attributes?.bigcommerceId)}
                            </DetailField>
                            <DetailField label="Created">
                              {product.createdAt
                                ? new Date(product.createdAt).toLocaleString()
                                : "—"}
                            </DetailField>
                            <DetailField label="Updated">
                              {product.updatedAt
                                ? new Date(product.updatedAt).toLocaleString()
                                : "—"}
                            </DetailField>
                          </div>
                          {customFields.length > 0 ? (
                            <div className="mt-4">
                              <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                                Custom fields
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {customFields.map((field, fieldIndex) => (
                                  <DetailField
                                    key={`${field.name}-${fieldIndex}`}
                                    label={field.name || "Field"}
                                  >
                                    {dash(field.value)}
                                  </DetailField>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {(product.images || []).length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-3">
                              {product.images.map((src) => (
                                <img
                                  key={src}
                                  src={src}
                                  alt=""
                                  className="h-24 w-24 rounded-md object-cover"
                                />
                              ))}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Products;
