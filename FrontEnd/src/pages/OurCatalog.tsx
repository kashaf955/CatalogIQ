import { useEffect, useState } from "react";
import { ourCatalogApi } from "../api/client";
import type { OurProduct } from "../api/types";
import { UploadWizard } from "../components/features/UploadWizard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  TableShell,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "../components/ui/table";

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

      <TableShell>
        <TableHead>
          <tr>
            <TableHeadCell>SKU</TableHeadCell>
            <TableHeadCell>MPN</TableHeadCell>
            <TableHeadCell>Name</TableHeadCell>
            <TableHeadCell>Brand</TableHeadCell>
            <TableHeadCell>Category</TableHeadCell>
            <TableHeadCell>Price</TableHeadCell>
            <TableHeadCell>Source</TableHeadCell>
          </tr>
        </TableHead>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p._id}>
              <TableCell className="font-medium">{p.sku}</TableCell>
              <TableCell className="text-muted-foreground">{p.mpn}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.brand}</TableCell>
              <TableCell className="text-muted-foreground">{p.category}</TableCell>
              <TableCell>{p.price != null ? `$${p.price.toFixed(2)}` : ""}</TableCell>
              <TableCell className="text-muted-foreground">{p.sourceType}</TableCell>
            </TableRow>
          ))}
          {products.length === 0 && (
            <TableEmpty colSpan={7}>
              No products yet. Upload a CSV/Excel file above to get started.
            </TableEmpty>
          )}
        </TableBody>
      </TableShell>
    </div>
  );
}
