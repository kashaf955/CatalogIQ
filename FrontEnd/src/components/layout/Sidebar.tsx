import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Factory,
  Globe,
  GitCompareArrows,
  ListChecks,
  Activity,
  Download,
} from "lucide-react";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/our-catalog", label: "Our Catalog Sources", icon: Boxes },
  { to: "/manufacturers", label: "Manufacturer Catalogs", icon: Factory },
  { to: "/competitors", label: "Competitors", icon: Globe },
  { to: "/comparison", label: "Manufacturer Comparison", icon: GitCompareArrows },
  { to: "/review-queue", label: "Review Queue", icon: ListChecks },
  { to: "/processing-runs", label: "Processing Runs", icon: Activity },
  { to: "/exports", label: "Exports", icon: Download },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
          IQ
        </div>
        <span className="font-semibold">CatalogIQ</span>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
