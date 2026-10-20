import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import ProcessingBar from "../components/ProcessingBar.jsx";

const fieldClass =
  "rounded-md border border-white/15 bg-[#1c1f24] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-indigo-400";

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
      return [product.name, product.sku, product.mpn, product.brand, product.fitment]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
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
          placeholder="Search name, SKU, MPN, brand"
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
          <table className="w-full min-w-lg text-left text-sm">
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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">MPN</th>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Weight</th>
                <th className="px-4 py-3 font-medium">Dimensions</th>
                <th className="px-4 py-3 font-medium">Fitment</th>
                <th className="px-4 py-3 font-medium">Source</th>
                {canManage ? <th className="px-4 py-3 font-medium"> </th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((product, index) => (
                <tr
                  key={product._id || product.sku}
                  className="border-b border-white/5 last:border-0"
                >
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
                  <td className="px-4 py-3 text-white">{product.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-300">{product.sku || "—"}</td>
                  <td className="px-4 py-3 text-gray-300">{product.mpn || "—"}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {product.brand || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {product.price != null ? `$${Number(product.price).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {product.weight != null ? product.weight : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {product.width || product.height || product.depth
                      ? [product.width, product.height, product.depth]
                          .map((value) => (value != null ? value : "—"))
                          .join(" × ")
                      : "—"}
                  </td>
                  <td className="max-w-56 truncate px-4 py-3 text-gray-300" title={product.fitment || ""}>
                    {product.fitment || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {catalogName(product.sourceId)}
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Products;
