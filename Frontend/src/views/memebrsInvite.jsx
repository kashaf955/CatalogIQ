import React, { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import axios from "axios";

const fieldClass =
  "mt-2 w-full rounded-md border border-white/15 bg-[#1c1f24] px-3 py-2.5 text-white outline-none placeholder:text-gray-500 focus:border-indigo-400";

const MembersInvite = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
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
      setRole("member");
    } catch (err) {
      setError(err.response?.data?.message || "Invite failed");
    }
  };

  return (
    <div className="pb-16">
      <Header />

      <div className="flex justify-center px-4 py-16">
        <form
        onSubmit={handleSubmit}
          className="w-full max-w-md rounded-2xl border border-indigo-400/40 bg-[#22262d] p-8 shadow-[0_0_32px_rgba(99,102,241,0.25)]"
        >
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-indigo-300">
            Workspace
          </p>
          <h1 className="mb-2 text-3xl font-semibold text-white">
            Invite a member
          </h1>
          <p className="mb-6 text-gray-400">
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
              <Link to="/members" className="text-indigo-300 hover:text-indigo-200">
                View members
              </Link>
            </p>
          ) : null}

          <label className="mb-4 block text-sm text-gray-300">
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

          <label className="mb-4 block text-sm text-gray-300">
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

          <label className="mb-6 block text-sm text-gray-300">
            Role
            <select
              name="role"
              required
              className={fieldClass}
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="reviewer">Reviewer</option>
              <option value="member">Member</option>
            </select>
          </label>

          <button
            type="submit"
            className="w-full rounded-md bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-400"
          >
            Send invite
          </button>

          <p className="mt-6 text-center text-sm text-gray-400">
            <Link to="/members" className="text-indigo-300 hover:text-indigo-200">
              Back to members
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default MembersInvite;
