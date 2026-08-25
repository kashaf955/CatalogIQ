import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { manufacturersApi } from "../api/client";
import type { Manufacturer } from "../api/types";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";

export function Manufacturers() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  function refresh() {
    manufacturersApi.list().then(setManufacturers);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await manufacturersApi.create(name.trim());
      setName("");
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Manufacturer Catalogs</h1>
        <p className="text-sm text-muted-foreground">
          A manufacturer may provide a file containing products from one or more brands. Create a
          manufacturer, then upload its catalog and work with the data by brand.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-end gap-2 pt-4">
          <div className="flex-1">
            <Input
              placeholder="Manufacturer name (e.g. United Pacific Manufacturing)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <Button onClick={handleCreate} disabled={busy}>
            Add manufacturer
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {manufacturers.map((m) => (
          <Link key={m._id} to={`/manufacturers/${m._id}`}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="pt-4">
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-muted-foreground">
                  {m.brands.length > 0 ? m.brands.join(", ") : "No brands imported yet"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {manufacturers.length === 0 && (
          <p className="text-sm text-muted-foreground">No manufacturers yet.</p>
        )}
      </div>
    </div>
  );
}
