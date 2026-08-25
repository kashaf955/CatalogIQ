import { useEffect, useState } from "react";
import { ourCatalogApi } from "../api/client";
import type { OurProduct } from "../api/types";
import { UploadWizard } from "../components/features/UploadWizard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export function OurCatalog() {
  const [products, setProducts] = useState<OurProduct[]>([]);
  const [search, setSearch] = useState("");

  function refresh(searchValue?: string) {
    ourCatalogApi.list({ search: searchValue || undefined }).then(setProducts);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Our Catalog Sources</h1>
        <p className="text-sm text-muted-foreground">
          The products we currently sell or manage, imported from our own ecommerce API, CSV or
          Excel export.
        </p>
      </div>

      <UploadWizard
        requireSku
        onPreview={(file) => ourCatalogApi.previewUpload(file)}
        onImport={(file, fieldMap) => ourCatalogApi.importUpload(file, fieldMap)}
        onImported={() => refresh()}
      />

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by SKU, MPN or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && refresh(search)}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={() => refresh(search)}>
          Search
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">MPN</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Brand</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className="border-t border-border">
                <td className="px-3 py-2">{p.sku}</td>
                <td className="px-3 py-2">{p.mpn}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.brand}</td>
                <td className="px-3 py-2">{p.category}</td>
                <td className="px-3 py-2">{p.price != null ? `$${p.price.toFixed(2)}` : ""}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.sourceType}</td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No products yet. Upload a CSV/Excel file above to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
