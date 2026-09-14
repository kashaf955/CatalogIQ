import axios from "axios";
import { setRole, setTenantId, setUser } from "../reducers/authReducers";

const API = "/api/v1/auth";

export const login = (email, password, tenantId) => async (dispatch) => {
  const body = { email, password };
  if (tenantId) {
    body.tenantId = tenantId;
  }

  const response = await axios.post(`${API}/login`, body, {
    withCredentials: true,
  });

  dispatch(setUser(response.data.user));
  dispatch(setTenantId(response.data.tenant?.id ?? null));
  dispatch(setRole(response.data.role));
  return response.data;
};

export const register = (companyName, name, email, password) => async (dispatch) => {
  const response = await axios.post(
    `${API}/register`,
    { companyName, name, email, password },
    { withCredentials: true }
  );

  dispatch(setUser(response.data.user));
  dispatch(setTenantId(response.data.tenant?.id ?? null));
  dispatch(setRole(response.data.role));
  return response.data;
};

export const logout = () => async (dispatch) => {
  await axios.post(`${API}/logout`, {}, { withCredentials: true });
  dispatch(setUser(null));
  dispatch(setTenantId(null));
  dispatch(setRole(null));
};
