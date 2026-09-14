import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    tenant_id: null,
    role: null,
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
  },
});

export const { setUser, setTenantId, setRole } = authSlice.actions;
export default authSlice.reducer;
