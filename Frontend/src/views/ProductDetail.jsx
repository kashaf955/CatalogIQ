import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

const dash = (value) =>
  value === 0 || (value != null && String(value).trim() !== "")
    ? String(value)
    : "—";

const sanitizeHtml = (html) =>
  String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");

const Field = ({ label, children, wide }) => (
  <div className={wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
    <p className="text-xs uppercase tracking-wide text-mute">{label}</p>
    <div className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">
      {children || "—"}
    </div>
  </div>
);

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [catalogs, setCatalogs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [productResponse, catalogsResponse] = await Promise.all([
          axios.get(`/api/v1/products/${id}`, { withCredentials: true }),
          axios.get("/api/v1/catalogs", { withCredentials: true }),
        ]);
        if (cancelled) return;
        setProduct(productResponse.data);
        setCatalogs(
          Array.isArray(catalogsResponse.data) ? catalogsResponse.data : []
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Could not load product");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const catalogName =
    catalogs.find((catalog) => catalog._id === product?.sourceId)?.name || "—";
  const customFields = Array.isArray(product?.attributes?.customFields)
    ? product.attributes.customFields
    : [];
  const images = product?.images || [];

  if (loading) {
    return <p className="text-sm text-mute">Loading product...</p>;
  }

  if (!product) {
    return (
      <div>
        <p className="text-sm text-red-300">{error || "Product not found"}</p>
        <Link
          to="/dashboard/products"
          className="mt-4 inline-block text-brand hover:text-brand-hover"
        >
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1 text-sm uppercase tracking-[0.18em] text-brand">
        Product
      </p>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink">{product.name}</h1>
          <p className="mt-2 text-mute">
            {dash(product.sku)} · {catalogName}
          </p>
        </div>
        <Link
          to="/dashboard/products"
          className="rounded-md border border-white/20 px-4 py-2.5 text-center text-sm text-ink hover:border-brand"
        >
          Back to products
        </Link>
      </div>

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

      {images[0] ? (
        <img
          src={images[0]}
          alt=""
          className="mb-6 h-48 w-48 rounded-xl object-cover"
        />
      ) : null}

      <div className="grid gap-4 rounded-2xl border border-brand/20 bg-panel p-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="SKU">{dash(product.sku)}</Field>
        <Field label="MPN">{dash(product.mpn)}</Field>
        <Field label="GTIN">{dash(product.gtin)}</Field>
        <Field label="Brand">{dash(product.brand)}</Field>
        <Field label="Price">
          {product.price != null ? Number(product.price).toFixed(2) : "—"}
        </Field>
        <Field label="Category">{dash(product.category)}</Field>
        <Field label="Availability">{dash(product.availability)}</Field>
        <Field label="Status">{dash(product.status)}</Field>
        <Field label="Source">{catalogName}</Field>
        <Field label="Fitment">{dash(product.fitment)}</Field>
        <Field label="Weight">{dash(product.weight)}</Field>
        <Field label="Dimensions (W × H × D)">
          {product.width || product.height || product.depth
            ? [product.width, product.height, product.depth]
                .map((value) => (value != null ? value : "—"))
                .join(" × ")
            : "—"}
        </Field>
        <Field label="Replacement MPN">{dash(product.replacementMpn)}</Field>
        <Field label="BigCommerce ID">
          {dash(product.attributes?.bigcommerceId)}
        </Field>
        <Field label="Source URL">
          {product.sourceUrl ? (
            <a
              href={
                product.sourceUrl.startsWith("http")
                  ? product.sourceUrl
                  : `https://${product.sourceUrl.replace(/^\/+/, "")}`
              }
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:text-brand-hover"
            >
              {product.sourceUrl}
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Created">
          {product.createdAt
            ? new Date(product.createdAt).toLocaleString()
            : "—"}
        </Field>
        <Field label="Updated">
          {product.updatedAt
            ? new Date(product.updatedAt).toLocaleString()
            : "—"}
        </Field>
        <Field label="Description" wide>
          {product.description ? (
            <div
              className="max-h-80 overflow-auto rounded-md border border-white/10 bg-canvas p-3 [&_a]:text-brand [&_img]:max-h-40 [&_img]:max-w-full"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(product.description),
              }}
            />
          ) : (
            "—"
          )}
        </Field>
      </div>

      {customFields.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-brand/20 bg-panel p-6">
          <p className="mb-3 text-xs uppercase tracking-wide text-mute">
            Custom fields
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customFields.map((field, index) => (
              <Field key={`${field.name}-${index}`} label={field.name || "Field"}>
                {dash(field.value)}
              </Field>
            ))}
          </div>
        </div>
      ) : null}

      {images.length > 1 ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {images.slice(1).map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              className="h-24 w-24 rounded-md object-cover"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ProductDetail;
