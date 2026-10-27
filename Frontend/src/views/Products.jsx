import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import ProcessingBar from "../components/ProcessingBar.jsx";

const PAGE_SIZE = 100;

const fieldClass =
  "rounded-md border border-white/10 bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-mute focus:border-brand";

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

const Pager = ({ page, pages, total, limit, disabled, onPage }) => {
  if (total <= 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Previous page"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-lg text-ink hover:border-brand disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹
      </button>
      <p className="min-w-44 text-center text-sm text-mute">
        {from}–{to} of {total.toLocaleString()}
      </p>
      <button
        type="button"
        aria-label="Next page"
        disabled={disabled || page >= pages}
        onClick={() => onPage(page + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-lg text-ink hover:border-brand disabled:cursor-not-allowed disabled:opacity-40"
      >
        ›
      </button>
    </div>
  );
};

const Products = () => {
  const { role } = useSelector((state) => state.auth);
  const canManage =
    role === "owner" || role === "admin" || role === "manager";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalogs, setCatalogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [selected, setSelected] = useState([]);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const source = searchParams.get("source") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const setFilters = (nextSource, nextPage) => {
    const params = {};
    if (nextSource) params.source = nextSource;
    if (nextPage > 1) params.page = String(nextPage);
    setSearchParams(params);
  };

  const skipPageReset = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (skipPageReset.current) {
      skipPageReset.current = false;
      return;
    }
    if (page !== 1) setFilters(source, 1);
  }, [source, debouncedQuery]);

  useEffect(() => {
    let cancelled = false;
    const loadCatalogs = async () => {
      try {
        const catalogsResponse = await axios.get("/api/v1/catalogs", {
          withCredentials: true,
        });
        if (!cancelled) {
          setCatalogs(
            Array.isArray(catalogsResponse.data) ? catalogsResponse.data : []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Could not load products");
        }
      }
    };
    loadCatalogs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const productsResponse = await axios.get("/api/v1/products", {
          withCredentials: true,
          params: {
            page,
            limit: PAGE_SIZE,
            ...(source ? { sourceId: source } : {}),
            ...(debouncedQuery ? { q: debouncedQuery } : {}),
          },
        });
        if (cancelled) return;
        const payload = productsResponse.data;
        const list = Array.isArray(payload)
          ? payload
          : payload?.products || [];
        const nextTotal = Array.isArray(payload)
          ? list.length
          : payload?.total ?? list.length;
        const nextPages = Array.isArray(payload)
          ? 1
          : payload?.pages || Math.max(1, Math.ceil(nextTotal / PAGE_SIZE) || 1);
        setProducts(list);
        setTotal(nextTotal);
        setPages(nextPages);
        setSelected([]);
        setSelectAllMatching(false);
        if (page > nextPages) setFilters(source, nextPages);
      } catch (err) {
        if (!cancelled) {
          setProducts([]);
          setTotal(0);
          setPages(1);
          setError(err.response?.data?.message || "Could not load products");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [source, page, debouncedQuery]);

  const catalogName = (id) =>
    catalogs.find((catalog) => catalog._id === id)?.name || "—";
  const sourceCatalog = catalogs.find((catalog) => catalog._id === source);

  const rowIds = useMemo(
    () => products.map((product) => product._id).filter(Boolean),
    [products]
  );
  const allSelected =
    selectAllMatching ||
    (rowIds.length > 0 && rowIds.every((id) => selected.includes(id)));

  const toggleOne = (productId) => {
    setSelectAllMatching(false);
    setSelected((current) =>
      current.includes(productId)
        ? current.filter((id) => !id || id !== productId)
        : [...current, productId]
    );
  };

  const toggleAll = () => {
    if (selectAllMatching || allSelected) {
      setSelectAllMatching(false);
      setSelected((current) => current.filter((id) => !rowIds.includes(id)));
      return;
    }
    setSelected((current) => [...new Set([...current, ...rowIds])]);
  };

  const dropIds = (ids) => {
    const removed = new Set(ids);
    setProducts((current) =>
      current.filter((product) => !removed.has(product._id))
    );
    setSelected((current) => current.filter((id) => !removed.has(id)));
    setTotal((current) => Math.max(0, current - ids.length));
  };

  const goToPage = (nextPage) => {
    const bounded = Math.min(Math.max(1, nextPage), pages);
    if (bounded === page) return;
    setFilters(source, bounded);
  };

  const removeProduct = async (productId) => {
    setError(null);
    try {
      await axios.delete(`/api/v1/products/${productId}`, {
        withCredentials: true,
      });
      if (products.length <= 1 && page > 1) {
        setFilters(source, page - 1);
      } else {
        dropIds([productId]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove product");
    }
  };

  const removeSelected = async () => {
    const ids = selected.filter((id) => rowIds.includes(id));
    const removeEntireSource = selectAllMatching && source;
    if (!removeEntireSource && ids.length === 0) return;
    const count = removeEntireSource ? total : ids.length;
    const confirmed = window.confirm(
      `Remove ${count} selected product${count === 1 ? "" : "s"}?`
    );
    if (!confirmed) return;

    setError(null);
    setRemoving(true);
    setProgress(removeEntireSource ? null : 0);
    try {
      if (removeEntireSource) {
        await axios.delete("/api/v1/products", {
          withCredentials: true,
          params: {
            sourceId: source,
            ...(debouncedQuery ? { q: debouncedQuery } : {}),
          },
        });
        setProducts([]);
        setSelected([]);
        setSelectAllMatching(false);
        setTotal(0);
        setPages(1);
        setFilters(source, 1);
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
        if (products.length === ids.length && page > 1) {
          setFilters(source, page - 1);
        } else {
          dropIds(ids);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove products");
    } finally {
      setRemoving(false);
      setProgress(null);
    }
  };

  const selectedCount = selectAllMatching
    ? total
    : selected.filter((id) => rowIds.includes(id)).length;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-brand">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold text-ink">
            {sourceCatalog ? sourceCatalog.name : "Products"}
          </h1>
          <p className="mt-2 text-mute">
            {loading
              ? "Rows ingested from a catalog source."
              : source
                ? `${total.toLocaleString()} product${total === 1 ? "" : "s"} in this catalog`
                : `${total.toLocaleString()} product${total === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canManage && selectedCount > 0 ? (
            <button
              type="button"
              disabled={removing}
              onClick={removeSelected}
              className="rounded-md border border-red-400/40 px-4 py-2.5 text-center font-medium text-red-300 hover:border-red-400 disabled:opacity-50"
            >
              {removing
                ? "Removing..."
                : `Remove selected (${selectedCount})`}
            </button>
          ) : null}
          <Link
            to="/dashboard/catalogs"
            className="rounded-md bg-brand px-4 py-2.5 text-center font-medium text-white hover:bg-brand-hover"
          >
            Ingest a catalog
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <select
          className={fieldClass}
          value={source}
          onChange={(event) => {
            const next = event.target.value;
            setFilters(next, 1);
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
          className={`${fieldClass} lg:min-w-72`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="lg:ml-auto">
          <Pager
            page={page}
            pages={pages}
            total={total}
            limit={PAGE_SIZE}
            disabled={loading}
            onPage={goToPage}
          />
        </div>
      </div>

      {removing ? (
        <ProcessingBar
          label="Removing products..."
          percent={progress}
        />
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-brand/20 bg-panel shadow-sm">
        {error ? (
          <p className="px-4 py-3 text-sm text-red-300">{error}</p>
        ) : null}
        {loading ? (
          <p className="px-4 py-6 text-sm text-mute">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="px-4 py-6 text-sm text-mute">
            No products yet. Run ingest on a catalog source.
          </p>
        ) : (
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead className="border-b border-white/10 text-mute">
              <tr>
                {canManage ? (
                  <th className="px-4 py-3 font-medium">
                    <label className="inline-flex items-center gap-2 text-ink">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-white/20 bg-canvas"
                      />
                      Page
                    </label>
                    {source && total > products.length ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectAllMatching(true);
                          setSelected(rowIds);
                        }}
                        className="mt-1 block text-xs text-brand hover:text-brand-hover"
                      >
                        {selectAllMatching
                          ? `All ${total.toLocaleString()} selected`
                          : `Select all ${total.toLocaleString()}`}
                      </button>
                    ) : null}
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
              {products.map((product, index) => {
                const image = (product.images || [])[0];
                const openDetail = () => {
                  if (!product._id) return;
                  navigate(`/dashboard/products/${product._id}`);
                };
                return (
                    <tr
                      key={product._id || product.sku}
                      role="link"
                      tabIndex={product._id ? 0 : undefined}
                      className="cursor-pointer border-b border-white/5 hover:bg-canvas"
                      onClick={openDetail}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDetail();
                        }
                      }}
                    >
                      {canManage ? (
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={
                              selectAllMatching || selected.includes(product._id)
                            }
                            onChange={() => toggleOne(product._id)}
                            className="h-4 w-4 rounded border-white/20 bg-canvas"
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-mute">
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            className="h-12 w-12 rounded-md object-cover"
                          />
                        ) : (
                          <span className="text-mute">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {dash(product.name)}
                      </td>
                      <td
                        className="max-w-72 truncate px-4 py-3 text-ink"
                        title={stripHtml(product.description)}
                      >
                        {stripHtml(product.description) || "—"}
                      </td>
                      <td className="px-4 py-3 text-ink">{dash(product.sku)}</td>
                      <td className="px-4 py-3 text-ink">{dash(product.mpn)}</td>
                      <td className="px-4 py-3 text-ink">{dash(product.gtin)}</td>
                      <td className="px-4 py-3 text-ink">{dash(product.brand)}</td>
                      <td className="px-4 py-3 text-ink">
                        {product.price != null
                          ? Number(product.price).toFixed(2)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-ink">{dash(product.category)}</td>
                      <td className="px-4 py-3 text-ink">
                        {dash(product.availability)}
                      </td>
                      <td className="px-4 py-3 capitalize text-ink">
                        {dash(product.status)}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {catalogName(product.sourceId)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/dashboard/products/${product._id}`}
                          className="text-brand hover:text-brand-hover"
                        >
                          View
                        </Link>
                      </td>
                      {canManage ? (
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => removeProduct(product._id)}
                            className="text-red-500 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </td>
                      ) : null}
                    </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > PAGE_SIZE ? (
        <div className="mt-4 flex justify-end">
          <Pager
            page={page}
            pages={pages}
            total={total}
            limit={PAGE_SIZE}
            disabled={loading}
            onPage={goToPage}
          />
        </div>
      ) : null}
    </div>
  );
};

export default Products;
