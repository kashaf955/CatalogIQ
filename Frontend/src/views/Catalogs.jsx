import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const typeLabel = {
  our_catalog: "Company catalog",
  manufacturer: "Manufacturer",
  competitor: "Competitor",
};

const kindLabel = {
  api: "API",
  csv: "CSV",
  excel: "Excel",
  feed: "Feed",
  website: "Website",
};

const tabs = [
  {
    id: "company",
    label: "Company catalog",
    types: ["our_catalog"],
    empty: "No company catalog yet. Add your Excel file or API source.",
    addLabel: "Add company catalog",
  },
  {
    id: "compare",
    label: "Compare catalogs",
    types: ["manufacturer", "competitor"],
    empty: "No catalogs to compare yet. Add a manufacturer Excel or competitor website.",
    addLabel: "Add compare catalog",
  },
];

const Catalogs = () => {
  const { role } = useSelector((state) => state.auth);
  const canManage = role === "owner" || role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const tabId = searchParams.get("tab") === "compare" ? "compare" : "company";
  const tab = tabs.find((item) => item.id === tabId) || tabs[0];
  const [catalogs, setCatalogs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const response = await axios.get("/api/v1/catalogs", {
          withCredentials: true,
        });
        setCatalogs(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load catalogs");
      } finally {
        setLoading(false);
      }
    };

    loadCatalogs();
  }, []);

  const rows = useMemo(
    () => catalogs.filter((catalog) => tab.types.includes(catalog.type)),
    [catalogs, tab.types]
  );

  const setTab = (next) => {
    setSearchParams(next === "company" ? {} : { tab: next });
  };

  const removeCatalog = async (catalogId) => {
    setError(null);
    try {
      await axios.delete(`/api/v1/catalogs/${catalogId}`, {
        withCredentials: true,
      });
      setCatalogs((current) =>
        current.filter((catalog) => catalog._id !== catalogId)
      );
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove catalog");
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-teal-300">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold text-white">Catalogs</h1>
          <p className="mt-2 text-gray-400">
            Your company catalog, then manufacturer and competitor sources to
            compare against.
          </p>
        </div>
        {canManage ? (
          <Link
            to={`/dashboard/catalogs/new?tab=${tab.id}`}
            className="rounded-md bg-teal-600 px-4 py-2.5 text-center font-medium text-white hover:bg-teal-500"
          >
            {tab.addLabel}
          </Link>
        ) : null}
      </div>

      <div className="mb-6 flex gap-2 border-b border-white/10">
        {tabs.map((item) => {
          const active = item.id === tab.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`-mb-px rounded-t-md px-4 py-2.5 text-sm font-medium ${
                active
                  ? "border border-b-transparent border-teal-400/40 bg-[#1a242b] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-teal-400/30 bg-[#1a242b] shadow-[0_0_24px_rgba(13,148,136,0.12)]">
        {error ? (
          <p className="px-4 py-3 text-sm text-red-300">{error}</p>
        ) : null}
        {loading ? (
          <p className="px-4 py-6 text-sm text-gray-400">Loading catalogs...</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">{tab.empty}</p>
        ) : (
          <table className="w-full min-w-lg text-left text-sm">
            <thead className="border-b border-white/10 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Connection</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((catalog) => (
                <tr
                  key={catalog._id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 text-white">
                    <Link
                      to={`/dashboard/catalogs/${catalog._id}`}
                      className="hover:text-teal-300"
                    >
                      {catalog.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {typeLabel[catalog.type] || catalog.type}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {kindLabel[catalog.connection?.kind] ||
                      catalog.connection?.kind ||
                      "—"}
                    {catalog.connection?.platform
                      ? ` · ${catalog.connection.platform}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-300">
                    {catalog.status}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link
                        to={`/dashboard/products?source=${catalog._id}`}
                        className="text-teal-300 hover:text-teal-200"
                      >
                        View products
                      </Link>
                      {canManage ? (
                        <Link
                          to={`/dashboard/catalogs/${catalog._id}`}
                          className="text-teal-300 hover:text-teal-200"
                        >
                          {catalog.connection?.kind === "excel" ||
                          catalog.connection?.kind === "csv" ||
                          !catalog.connection?.kind
                            ? "Upload"
                            : "Ingest"}
                        </Link>
                      ) : (
                        <Link
                          to={`/dashboard/catalogs/${catalog._id}`}
                          className="text-teal-300 hover:text-teal-200"
                        >
                          View
                        </Link>
                      )}
                      {canManage ? (
                        <>
                          <Link
                            to={`/dashboard/catalogs/${catalog._id}/edit?tab=${tab.id}`}
                            className="text-teal-300 hover:text-teal-200"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeCatalog(catalog._id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            Remove
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Catalogs;
