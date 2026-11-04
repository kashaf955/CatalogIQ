import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const fieldClass =
  "mt-2 w-full rounded-md border border-white/10 bg-canvas px-3 py-2.5 text-ink outline-none placeholder:text-mute focus:border-brand";

const MembersInvite = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [inviteUrl, setInviteUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setInviteUrl(null);
    setCopied(false);
    try {
      const response = await axios.post(
        "/api/v1/tenants/me/members",
        { email, role: "manager", name: name || undefined },
        { withCredentials: true }
      );
      setMessage(response.data.message || "Member invited");
      setInviteUrl(response.data.inviteUrl || null);
      setEmailSent(Boolean(response.data.emailSent));
      setEmail("");
      setName("");
    } catch (err) {
      setError(err.response?.data?.message || "Invite failed");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
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
            We email new teammates a link to set their password. People who
            already have a CatalogIQ account are added right away.
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

          {inviteUrl ? (
            <div className="mb-4 rounded-md border border-brand/25 bg-canvas p-3">
              <p className="mb-2 text-xs text-mute">
                {emailSent
                  ? "We emailed this link. You can also copy it. It works once and expires in 7 days."
                  : "Send this link to your teammate. It works once and expires in 7 days."}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  onFocus={(event) => event.target.select()}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-panel px-2 py-1.5 text-xs text-ink"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
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

          <p className="mb-6 text-sm text-mute">
            They join as a <span className="text-ink">Manager</span>: they can
            work with catalogs, matching, review and export, but cannot invite
            people or change workspace settings.
          </p>

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
