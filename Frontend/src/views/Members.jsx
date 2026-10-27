import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const Members = () => {
  const { role } = useSelector((state) => state.auth);
  const canInvite = role === "owner" || role === "admin";
  const [members, setMembers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const response = await axios.get("/api/v1/tenants/me/members", {
          withCredentials: true,
        });
        setMembers(response.data.members || []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load members");
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, []);

  const removeMember = async (memberId) => {
    setError(null);
    try {
      await axios.delete(`/api/v1/tenants/me/members/${memberId}`, {
        withCredentials: true,
      });
      setMembers((current) => current.filter((member) => member.id !== memberId));
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove member");
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-brand">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold text-ink">Members</h1>
          <p className="mt-2 text-mute">
            People who belong to this tenant.
          </p>
        </div>
        {canInvite ? (
          <Link
            to="/dashboard/members/invite"
            className="rounded-md bg-brand px-4 py-2.5 text-center font-medium text-white hover:bg-brand-hover"
          >
            Invite member
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand/20 bg-panel shadow-sm">
        {error ? (
          <p className="px-4 py-3 text-sm text-red-300">{error}</p>
        ) : null}
        {loading ? (
          <p className="px-4 py-6 text-sm text-mute">Loading members...</p>
        ) : members.length === 0 ? (
          <p className="px-4 py-6 text-sm text-mute">No members yet.</p>
        ) : (
          <table className="w-full min-w-lg text-left text-sm">
            <thead className="border-b border-white/10 text-mute">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-ink">
                    {member.user?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {member.user?.email || "—"}
                  </td>
                  <td className="px-4 py-3 capitalize text-ink">{member.role}</td>
                  <td className="px-4 py-3 capitalize text-ink">
                    {member.status}
                  </td>
                  <td className="px-4 py-3">
                    {canInvite && member.role !== "owner" && member.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        className="text-red-500 hover:text-red-300"
                      >
                        Remove
                      </button>
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

export default Members;
