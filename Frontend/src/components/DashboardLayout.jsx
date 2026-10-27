import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import logo from "../assets/logo.png";
import { logout } from "../actions/authActions";

const navClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2.5 text-sm ${
    isActive
      ? "bg-teal-600 text-white"
      : "text-slate-300 hover:bg-white/5 hover:text-white"
  }`;

const DashboardLayout = () => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

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
      <NavLink to="/dashboard/catalogs" className={navClass} onClick={() => setOpen(false)}>
        Catalogs
      </NavLink>
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
