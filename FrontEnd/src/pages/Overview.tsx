import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  Factory,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  RefreshCw,
  XCircle,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { overviewApi } from "../api/client";
import type { OverviewStats } from "../api/types";
import { Card, CardContent } from "../components/ui/card";

interface StatCard {
  key: keyof OverviewStats;
  label: string;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "destructive" | "muted";
}

const CARDS: StatCard[] = [
  { key: "totalProducts", label: "Total products", icon: Boxes, tone: "primary" },
  { key: "totalManufacturerProducts", label: "Manufacturer products", icon: Factory, tone: "primary" },
  { key: "productsProcessed", label: "Products processed", icon: Layers, tone: "muted" },
  { key: "matched", label: "Matched products", icon: CheckCircle2, tone: "success" },
  { key: "needsReview", label: "Needs review", icon: AlertTriangle, tone: "warning" },
  { key: "pendingReview", label: "Pending human review", icon: Clock, tone: "warning" },
  { key: "discontinued", label: "Discontinued", icon: Ban, tone: "destructive" },
  { key: "replacementAvailable", label: "Replacement available", icon: RefreshCw, tone: "warning" },
  { key: "noMatch", label: "No-match products", icon: XCircle, tone: "destructive" },
];

const TONE_STYLES: Record<StatCard["tone"], string> = {
  primary: "bg-accent text-primary",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

const ONBOARDING_STEPS = [
  { to: "/our-catalog", title: "Import our catalog", desc: "Upload a CSV/Excel export of the products we sell." },
  { to: "/manufacturers", title: "Add a manufacturer", desc: "Upload their file and map it to standard fields." },
  { to: "/comparison", title: "Run a comparison", desc: "Pick a manufacturer + brand and compare side by side." },
  { to: "/exports", title: "Export updates", desc: "Approve results, then download the upload-ready CSV." },
];

export function Overview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    overviewApi.get().then(setStats);
  }, []);

  const isEmpty = stats && stats.totalProducts === 0 && stats.totalManufacturerProducts === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Product matching, manufacturer comparison and competitor intelligence at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {CARDS.map(({ key, label, icon: Icon, tone }) => (
          <Card key={key} className="hover:shadow-md">
            <CardContent className="flex items-start justify-between pt-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <span className="text-3xl font-semibold tracking-tight">
                  {stats ? stats[key] : <span className="text-muted-foreground/40">—</span>}
                </span>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TONE_STYLES[tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isEmpty && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-4 pt-5">
            <div>
              <h2 className="font-semibold">Get started</h2>
              <p className="text-sm text-muted-foreground">
                No data yet — follow these steps to run your first comparison.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ONBOARDING_STEPS.map((step, i) => (
                <Link key={step.to} to={step.to} className="group">
                  <div className="flex h-full flex-col gap-2 rounded-lg border border-border p-3 transition-colors group-hover:border-primary/40 group-hover:bg-accent/50">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                    <span className="mt-auto flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Go <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
