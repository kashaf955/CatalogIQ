import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

const steps = [
  {
    n: "01",
    to: "/dashboard/catalogs",
    title: "Catalogs",
    text: "Ingest the company catalog, then manufacturer and competitor sources.",
  },
  {
    n: "02",
    to: "/dashboard/products",
    title: "Products",
    text: "Browse SKUs, MPNs, and descriptions after a source has loaded.",
  },
  {
    n: "03",
    to: "/dashboard/matches",
    title: "Matches",
    text: "Run comparison against manufacturers and competitor catalogs.",
  },
  {
    n: "04",
    to: "/dashboard/reviews",
    title: "Review",
    text: "Accept or reject suggested pairs before anything is exported.",
  },
  {
    n: "05",
    to: "/dashboard/export",
    title: "Export",
    text: "Download CSV or Excel for the rows you approved.",
  },
  {
    n: "06",
    to: "/dashboard/members",
    title: "Members",
    text: "Invite admins and managers to this workspace.",
  },
];

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
        Workspace
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mute">
        Ingest sources, review matches, and export a clean file — in that order.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {steps.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group rounded-2xl border border-white/10 bg-panel p-6 transition-all hover:-translate-y-0.5 hover:border-brand/35 hover:bg-[#1c1c1f]"
          >
            <span className="text-[11px] font-medium tracking-[0.16em] text-brand">
              {item.n}
            </span>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-ink group-hover:text-white">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mute">{item.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
