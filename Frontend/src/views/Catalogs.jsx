import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const typeLabel = {
  our_catalog: "Our catalog",
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

const Catalogs = () => {
  const { role } = useSelector((state) => state.auth);
  const canManage = role === "owner" || role === "admin";
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
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-indigo-300">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold text-white">Catalogs</h1>
          <p className="mt-2 text-gray-400">
            Sources for your catalog, manufacturers, and competitors.
          </p>
        </div>
        {canManage ? (
          <Link
            to="/dashboard/catalogs/new"
            className="rounded-md bg-indigo-500 px-4 py-2.5 text-center font-medium text-white hover:bg-indigo-400"
          >
            Add catalog
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-indigo-400/30 bg-[#22262d] shadow-[0_0_24px_rgba(99,102,241,0.12)]">
        {error ? (
          <p className="px-4 py-3 text-sm text-red-300">{error}</p>
        ) : null}
        {loading ? (
          <p className="px-4 py-6 text-sm text-gray-400">Loading catalogs...</p>
        ) : catalogs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">No catalogs yet.</p>
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
              {catalogs.map((catalog) => (
                <tr
                  key={catalog._id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 text-white">{catalog.name}</td>
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
                    {canManage ? (
                      <div className="flex gap-3">
                        <Link
                          to={`/dashboard/catalogs/${catalog._id}`}
                          className="text-indigo-300 hover:text-indigo-200"
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
                      </div>
                    ) : null}
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
