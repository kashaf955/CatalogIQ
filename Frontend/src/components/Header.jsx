import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import logo from "../assets/logo.png";
import { logout } from "../actions/authActions";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/#about", label: "About" },
  { to: "/#pricing", label: "Pricing" },
  { to: "/#contact-us", label: "Contact" },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const links = user
    ? [...navLinks, { to: "/dashboard", label: "Dashboard" }]
    : navLinks;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const onLogout = async () => {
    setOpen(false);
    await dispatch(logout());
    navigate("/login");
  };

  const guestButtons = (
    <>
      <Link
        to="/login"
        className="rounded-lg px-4 py-2 text-sm text-mute transition-colors hover:text-ink"
      >
        Login
      </Link>
      <Link
        to="/register"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
      >
        Get started
      </Link>
    </>
  );

  const sessionButtons = (
    <>
      <span className="max-w-40 truncate text-sm text-mute">{user?.name}</span>
      <Link
        to="/dashboard"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
      >
        Open app
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg border border-white/10 px-4 py-2 text-sm text-mute hover:border-white/20 hover:text-ink"
      >
        Log out
      </button>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-3.5">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          <img
            src={logo}
            alt="CatalogIQ"
            className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/10"
          />
          <span className="hidden text-sm font-semibold tracking-tight sm:block">
            CatalogIQ
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-mute lg:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="whitespace-nowrap transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? sessionButtons : guestButtons}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {user ? (
            <Link
              to="/dashboard"
              className="rounded-lg bg-brand px-3 py-2 text-sm text-white hover:bg-brand-hover"
            >
              App
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm text-mute hover:text-ink"
            >
              Login
            </Link>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-ink"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="mx-auto flex w-full max-w-6xl flex-col gap-1 border-t border-white/10 px-4 py-3 lg:hidden"
        >
          {user ? (
            <p className="px-3 pb-1 text-sm text-mute">{user.name}</p>
          ) : null}
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-2 text-base text-mute hover:bg-white/[0.04] hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <button
              type="button"
              onClick={onLogout}
              className="mt-2 rounded-lg border border-white/10 px-4 py-2.5 text-center text-ink hover:border-white/20"
            >
              Log out
            </button>
          ) : (
            <Link
              to="/register"
              className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-center font-medium text-white hover:bg-brand-hover"
            >
              Get started
            </Link>
          )}
        </nav>
      ) : null}
    </header>
  );
};

export default Header;
