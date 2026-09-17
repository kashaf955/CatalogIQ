import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import logo from "../assets/logo.png";
import { logout } from "../actions/authActions";

const navClass = ({ isActive }) =>
  `block rounded-md px-3 py-2 text-sm ${
    isActive
      ? "bg-indigo-500 text-white"
      : "text-gray-300 hover:bg-white/5 hover:text-white"
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
      <NavLink to="/dashboard/members" end className={navClass} onClick={() => setOpen(false)}>
        Members
      </NavLink>
    </nav>
  );

  return (
    <div data-dashboard className="flex min-h-screen bg-[#1c1f24] text-white">
      <aside className="hidden w-56 shrink-0 border-r border-indigo-400/20 bg-[#22262d] lg:flex lg:flex-col">
        <Link to="/dashboard" className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <img src={logo} alt="CatalogIQ" className="h-10 w-10 object-cover" />
          <span className="text-sm font-medium">CatalogIQ</span>
        </Link>
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-indigo-400/20 bg-[#22262d] px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/20 lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((current) => !current)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="max-w-40 truncate text-sm text-gray-300">{user?.name}</span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-400"
            >
              Logout
            </button>
          </div>
        </header>

        {open ? (
          <div className="border-b border-white/10 bg-[#22262d] lg:hidden">{sidebar}</div>
        ) : null}

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
