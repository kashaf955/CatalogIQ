import { useEffect, useState } from "react";
import { exportsApi, manufacturersApi } from "../api/client";
import type { Manufacturer } from "../api/types";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select } from "../components/ui/select";

export function Exports() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [manufacturerId, setManufacturerId] = useState("");
  const [brand, setBrand] = useState("");

  useEffect(() => {
    manufacturersApi.list().then(setManufacturers);
  }, []);

  const brandOptions = manufacturers.find((m) => m._id === manufacturerId)?.brands ?? [];
  const downloadUrl = exportsApi.updateCsvUrl({ manufacturer: manufacturerId, brand });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Exports</h1>
        <p className="text-sm text-muted-foreground">
          Generate an upload-ready CSV of the verified, human-approved product updates so it can
          be imported directly back into the ecommerce website.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload-ready product update CSV</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Only results with review status "approved" are included. Approve items from the
            Manufacturer Comparison or Review Queue pages first.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="max-w-xs"
              value={manufacturerId}
              onChange={(e) => {
                setManufacturerId(e.target.value);
                setBrand("");
              }}
            >
              <option value="">All manufacturers</option>
              {manufacturers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </Select>
            <Select className="max-w-xs" value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">All brands</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
            <a href={downloadUrl}>
              <Button>Download CSV</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
