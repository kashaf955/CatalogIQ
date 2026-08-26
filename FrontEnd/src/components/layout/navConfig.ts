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
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [{ to: "/", label: "Overview", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Catalog",
    items: [
      { to: "/our-catalog", label: "Our Catalog Sources", icon: Boxes },
      { to: "/manufacturers", label: "Manufacturer Catalogs", icon: Factory },
      { to: "/competitors", label: "Competitors", icon: Globe },
    ],
  },
  {
    label: "Matching",
    items: [
      { to: "/comparison", label: "Manufacturer Comparison", icon: GitCompareArrows },
      { to: "/review-queue", label: "Review Queue", icon: ListChecks },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/processing-runs", label: "Processing Runs", icon: Activity },
      { to: "/exports", label: "Exports", icon: Download },
    ],
  },
];

export const FLAT_NAV_ITEMS: (NavItem & { group: string })[] = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label }))
);
