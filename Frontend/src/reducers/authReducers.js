import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    tenant_id: null,
    role: null,
    status: "idle",
    error: null,
    message: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setTenantId: (state, action) => {
      state.tenant_id = action.payload;
    },
    setRole: (state, action) => {
      state.role = action.payload;
    },
    setLoading: (state) => {
      state.status = "loading";
      state.message = null;
      state.error = null;
    },
    setSuccess: (state, action) => {
      state.status = "succeeded";
      state.message = action.payload; 
      state.error = null;
    },
    setFailed: (state, action) => {
      state.status = "failed";
      state.error = action.payload;   
      state.message = null;
    },
    clearFeedback: (state) => {
      state.status = "idle";
      state.message = null;
      state.error = null;
    },
  },
});

export const { setUser, setTenantId, setRole, setLoading, setSuccess, setFailed, clearFeedback } = authSlice.actions;
export default authSlice.reducer;
