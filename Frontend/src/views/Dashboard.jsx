import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div>
      <p className="mb-1 text-sm uppercase tracking-[0.18em] text-brand">
        Workspace
      </p>
      <h1 className="text-3xl font-semibold text-ink">
        Welcome{user?.name ? `, ${user.name}` : ""}
      </h1>
      <p className="mt-2 text-mute">
        Ingest sources, review matches, and export a clean file.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Link
          to="/dashboard/catalogs"
          className="rounded-2xl border border-white/10 bg-panel p-6 transition-colors hover:border-brand/40 hover:bg-canvas"
        >
          <h2 className="text-xl font-semibold text-ink">Catalogs</h2>
          <p className="mt-2 text-sm text-mute">
            Company catalog (Excel or API), manufacturer Excel, competitor sites.
          </p>
        </Link>
        <Link
          to="/dashboard/products"
          className="rounded-2xl border border-white/10 bg-panel p-6 transition-colors hover:border-brand/40 hover:bg-canvas"
        >
          <h2 className="text-xl font-semibold text-ink">Products</h2>
          <p className="mt-2 text-sm text-mute">
            Browse SKUs after a source has been ingested.
          </p>
        </Link>
        <Link
          to="/dashboard/matches"
          className="rounded-2xl border border-white/10 bg-panel p-6 transition-colors hover:border-brand/40 hover:bg-canvas"
        >
          <h2 className="text-xl font-semibold text-ink">Matches</h2>
          <p className="mt-2 text-sm text-mute">
            See suggested pairs against manufacturers and competitors.
          </p>
        </Link>
        <Link
          to="/dashboard/reviews"
          className="rounded-2xl border border-white/10 bg-panel p-6 transition-colors hover:border-brand/40 hover:bg-canvas"
        >
          <h2 className="text-xl font-semibold text-ink">Review</h2>
          <p className="mt-2 text-sm text-mute">
            Accept or reject matches before anything is exported.
          </p>
        </Link>
        <Link
          to="/dashboard/export"
          className="rounded-2xl border border-white/10 bg-panel p-6 transition-colors hover:border-brand/40 hover:bg-canvas"
        >
          <h2 className="text-xl font-semibold text-ink">Export</h2>
          <p className="mt-2 text-sm text-mute">
            Download CSV or Excel for the rows you approved.
          </p>
        </Link>
        <Link
          to="/dashboard/members"
          className="rounded-2xl border border-white/10 bg-panel p-6 transition-colors hover:border-brand/40 hover:bg-canvas"
        >
          <h2 className="text-xl font-semibold text-ink">Members</h2>
          <p className="mt-2 text-sm text-mute">
            See who belongs to this workspace. Owners and admins can invite
            people as admin or manager.
          </p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
