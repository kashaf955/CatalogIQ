import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "../components/Header.jsx";

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    blurb: "One workspace to ingest your catalog and export a clean product file.",
    features: ["1 workspace", "CSV / Excel import", "Standard product fields", "Email support"],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Growth",
    price: "$149",
    period: "/month",
    blurb: "Manufacturer and competitor sources plus a review queue for matches.",
    features: [
      "Unlimited members",
      "Manufacturer catalogs",
      "Competitor tracking",
      "Match review workflow",
    ],
    cta: "Get Growth",
    featured: true,
  },
  {
    name: "Scale",
    price: "Custom",
    period: "",
    blurb: "High-volume catalogs, API access, and a dedicated workspace plan.",
    features: ["API & feeds", "Priority matching", "SSO-ready later", "Named support"],
    cta: "Talk to us",
    featured: false,
  },
];

const Home = () => {
  const location = useLocation();

  useEffect(() => {
    const id = location.hash.replace("#", "");
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="pb-16">
      <Header />

      <section className="relative overflow-hidden px-2 pb-20 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-indigo-300">
            Catalog matching for parts teams
          </p>
          <h1 className="mb-5 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            One product model for your catalog, manufacturers, and competitors.
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base text-gray-400 sm:text-lg">
            CatalogIQ ingests messy source files, matches SKUs and MPNs, and
            exports upload-ready updates your team can review before they go live.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="w-full rounded-md bg-indigo-500 px-6 py-3 text-center font-medium text-white hover:bg-indigo-400 sm:w-auto"
            >
              Create workspace
            </Link>
            <a
              href="#pricing"
              className="w-full rounded-md border border-white/20 px-6 py-3 text-center font-medium text-white hover:border-indigo-400 hover:text-indigo-200 sm:w-auto"
            >
              See pricing
            </a>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-28 px-2 py-16">
        <p className="mb-2 text-center text-sm uppercase tracking-[0.18em] text-indigo-300">
          About
        </p>
        <h2 className="mb-4 text-center text-3xl font-semibold text-white sm:text-4xl">
          Built for catalog operations
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-gray-400">
          Stop juggling spreadsheets across vendors. Bring every source into one
          tenant-isolated workspace, then match, review, and ship updates.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Ingest",
              text: "Load your catalog, manufacturer lists, and competitor feeds as separate sources with a shared product schema.",
            },
            {
              title: "Match",
              text: "Align SKU, MPN, GTIN, and brand so replacements and overlaps surface in a review queue instead of a guess.",
            },
            {
              title: "Export",
              text: "Download CSV or Excel that is ready to upload — after a human has signed off on the matches that matter.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-indigo-400/25 bg-[#22262d] p-6 shadow-[0_0_24px_rgba(99,102,241,0.12)]"
            >
              <h3 className="mb-2 text-xl font-semibold text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="scroll-mt-28 px-2 py-16">
        <p className="mb-2 text-center text-sm uppercase tracking-[0.18em] text-indigo-300">
          Pricing
        </p>
        <h2 className="mb-4 text-center text-3xl font-semibold text-white sm:text-4xl">
          Simple plans for each team size
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-gray-400">
          Placeholder pricing while CatalogIQ is in build. Change these numbers
          before you take payments.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.featured
                  ? "border-indigo-400 bg-[#22262d] shadow-[0_0_32px_rgba(99,102,241,0.28)]"
                  : "border-white/10 bg-[#22262d]"
              }`}
            >
              {plan.featured ? (
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-indigo-300">
                  Most teams
                </p>
              ) : (
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-gray-500">
                  {plan.name}
                </p>
              )}
              <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
              <p className="mt-3 text-3xl font-semibold text-white">
                {plan.price}
                <span className="text-base font-normal text-gray-400">{plan.period}</span>
              </p>
              <p className="mt-3 text-sm text-gray-400">{plan.blurb}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-gray-300">
                {plan.features.map((feature) => (
                  <li key={feature}>— {feature}</li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`mt-8 rounded-md py-2.5 text-center font-medium ${
                  plan.featured
                    ? "bg-indigo-500 text-white hover:bg-indigo-400"
                    : "border border-white/20 text-white hover:border-indigo-400"
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="contact-us" className="scroll-mt-28 px-2 py-10 text-center">
        <p className="text-sm text-gray-500">
          Questions? Create a workspace and we will use that email as the account
          contact.
        </p>
      </section>
    </div>
  );
};

export default Home;
