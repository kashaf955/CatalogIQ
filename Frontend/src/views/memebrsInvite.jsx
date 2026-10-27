import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const fieldClass =
  "mt-2 w-full rounded-md border border-white/10 bg-canvas px-3 py-2.5 text-ink outline-none placeholder:text-mute focus:border-brand";

const MembersInvite = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("manager");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const response = await axios.post(
        "/api/v1/tenants/me/members",
        { email, role, name: name || undefined },
        { withCredentials: true }
      );
      setMessage(response.data.message || "Member invited");
      setEmail("");
      setName("");
      setRole("manager");
    } catch (err) {
      setError(err.response?.data?.message || "Invite failed");
    }
  };

  return (
    <div className="flex justify-center py-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-brand/25 bg-panel p-8 shadow-sm"
      >
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-brand">
            Workspace
          </p>
          <h1 className="mb-2 text-3xl font-semibold text-ink">
            Invite a member
          </h1>
          <p className="mb-6 text-mute">
            They join this tenant with the role you choose. Owner cannot be
            assigned here.
          </p>

          {error ? (
            <p className="mb-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mb-4 rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
              {message}{" "}
              <Link to="/dashboard/members" className="text-brand hover:text-brand-hover">
                View members
              </Link>
            </p>
          ) : null}

          <label className="mb-4 block text-sm text-ink">
            Email
            <input
              type="email"
              name="email"
              placeholder="teammate@company.com"
              required
              className={fieldClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="mb-4 block text-sm text-ink">
            Name
            <input
              type="text"
              name="name"
              placeholder="Optional display name"   
              className={fieldClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="mb-6 block text-sm text-ink">
            Role
            <select
              name="role"
              required
              className={fieldClass}
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
            </select>
          </label>

          <button
            type="submit"
            className="w-full rounded-md bg-brand py-3 font-medium text-white hover:bg-brand-hover"
          >
            Send invite
          </button>

          <p className="mt-6 text-center text-sm text-mute">
            <Link to="/dashboard/members" className="text-brand hover:text-brand-hover">
              Back to members
            </Link>
          </p>
        </form>
    </div>
  );
};

export default MembersInvite;
