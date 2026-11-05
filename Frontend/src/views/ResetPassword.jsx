import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";

const fieldClass =
  "mt-2 w-full rounded-lg border border-white/10 bg-canvas px-3 py-2.5 text-ink outline-none placeholder:text-mute focus:border-brand";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`/api/v1/auth/reset-password/${token}`, {
        password,
      });
      navigate("/login", { state: { notice: response.data.message } });
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset the password");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <Header />

      <div className="flex justify-center px-6 py-16 sm:py-24">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-panel p-8 sm:p-10"
        >
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
            CatalogIQ
          </p>
          <h1 className="mb-6 text-3xl font-semibold tracking-tight text-ink">
            Choose a new password
          </h1>

          {error ? (
            <p className="mb-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <label className="mb-4 block text-sm text-ink">
            New password
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
              className={fieldClass}
            />
          </label>

          <label className="mb-6 block text-sm text-ink">
            Confirm password
            <input
              type="password"
              name="confirm"
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
              disabled={loading}
              className={fieldClass}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-70"
          >
            {loading ? "Saving..." : "Save new password"}
          </button>

          <p className="mt-6 text-center text-sm text-mute">
            <Link to="/forgot-password" className="text-brand hover:text-brand-hover">
              Need a new link?
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
