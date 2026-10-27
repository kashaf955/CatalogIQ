import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import logo from "../assets/logo.png";
import { logout } from "../actions/authActions";

const navClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2.5 text-sm ${
    isActive
      ? "bg-teal-600 text-white"
      : "text-slate-300 hover:bg-white/5 hover:text-white"
  }`;

const subClass = (active) =>
  `block rounded-lg px-3 py-2 text-sm ${
    active
      ? "bg-teal-600 text-white"
      : "text-slate-400 hover:bg-white/5 hover:text-white"
  }`;

const DashboardLayout = () => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [catalogs, setCatalogs] = useState([]);
  const catalogIdMatch = pathname.match(/^\/dashboard\/catalogs\/([^/]+)/);
  const activeCatalogId =
    catalogIdMatch && catalogIdMatch[1] !== "new" && catalogIdMatch[1] !== "edit"
      ? catalogIdMatch[1]
      : "";
  const companyCatalogs = catalogs.filter((item) => item.type === "our_catalog");
  const competitorCatalogs = catalogs.filter((item) => item.type === "competitor");
  const manufacturerCatalogs = catalogs.filter(
    (item) => item.type === "manufacturer"
  );

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

  const onLogout = async () => {
    setOpen(false);
    await dispatch(logout());
    navigate("/login");
  };

  const sidebar = (
    <nav className="flex flex-col gap-1 p-3">
      <NavLink to="/dashboard" end className={navClass} onClick={() => setOpen(false)}>
        Overview
      </NavLink>
      <div>
        <NavLink
          to="/dashboard/catalogs"
          className={navClass}
          onClick={() => setOpen(false)}
        >
          Catalogs
        </NavLink>
        {catalogs.length > 0 ? (
          <div className="ml-3 mt-1 flex flex-col gap-2 border-l border-white/10 pl-2">
            {[
              { label: "Company", rows: companyCatalogs },
              { label: "Competitor", rows: competitorCatalogs },
              { label: "Manufacturer", rows: manufacturerCatalogs },
            ].map((group) =>
              group.rows.length === 0 ? null : (
                <div key={group.label} className="flex flex-col gap-1">
                  <p className="px-3 pt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    {group.label}
                  </p>
                  {group.rows.map((catalog) => (
                    <Link
                      key={catalog._id}
                      to={`/dashboard/catalogs/${catalog._id}`}
                      className={subClass(activeCatalogId === catalog._id)}
                      onClick={() => setOpen(false)}
                    >
                      <span className="block truncate">{catalog.name}</span>
                    </Link>
                  ))}
                </div>
              )
            )}
          </div>
        ) : null}
      </div>
      <NavLink to="/dashboard/products" className={navClass} onClick={() => setOpen(false)}>
        Products
      </NavLink>
      <NavLink to="/dashboard/matches" className={navClass} onClick={() => setOpen(false)}>
        Matches
      </NavLink>
      <NavLink to="/dashboard/reviews" className={navClass} onClick={() => setOpen(false)}>
        Review
      </NavLink>
      <NavLink to="/dashboard/export" className={navClass} onClick={() => setOpen(false)}>
        Export
      </NavLink>
      <NavLink to="/dashboard/members" end className={navClass} onClick={() => setOpen(false)}>
        Members
      </NavLink>
    </nav>
  );

  return (
    <div data-dashboard className="flex min-h-screen bg-[#11181e] text-white">
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#1a242b] lg:flex lg:flex-col">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 border-b border-white/10 px-5 py-4"
        >
          <img src={logo} alt="CatalogIQ" className="h-11 w-11 rounded-md object-cover" />
          <span className="text-sm font-semibold tracking-wide">CatalogIQ</span>
        </Link>
        <div className="flex-1">{sidebar}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#1a242b] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((current) => !current)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="max-w-40 truncate text-sm text-slate-300">{user?.name}</span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm text-white hover:bg-teal-500"
            >
              Logout
            </button>
          </div>
        </header>

        {open ? (
          <div className="border-b border-white/10 bg-[#1a242b] lg:hidden">{sidebar}</div>
        ) : null}

        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
