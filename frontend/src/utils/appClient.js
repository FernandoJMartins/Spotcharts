// src/utils/apiClient.js
import { withApiBase } from "./apiBase";

export function notifyAuthChanged() {
  window.dispatchEvent(new Event("auth-changed"));
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "1",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(withApiBase(path), {
    ...options,
    headers,
  });

  if (response.status === 401) {
    //localStorage.removeItem("token");
    notifyAuthChanged(); // 👈 avisa logout automático
  }

  return response;
}