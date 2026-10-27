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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.16),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-brand">
            Catalog matching for parts teams
          </p>
          <h1 className="mb-5 text-4xl font-semibold leading-tight text-ink sm:text-5xl lg:text-6xl">
            One product model for your catalog, manufacturers, and competitors.
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base text-mute sm:text-lg">
            CatalogIQ ingests messy source files, matches SKUs and MPNs, and
            exports upload-ready updates your team can review before they go live.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="w-full rounded-md bg-brand px-6 py-3 text-center font-medium text-white hover:bg-brand-hover sm:w-auto"
            >
              Create workspace
            </Link>
            <a
              href="#pricing"
              className="w-full rounded-md border border-white/20 px-6 py-3 text-center font-medium text-ink hover:border-brand hover:text-brand-hover sm:w-auto"
            >
              See pricing
            </a>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-28 px-2 py-16">
        <p className="mb-2 text-center text-sm uppercase tracking-[0.18em] text-brand">
          About
        </p>
        <h2 className="mb-4 text-center text-3xl font-semibold text-ink sm:text-4xl">
          Built for catalog operations
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-mute">
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
              className="rounded-2xl border border-brand/20 bg-panel p-6 shadow-sm"
            >
              <h3 className="mb-2 text-xl font-semibold text-ink">{item.title}</h3>
              <p className="text-sm leading-relaxed text-mute">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="scroll-mt-28 px-2 py-16">
        <p className="mb-2 text-center text-sm uppercase tracking-[0.18em] text-brand">
          Pricing
        </p>
        <h2 className="mb-4 text-center text-3xl font-semibold text-ink sm:text-4xl">
          Simple plans for each team size
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-mute">
          Placeholder pricing while CatalogIQ is in build. Change these numbers
          before you take payments.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.featured
                  ? "border-brand/40 bg-panel shadow-sm"
                  : "border-white/10 bg-panel"
              }`}
            >
              {plan.featured ? (
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-brand">
                  Most teams
                </p>
              ) : (
                <p className="mb-3 text-xs uppercase tracking-[0.16em] text-mute">
                  {plan.name}
                </p>
              )}
              <h3 className="text-2xl font-semibold text-ink">{plan.name}</h3>
              <p className="mt-3 text-3xl font-semibold text-ink">
                {plan.price}
                <span className="text-base font-normal text-mute">{plan.period}</span>
              </p>
              <p className="mt-3 text-sm text-mute">{plan.blurb}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-ink">
                {plan.features.map((feature) => (
                  <li key={feature}>— {feature}</li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`mt-8 rounded-md py-2.5 text-center font-medium ${
                  plan.featured
                    ? "bg-brand text-white hover:bg-brand-hover"
                    : "border border-white/20 text-ink hover:border-brand"
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="contact-us" className="scroll-mt-28 px-2 py-10 text-center">
        <p className="text-sm text-mute">
          Questions? Create a workspace and we will use that email as the account
          contact.
        </p>
      </section>
    </div>
  );
};

export default Home;
