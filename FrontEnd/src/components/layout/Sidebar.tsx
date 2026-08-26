import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { NAV_GROUPS } from "./navConfig";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-accent-foreground text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30">
          IQ
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold tracking-tight">CatalogIQ</span>
          <span className="text-[11px] text-muted-foreground">Product Intelligence</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive &&
                      "border-primary/10 bg-linear-to-r from-accent to-transparent text-primary hover:bg-accent hover:text-primary"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("h-4 w-4 shrink-0 opacity-70", isActive && "opacity-100")} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Connected
      </div>
    </aside>
  );
}
