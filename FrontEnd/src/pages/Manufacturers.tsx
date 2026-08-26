import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Factory, ChevronRight, Plus } from "lucide-react";
import { manufacturersApi } from "../api/client";
import type { Manufacturer } from "../api/types";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

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
        <h1 className="text-2xl font-semibold tracking-tight">Manufacturer Catalogs</h1>
        <p className="text-sm text-muted-foreground">
          A manufacturer may provide a file containing products from one or more brands. Create a
          manufacturer, then upload its catalog and work with the data by brand.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-end gap-2 pt-4">
          <div className="flex-1">
            <Label>Add a manufacturer</Label>
            <Input
              placeholder="e.g. United Pacific Manufacturing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="mt-1"
            />
          </div>
          <Button onClick={handleCreate} disabled={busy}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {manufacturers.map((m) => (
          <Link key={m._id} to={`/manufacturers/${m._id}`} className="group">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
              <CardContent className="flex items-center gap-3 pt-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                  <Factory className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {m.brands.length > 0 ? m.brands.join(", ") : "No brands imported yet"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
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
