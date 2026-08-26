import { useEffect, useState } from "react";
import { Globe, Settings2, Plus, AlertCircle } from "lucide-react";
import { competitorsApi } from "../api/client";
import type { CompetitorSelectors, CompetitorSite } from "../api/types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const SELECTOR_FIELDS: { key: keyof CompetitorSelectors; label: string; placeholder: string }[] = [
  { key: "searchUrlTemplate", label: "Search URL template", placeholder: "https://competitor.com/search?q={query}" },
  { key: "resultLinkSelector", label: "Result link selector", placeholder: "a.product-link" },
  { key: "name", label: "Product name selector", placeholder: "h1.product-title" },
  { key: "price", label: "Price selector", placeholder: ".price" },
  { key: "sku", label: "SKU selector", placeholder: ".sku" },
  { key: "brand", label: "Brand selector", placeholder: ".brand" },
  { key: "description", label: "Description selector", placeholder: ".description" },
  { key: "images", label: "Image selector (all matches)", placeholder: ".product-image img" },
  { key: "availability", label: "Availability selector", placeholder: ".stock-status" },
];

const emptySelectors: CompetitorSelectors = {};

export function Competitors() {
  const [sites, setSites] = useState<CompetitorSite[]>([]);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [selectors, setSelectors] = useState<CompetitorSelectors>(emptySelectors);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    competitorsApi.list().then(setSites);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    setError(null);
    try {
      await competitorsApi.create({ name, baseUrl, selectors });
      setName("");
      setBaseUrl("");
      setSelectors(emptySelectors);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add competitor");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Competitors</h1>
        <p className="text-sm text-muted-foreground">
          Configure a competitor site's search URL and CSS selectors so CatalogIQ can discover and
          extract product pages with Playwright (spec sections 13-14). Review each site's Terms of
          Service and robots.txt before scraping.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add competitor site</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Competitor Inc." />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Base URL</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://competitor.com"
              />
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-fit" onClick={() => setShowAdvanced((v) => !v)}>
            <Settings2 className="h-3.5 w-3.5" />
            {showAdvanced ? "Hide" : "Show"} scraping configuration
          </Button>

          {showAdvanced && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-3.5 sm:grid-cols-2">
              {SELECTOR_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <Label>{label}</Label>
                  <Input
                    value={selectors[key] ?? ""}
                    placeholder={placeholder}
                    onChange={(e) => setSelectors((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
          <Button onClick={handleCreate} disabled={!name || !baseUrl} className="w-fit">
            <Plus className="h-4 w-4" />
            Add competitor
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sites.map((s) => (
          <Card key={s._id} className="hover:shadow-md">
            <CardContent className="flex items-start gap-3 pt-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name}</p>
                <p className="truncate text-sm text-muted-foreground">{s.baseUrl}</p>
                <Badge variant={s.selectors?.searchUrlTemplate ? "success" : "outline"} className="mt-2">
                  {s.selectors?.searchUrlTemplate ? "Ready to scrape" : "Needs configuration"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {sites.length === 0 && (
          <p className="text-sm text-muted-foreground">No competitors configured yet.</p>
        )}
      </div>
    </div>
  );
}
