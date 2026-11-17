import axios from "axios";
import type { ApiErrorBody } from "../types/api";

// The API's error message from a failed request, or `fallback`.
export const apiMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};
