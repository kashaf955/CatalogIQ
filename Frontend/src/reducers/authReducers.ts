import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Role, User } from "../types/api";

export interface AuthState {
  user: User | null;
  tenant_id: string | null;
  role: Role | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  message: string | null;
  checked: boolean;
}

const initialState: AuthState = {
  user: null,
  tenant_id: null,
  role: null,
  status: "idle",
  error: null,
  message: null,
  checked: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    setTenantId: (state, action: PayloadAction<string | null>) => {
      state.tenant_id = action.payload;
    },
    setRole: (state, action: PayloadAction<Role | null>) => {
      state.role = action.payload;
    },
    setLoading: (state) => {
      state.status = "loading";
      state.message = null;
      state.error = null;
    },
    setSuccess: (state, action: PayloadAction<string>) => {
      state.status = "succeeded";
      state.message = action.payload;
      state.error = null;
    },
    setFailed: (state, action: PayloadAction<string>) => {
      state.status = "failed";
      state.error = action.payload;
      state.message = null;
    },
    clearFeedback: (state) => {
      state.status = "idle";
      state.message = null;
      state.error = null;
    },
    setChecked: (state) => {
      state.checked = true;
    },
  },
});

export const {
  setUser,
  setTenantId,
  setRole,
  setLoading,
  setSuccess,
  setFailed,
  clearFeedback,
  setChecked,
} = authSlice.actions;
export default authSlice.reducer;
