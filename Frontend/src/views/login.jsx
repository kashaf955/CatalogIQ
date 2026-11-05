import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../actions/authActions";
import { clearFeedback } from "../reducers/authReducers";
import Header from "../components/Header";

const fieldClass =
  "mt-2 w-full rounded-lg border border-white/10 bg-canvas px-3 py-2.5 text-ink outline-none placeholder:text-mute focus:border-brand";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const notice = useLocation().state?.notice;
  const { status, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaces, setWorkspaces] = useState(null);
  const loading = status === "loading";

  const signIn = async (tenantId) => {
    try {
      await dispatch(login(email, password, tenantId));
      navigate("/dashboard");
    } catch (err) {
      const tenants = err.response?.data?.tenants;
      if (err.response?.status === 409 && Array.isArray(tenants)) {
        dispatch(clearFeedback());
        setWorkspaces(tenants);
      }
      // Other errors are shown from Redux status.
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    signIn();
  };

  if (workspaces) {
    return (
      <div className="min-h-screen pb-16">
        <Header />

        <div className="flex justify-center px-6 py-16 sm:py-24">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-panel p-8 sm:p-10">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
              CatalogIQ
            </p>
            <h1 className="mb-2 text-3xl font-semibold tracking-tight text-ink">
              Choose a workspace
            </h1>
            <p className="mb-6 text-mute">You belong to more than one.</p>

            {status === "failed" ? (
              <p className="mb-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
                {error || "Could not sign in to that workspace."}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  disabled={loading}
                  onClick={() => signIn(workspace.id)}
                  className="w-full rounded-lg border border-white/10 px-4 py-3 text-left font-medium text-ink hover:border-brand disabled:opacity-70"
                >
                  {workspace.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setWorkspaces(null)}
              className="mt-6 w-full text-center text-sm text-brand hover:text-brand-hover"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            Sign in
          </h1>
          <p className="mb-6 text-mute">
            Use your workspace email and password.
          </p>

          {notice && status !== "failed" ? (
            <p className="mb-4 rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
              {notice}
            </p>
          ) : null}

          {status === "failed" ? (
            <p className="mb-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {error || "Could not sign in. Check your email and password."}
            </p>
          ) : null}

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
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-6 text-center text-sm">
            <Link to="/forgot-password" className="text-brand hover:text-brand-hover">
              Forgot password?
            </Link>
          </p>

          <p className="mt-3 text-center text-sm text-mute">
            Need a workspace?{" "}
            <Link to="/register" className="text-brand hover:text-brand-hover">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
