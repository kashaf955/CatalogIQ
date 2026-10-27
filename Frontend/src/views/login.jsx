import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../actions/authActions";
import Header from "../components/Header";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      await dispatch(login(email, password));
      navigate("/dashboard");
    } catch {
    }
  };

  return (
    <div className="pb-16">
      <Header />

      <div className="flex justify-center px-4 py-16">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-2xl border border-brand/25 bg-panel p-8 shadow-sm"
        >
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-brand">
            CatalogIQ
          </p>
          <h1 className="mb-2 text-3xl font-semibold text-ink">Sign in</h1>
          <p className="mb-6 text-mute">
            Use your workspace email and password.
          </p>

          {status === "failed" ? (
            <p className="mb-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <label className="mb-4 block text-sm text-ink">
            Email
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-md border border-white/10 bg-canvas px-3 py-2.5 text-ink outline-none placeholder:text-mute focus:border-brand"
            />
          </label>

          <label className="mb-6 block text-sm text-ink">
            Password
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-md border border-white/10 bg-canvas px-3 py-2.5 text-ink outline-none placeholder:text-mute focus:border-brand"
            />
          </label>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-md bg-brand py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-70"
          >
            {status === "loading" ? "Signing in..." : status === "succeeded" ? "Login successful" : "Login"}
          </button>

          {status === "succeeded" ? (
            <p className="mt-6 text-center text-sm text-mute">
              Login successful
              <Link to="/" className="text-brand hover:text-brand-hover">
                Go to home
              </Link>
            </p>
          ) : null}

          {status === "failed" ? (
            <p className="mt-6 text-center text-sm text-mute">
              Login failed
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
};

export default Login;
