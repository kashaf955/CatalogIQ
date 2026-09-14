import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../actions/authActions";
import Header from "../components/Header";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await dispatch(login(email, password));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-16">
      <Header />

      <div className="flex justify-center px-4 py-16">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-2xl border border-indigo-400/40 bg-[#22262d] p-8 shadow-[0_0_32px_rgba(99,102,241,0.25)]"
        >
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-indigo-300">
            CatalogIQ
          </p>
          <h1 className="mb-2 text-3xl font-semibold text-white">Sign in</h1>
          <p className="mb-6 text-gray-400">
            Use your workspace email and password.
          </p>

          {error ? (
            <p className="mb-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <label className="mb-4 block text-sm text-gray-300">
            Email
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-md border border-white/15 bg-[#1c1f24] px-3 py-2.5 text-white outline-none placeholder:text-gray-500 focus:border-indigo-400"
            />
          </label>

          <label className="mb-6 block text-sm text-gray-300">
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-md border border-white/15 bg-[#1c1f24] px-3 py-2.5 text-white outline-none placeholder:text-gray-500 focus:border-indigo-400"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-400 disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          <p className="mt-6 text-center text-sm text-gray-400">
            New company?{" "}
            <Link to="/register" className="text-indigo-300 hover:text-indigo-200">
              Create a workspace
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
