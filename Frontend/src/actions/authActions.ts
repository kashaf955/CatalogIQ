import axios from "axios";
import type { AppDispatch, RootState } from "../../store";
import type { AcceptInviteResponse, AuthResponse } from "../types/api";
import { apiMessage } from "../utils/apiError";
import {
  setRole,
  setTenantId,
  setUser,
  setLoading,
  setSuccess,
  setFailed,
  clearFeedback,
  setChecked,
} from "../reducers/authReducers";

const API = "/api/v1/auth";

const startSession = (dispatch: AppDispatch, data: AuthResponse) => {
  dispatch(setUser(data.user));
  dispatch(setTenantId(data.tenant?.id ?? null));
  dispatch(setRole(data.role));
  dispatch(setChecked());
};

export const login =
  (email: string, password: string, tenantId?: string) =>
  async (dispatch: AppDispatch) => {
    const body: { email: string; password: string; tenantId?: string } = {
      email,
      password,
    };
    if (tenantId) {
      body.tenantId = tenantId;
    }

    dispatch(setLoading());

    try {
      const response = await axios.post<AuthResponse>(`${API}/login`, body, {
        withCredentials: true,
      });

      dispatch(setSuccess("Login successful"));
      startSession(dispatch, response.data);
      return response.data;
    } catch (err) {
      dispatch(setFailed(apiMessage(err, "Invalid credentials")));
      throw err;
    }
  };

export const register =
  (companyName: string, name: string, email: string, password: string) =>
  async (dispatch: AppDispatch) => {
    dispatch(setLoading());

    try {
      const response = await axios.post<AuthResponse>(
        `${API}/register`,
        { companyName, name, email, password },
        { withCredentials: true }
      );

      dispatch(setSuccess("Registration successful"));
      startSession(dispatch, response.data);
      return response.data;
    } catch (err) {
      dispatch(setFailed(apiMessage(err, "Registration failed")));
      throw err;
    }
  };

export const acceptInvite =
  (token: string, name: string, password: string) =>
  async (dispatch: AppDispatch) => {
    dispatch(setLoading());

    try {
      const response = await axios.post<AcceptInviteResponse>(
        `${API}/invite/${token}/accept`,
        { name, password },
        { withCredentials: true }
      );

      dispatch(setSuccess(response.data.message || "Invite accepted"));
      if (!response.data.signIn) {
        startSession(dispatch, response.data);
      }
      return response.data;
    } catch (err) {
      dispatch(setFailed(apiMessage(err, "Could not accept invite")));
      throw err;
    }
  };

export const logout = () => async (dispatch: AppDispatch) => {
  try {
    await axios.post(`${API}/logout`, {}, { withCredentials: true });
  } catch {
    // Signing out locally still makes sense when the request fails.
  }

  dispatch(setUser(null));
  dispatch(setTenantId(null));
  dispatch(setRole(null));
  dispatch(clearFeedback());
};

export const loadUser =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    try {
      const response = await axios.get<AuthResponse>(`${API}/me`, {
        withCredentials: true,
      });
      startSession(dispatch, response.data);
      return response.data;
    } catch {
      if (!getState().auth.user) {
        dispatch(setUser(null));
        dispatch(setTenantId(null));
        dispatch(setRole(null));
      }
      dispatch(setChecked());
      return null;
    }
  };
