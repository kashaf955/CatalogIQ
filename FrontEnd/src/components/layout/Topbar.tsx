import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { FLAT_NAV_ITEMS } from "./navConfig";

export function Topbar() {
  const location = useLocation();
  const current =
    FLAT_NAV_ITEMS.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    ) ?? FLAT_NAV_ITEMS[0];

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{current.group}</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="font-medium">{current.label}</span>
      </div>

      <nav className="flex gap-1 overflow-x-auto md:hidden">
        {FLAT_NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground",
                isActive && "bg-accent text-primary"
              )
            }
          >
            <Icon className="h-4 w-4" />
          </NavLink>
        ))}
      </nav>

      <div className="hidden items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground md:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        Local dev
      </div>
    </header>
  );
}
