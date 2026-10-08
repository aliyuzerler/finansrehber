import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  timeout: 120_000,
});

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
    return detail || err.message || "Bilinmeyen hata";
  }
  return err instanceof Error ? err.message : "Bilinmeyen hata";
}
