import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div>
      <p className="mb-1 text-sm uppercase tracking-[0.18em] text-indigo-300">
        Workspace
      </p>
      <h1 className="text-3xl font-semibold text-white">
        Welcome{user?.name ? `, ${user.name}` : ""}
      </h1>
      <p className="mt-2 text-gray-400">
        Ingest sources, review matches, and export a clean file.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          to="/dashboard/catalogs"
          className="rounded-2xl border border-indigo-400/30 bg-[#22262d] p-6 shadow-[0_0_24px_rgba(99,102,241,0.12)] hover:border-indigo-400"
        >
          <h2 className="text-xl font-semibold text-white">Catalogs</h2>
          <p className="mt-2 text-sm text-gray-400">
            Company catalog (Excel or API), manufacturer Excel, competitor sites.
          </p>
        </Link>
        <Link
          to="/dashboard/products"
          className="rounded-2xl border border-indigo-400/30 bg-[#22262d] p-6 shadow-[0_0_24px_rgba(99,102,241,0.12)] hover:border-indigo-400"
        >
          <h2 className="text-xl font-semibold text-white">Products</h2>
          <p className="mt-2 text-sm text-gray-400">
            Browse SKUs after a source has been ingested.
          </p>
        </Link>
        <Link
          to="/dashboard/matches"
          className="rounded-2xl border border-indigo-400/30 bg-[#22262d] p-6 shadow-[0_0_24px_rgba(99,102,241,0.12)] hover:border-indigo-400"
        >
          <h2 className="text-xl font-semibold text-white">Matches</h2>
          <p className="mt-2 text-sm text-gray-400">
            See suggested pairs against manufacturers and competitors.
          </p>
        </Link>
        <Link
          to="/dashboard/reviews"
          className="rounded-2xl border border-indigo-400/30 bg-[#22262d] p-6 shadow-[0_0_24px_rgba(99,102,241,0.12)] hover:border-indigo-400"
        >
          <h2 className="text-xl font-semibold text-white">Review</h2>
          <p className="mt-2 text-sm text-gray-400">
            Accept or reject matches before anything is exported.
          </p>
        </Link>
        <Link
          to="/dashboard/export"
          className="rounded-2xl border border-indigo-400/30 bg-[#22262d] p-6 shadow-[0_0_24px_rgba(99,102,241,0.12)] hover:border-indigo-400"
        >
          <h2 className="text-xl font-semibold text-white">Export</h2>
          <p className="mt-2 text-sm text-gray-400">
            Download CSV or Excel for the rows you approved.
          </p>
        </Link>
        <Link
          to="/dashboard/members"
          className="rounded-2xl border border-indigo-400/30 bg-[#22262d] p-6 shadow-[0_0_24px_rgba(99,102,241,0.12)] hover:border-indigo-400"
        >
          <h2 className="text-xl font-semibold text-white">Members</h2>
          <p className="mt-2 text-sm text-gray-400">
            See who belongs to this workspace and remove people if you are an
            owner or admin.
          </p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
