import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import logo from "../assets/logo.png";
import { logout } from "../actions/authActions";

const Icon = ({ path }) => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const icons = {
  overview: "M4 10.5V20h6.5v-6h3V20H20V10.5L12 4z",
  catalogs: "M4 7h16M4 12h16M4 17h10",
  products: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
  matches: "M16 3h5v5M4 20L21 3M8 21H3v-5",
  review: "M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  export: "M12 3v12m0 0l-4-4m4 4l4-4M4 21h16",
  members: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
};

const navClass = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
    isActive
      ? "bg-white/[0.07] text-ink"
      : "text-mute hover:bg-white/[0.04] hover:text-ink"
  }`;

const subClass = (active) =>
  `block rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
    active
      ? "bg-white/[0.07] text-ink"
      : "text-mute hover:bg-white/[0.04] hover:text-ink"
  }`;

const pageLabel = (pathname) => {
  if (pathname === "/dashboard") return "Overview";
  if (pathname.startsWith("/dashboard/catalogs")) return "Catalogs";
  if (pathname.startsWith("/dashboard/products")) return "Products";
  if (pathname.startsWith("/dashboard/matches")) return "Matches";
  if (pathname.startsWith("/dashboard/reviews")) return "Review";
  if (pathname.startsWith("/dashboard/export")) return "Export";
  if (pathname.startsWith("/dashboard/members")) return "Members";
  return "Workspace";
};

const DashboardLayout = () => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { user, role } = useSelector((state) => state.auth);
  const [catalogs, setCatalogs] = useState([]);
  const catalogIdMatch = pathname.match(/^\/dashboard\/catalogs\/([^/]+)/);
  const activeCatalogId =
    catalogIdMatch && catalogIdMatch[1] !== "new" && catalogIdMatch[1] !== "edit"
      ? catalogIdMatch[1]
      : "";
  const onCatalogsList = pathname === "/dashboard/catalogs";
  const catalogsTab =
    new URLSearchParams(search).get("tab") === "compare" ? "compare" : "company";
  const companyCatalogs = catalogs.filter((item) => item.type === "our_catalog");
  const competitorCatalogs = catalogs.filter((item) => item.type === "competitor");
  const manufacturerCatalogs = catalogs.filter(
    (item) => item.type === "manufacturer"
  );
  const initial = (user?.name || "U").trim().charAt(0).toUpperCase();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await axios.get("/api/v1/catalogs", {
          withCredentials: true,
        });
        if (!cancelled) {
          setCatalogs(Array.isArray(response.data) ? response.data : []);
        }
      } catch {
        if (!cancelled) setCatalogs([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname, search]);

  const onLogout = async () => {
    setOpen(false);
    await dispatch(logout());
    navigate("/login");
  };

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        <div>
          <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-mute/70">
            Workspace
          </p>
          <div className="flex flex-col gap-0.5">
            <NavLink to="/dashboard" end className={navClass}>
              <Icon path={icons.overview} />
              Overview
            </NavLink>
            <div>
              <NavLink to="/dashboard/catalogs" className={navClass}>
                <Icon path={icons.catalogs} />
                Catalogs
              </NavLink>
              <div className="ml-[1.15rem] mt-1 flex flex-col gap-2 border-l border-white/10 pl-3">
                {[
                  {
                    label: "Company",
                    rows: companyCatalogs,
                    to: "/dashboard/catalogs",
                    tab: "company",
                  },
                  {
                    label: "Competitor",
                    rows: competitorCatalogs,
                    to: "/dashboard/catalogs?tab=compare",
                    tab: "compare",
                  },
                  {
                    label: "Manufacturer",
                    rows: manufacturerCatalogs,
                  },
                ].map((group) =>
                  !group.to && group.rows.length === 0 ? null : (
                    <div key={group.label} className="flex flex-col gap-0.5">
                      {group.to ? (
                        <Link
                          to={group.to}
                          className={`px-2.5 pt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${
                            onCatalogsList && catalogsTab === group.tab
                              ? "text-brand"
                              : "text-mute hover:text-ink"
                          }`}
                        >
                          {group.label}
                        </Link>
                      ) : (
                        <p className="px-2.5 pt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-mute">
                          {group.label}
                        </p>
                      )}
                      {group.rows.map((catalog) => (
                        <Link
                          key={catalog._id}
                          to={`/dashboard/catalogs/${catalog._id}`}
                          className={subClass(activeCatalogId === catalog._id)}
                        >
                          <span className="block truncate">{catalog.name}</span>
                        </Link>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
            <NavLink to="/dashboard/products" className={navClass}>
              <Icon path={icons.products} />
              Products
            </NavLink>
          </div>
        </div>

        <div>
          <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-mute/70">
            Operations
          </p>
          <div className="flex flex-col gap-0.5">
            <NavLink to="/dashboard/matches" className={navClass}>
              <Icon path={icons.matches} />
              Matches
            </NavLink>
            <NavLink to="/dashboard/reviews" className={navClass}>
              <Icon path={icons.review} />
              Review
            </NavLink>
            <NavLink to="/dashboard/export" className={navClass}>
              <Icon path={icons.export} />
              Export
            </NavLink>
          </div>
        </div>

        <div>
          <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-mute/70">
            Team
          </p>
          <NavLink to="/dashboard/members" end className={navClass}>
            <Icon path={icons.members} />
            Members
          </NavLink>
        </div>
      </nav>

      <div className="mt-auto border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-2.5 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{user?.name}</p>
            <p className="truncate text-[11px] capitalize text-mute">{role || "member"}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md px-2 py-1 text-[11px] text-mute hover:bg-white/[0.06] hover:text-ink"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div data-dashboard className="flex min-h-screen bg-canvas text-ink">
      <aside className="hidden w-[272px] shrink-0 border-r border-white/10 bg-[#141416] lg:flex lg:flex-col">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 border-b border-white/10 px-5 py-4"
        >
          <img
            src={logo}
            alt=""
            className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight text-ink">
              CatalogIQ
            </span>
            <span className="block text-[11px] text-mute">Product matching</span>
          </span>
        </Link>
        <div className="min-h-0 flex-1">{sidebar}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-canvas/85 px-5 py-3 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-ink lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((current) => !current)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Workspace</p>
              <p className="truncate text-sm font-medium text-ink">{pageLabel(pathname)}</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="max-w-40 truncate text-sm text-mute">{user?.name}</span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-mute transition-colors hover:border-white/20 hover:text-ink"
            >
              Log out
            </button>
          </div>
        </header>

        {open ? (
          <div className="max-h-[70vh] overflow-y-auto border-b border-white/10 bg-[#141416] lg:hidden">
            {sidebar}
          </div>
        ) : null}

        <main className="relative flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.08),transparent_58%)]" />
          <div className="relative mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
