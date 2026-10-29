import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../actions/authActions";
import Header from "../components/Header";

const fieldClass =
  "mt-2 w-full rounded-lg border border-white/10 bg-canvas px-3 py-2.5 text-ink outline-none placeholder:text-mute focus:border-brand";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth);
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loading = status === "loading";

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      await dispatch(register(companyName, name, email, password));
      navigate("/login");
    } catch {
      // Error is shown from Redux status.
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
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-ink">
            Create workspace
          </h1>
          <p className="mb-6 text-mute">
            This creates a new tenant. You become the owner.
          </p>

          {status === "failed" ? (
            <p className="mb-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {error || "Could not create the workspace."}
            </p>
          ) : null}

          <label className="mb-4 block text-sm text-ink">
            Company name
            <input
              type="text"
              name="organization"
              autoComplete="organization"
              placeholder="Chrome World Trucks"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              required
              disabled={loading}
              className={fieldClass}
            />
          </label>

          <label className="mb-4 block text-sm text-ink">
            Your name
            <input
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Alex Owner"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={loading}
              className={fieldClass}
            />
          </label>

          <label className="mb-4 block text-sm text-ink">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
              className={fieldClass}
            />
          </label>

          <label className="mb-6 block text-sm text-ink">
            Password
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
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
            {loading ? "Creating..." : "Create workspace"}
          </button>

          <p className="mt-6 text-center text-sm text-mute">
            Already have an account?{" "}
            <Link to="/login" className="text-brand hover:text-brand-hover">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
