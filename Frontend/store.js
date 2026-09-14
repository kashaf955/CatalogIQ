import { configureStore } from '@reduxjs/toolkit'
import authReducer from "./src/reducers/authReducers";

export default configureStore({
  reducer: {
    auth: authReducer,
  },
})