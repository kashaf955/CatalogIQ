import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";

const fieldClass =
  "rounded-md border border-white/15 bg-[#1c1f24] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-indigo-400";

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalogs, setCatalogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const catalogName = (id) =>
    catalogs.find((catalog) => catalog._id === id)?.name || "—";

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (source && String(product.sourceId) !== source) return false;
      if (!needle) return true;
      return [product.name, product.sku, product.mpn, product.brand, product.fitment]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [products, query, source]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-indigo-300">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold text-white">Products</h1>
          <p className="mt-2 text-gray-400">
            Rows ingested from a catalog source.
          </p>
        </div>
        <Link
          to="/dashboard/catalogs"
          className="rounded-md bg-indigo-500 px-4 py-2.5 text-center font-medium text-white hover:bg-indigo-400"
        >
          Ingest a catalog
        </Link>
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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">MPN</th>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Weight</th>
                <th className="px-4 py-3 font-medium">Dimensions</th>
                <th className="px-4 py-3 font-medium">Fitment</th>
                <th className="px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr
                  key={product._id || product.sku}
                  className="border-b border-white/5 last:border-0"
                >
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
