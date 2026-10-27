import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import logo from "../assets/logo.png";
import { logout } from "../actions/authActions";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact-us", label: "Contact Us" },
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
        className="rounded-md bg-brand px-4 py-2 text-white hover:bg-brand-hover"
      >
        Login
      </Link>
      <Link
        to="/register"
        className="rounded-md bg-brand px-4 py-2 text-white hover:bg-brand-hover"
      >
        Get Started
      </Link>
    </>
  );

  const sessionButtons = (
    <>
      <span className="max-w-40 truncate text-sm text-ink">
        {user?.name}
      </span>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-md bg-brand px-4 py-2 text-white hover:bg-brand-hover"
      >
        Logout
      </button>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-canvas/95 backdrop-blur">
      <div className="flex w-full items-center justify-between gap-3 py-3">
        <Link to="/" className="shrink-0" onClick={() => setOpen(false)}>
          <img
            src={logo}
            alt="CatalogIQ"
            className="h-12 w-12 object-cover sm:h-16 sm:w-16 lg:h-20 lg:w-20"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-base lg:flex xl:gap-10 xl:text-xl">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="whitespace-nowrap hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? sessionButtons : guestButtons}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {user ? (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md bg-brand px-3 py-2 text-sm text-white hover:bg-brand-hover"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-brand px-3 py-2 text-sm text-white hover:bg-brand-hover"
            >
              Login
            </Link>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/20 text-ink"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="flex flex-col gap-1 border-t border-white/10 py-3 lg:hidden"
        >
          {user ? (
            <p className="px-3 pb-1 text-sm text-mute">{user.name}</p>
          ) : null}
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-2 text-base hover:bg-canvas hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <button
              type="button"
              onClick={onLogout}
              className="mt-2 rounded-md bg-brand px-4 py-2.5 text-center text-white hover:bg-brand-hover"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/register"
              className="mt-2 rounded-md bg-brand px-4 py-2.5 text-center text-white hover:bg-brand-hover"
            >
              Get Started
            </Link>
          )}
        </nav>
      ) : null}
    </header>
  );
};

export default Header;
