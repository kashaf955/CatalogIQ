import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact-us", label: "Contact Us" },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-indigo-400/30 bg-[#1c1f24] shadow-[0_0_24px_rgba(99,102,241,0.18)]">
      <div className="flex w-full items-center justify-between gap-3 py-2 sm:py-3">
        <Link to="/" className="shrink-0" onClick={() => setOpen(false)}>
          <img
            src={logo}
            alt="CatalogIQ"
            className="h-12 w-12 object-cover sm:h-16 sm:w-16 lg:h-20 lg:w-20"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-base lg:flex xl:gap-10 xl:text-xl">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="whitespace-nowrap hover:text-indigo-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-400"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-400"
          >
            Get Started
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/login"
            className="rounded-md bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-400"
          >
            Login
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/40 text-white"
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
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-2 text-base hover:bg-white/5 hover:text-indigo-300"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/register"
            className="mt-2 rounded-md bg-indigo-500 px-4 py-2.5 text-center text-white hover:bg-indigo-400"
          >
            Get Started
          </Link>
        </nav>
      ) : null}
    </header>
  );
};

export default Header;
