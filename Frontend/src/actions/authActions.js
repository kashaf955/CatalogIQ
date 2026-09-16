import axios from "axios";
import { setRole, setTenantId, setUser, setLoading, setSuccess, setFailed, clearFeedback, setChecked } from "../reducers/authReducers";

const API = "/api/v1/auth";

export const login = (email, password, tenantId) => async (dispatch) => {
  const body = { email, password };
  if (tenantId) {
    body.tenantId = tenantId;
  }

  dispatch(setLoading());

  try {
    const response = await axios.post(`${API}/login`, body, {
      withCredentials: true,
    });

    dispatch(setSuccess("Login successful"));
    dispatch(setUser(response.data.user));
    dispatch(setTenantId(response.data.tenant?.id ?? null));
    dispatch(setRole(response.data.role));
    dispatch(setChecked());
    return response.data;
  } catch (err) {
    dispatch(setFailed(err.response?.data?.message || "Invalid credentials"));
    throw err;
  }
};

export const register = (companyName, name, email, password) => async (dispatch) => {
  dispatch(setLoading());

  try {
    const response = await axios.post(
      `${API}/register`,
      { companyName, name, email, password },
      { withCredentials: true }
    );

    dispatch(setSuccess("Registration successful"));
    dispatch(setUser(response.data.user));
    dispatch(setTenantId(response.data.tenant?.id ?? null));
    dispatch(setRole(response.data.role));
    dispatch(setChecked());
    return response.data;
  } catch (err) {
    dispatch(setFailed(err.response?.data?.message || "Registration failed"));
    throw err;
  }
};

export const logout = () => async (dispatch) => {
  try {
    await axios.post(`${API}/logout`, {}, { withCredentials: true });
  } catch {
    
  }

  dispatch(setUser(null));
  dispatch(setTenantId(null));
  dispatch(setRole(null));
  dispatch(clearFeedback());
};

export const loadUser = () => async (dispatch, getState) => {
  try {
    const response = await axios.get(`${API}/me`, { withCredentials: true });
    dispatch(setUser(response.data.user));
    dispatch(setTenantId(response.data.tenant?.id ?? null));
    dispatch(setRole(response.data.role));
    dispatch(setChecked());
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