import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { acceptInvite } from "../actions/authActions";
import Header from "../components/Header";

const fieldClass =
  "mt-2 w-full rounded-lg border border-white/10 bg-canvas px-3 py-2.5 text-ink outline-none placeholder:text-mute focus:border-brand";

const AcceptInvite = () => {
  const { token } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth);
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState(null);
  const loading = status === "loading";

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get(`/api/v1/auth/invite/${token}`);
        setInvite(response.data);
        setName(response.data.name || "");
      } catch (err) {
        setLoadError(
          err.response?.data?.message || "This invite link is invalid or has expired"
        );
      }
    };

    load();
  }, [token]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    if (invite.needsPassword && password !== confirm) {
      setFormError("Passwords do not match");
      return;
    }
    try {
      const data = await dispatch(acceptInvite(token, name, password));
      navigate(data.signIn ? "/login" : "/dashboard");
    } catch {
      // Error is shown from Redux status.
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <Header />

      <div className="flex justify-center px-6 py-16 sm:py-24">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-panel p-8 sm:p-10">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
            CatalogIQ
          </p>

          {loadError ? (
            <>
              <h1 className="mb-2 text-3xl font-semibold tracking-tight text-ink">
                Invite unavailable
              </h1>
              <p className="mb-6 text-mute">
                {loadError}. Ask the workspace owner for a new link.
              </p>
              <Link to="/login" className="text-brand hover:text-brand-hover">
                Go to sign in
              </Link>
            </>
          ) : !invite ? (
            <p className="text-mute">Checking invite...</p>
          ) : (
            <form onSubmit={onSubmit}>
              <h1 className="mb-2 text-3xl font-semibold tracking-tight text-ink">
                Join {invite.workspace}
              </h1>
              <p className="mb-6 text-mute">
                You were invited as{" "}
                <span className="capitalize text-ink">{invite.role}</span> with{" "}
                <span className="text-ink">{invite.email}</span>.
                {invite.needsPassword
                  ? " Choose a password to finish."
                  : " You already have an account, so just accept and sign in."}
              </p>

              {formError || status === "failed" ? (
                <p className="mb-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
                  {formError || error}
                </p>
              ) : null}

              {invite.needsPassword ? (
                <>
                  <label className="mb-4 block text-sm text-ink">
                    Name
                    <input
                      type="text"
                      name="name"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      disabled={loading}
                      className={fieldClass}
                    />
                  </label>

                  <label className="mb-4 block text-sm text-ink">
                    Password
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
                </>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-70"
              >
                {loading ? "Joining..." : "Accept invite"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
