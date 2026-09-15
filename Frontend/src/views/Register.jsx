import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../actions/authActions";
import Header from "../components/Header";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth);
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      await dispatch(register(companyName, name, email, password));
      navigate("/");
    } catch {
      // error is stored in Redux and shown below
    }
  };
  const fieldClass =
    "mt-2 w-full rounded-md border border-white/15 bg-[#1c1f24] px-3 py-2.5 text-white outline-none placeholder:text-gray-500 focus:border-indigo-400";

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
          <h1 className="mb-2 text-3xl font-semibold text-white">
            Create workspace
          </h1>
          <p className="mb-6 text-gray-400">
            This creates a new tenant. You become the owner.
          </p>

          {status === "failed" ? (
            <p className="mb-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <label className="mb-4 block text-sm text-gray-300">
            Company name
            <input
              type="text"
              placeholder="Chrome World Trucks"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              required
              className={fieldClass}
            />
          </label>

          <label className="mb-4 block text-sm text-gray-300">
            Your name
            <input
              type="text"
              placeholder="Alex Owner"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className={fieldClass}
            />
          </label>

          <label className="mb-4 block text-sm text-gray-300">
            Email
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className={fieldClass}
            />
          </label>

          <label className="mb-6 block text-sm text-gray-300">
            Password
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              className={fieldClass}
            />
          </label>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-md bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-400 disabled:opacity-70"
          >
            {status === "loading" ? "Creating..." : status === "succeeded" ? "Workspace created successfully" : "Create workspace"}
          </button>

          {status === "succeeded" ? (
            <p className="mt-6 text-center text-sm text-gray-400">
              Workspace created successfully{" "}
              <Link to="/" className="text-indigo-300 hover:text-indigo-200">
                Go to home
              </Link>
            </p>
          ) : null}

          {status === "failed" ? (
            <p className="mt-6 text-center text-sm text-gray-400">
              Workspace creation failed
            </p>
          ) : null}

          {status === "idle" ? (
            <p className="mt-6 text-center text-sm text-gray-400">
              Already have an account?
            <Link to="/login" className="text-indigo-300 hover:text-indigo-200">
                Sign in
              </Link>
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
};

export default Register;
