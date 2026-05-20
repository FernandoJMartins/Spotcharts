import { apiFetch } from "./appClient";

const rawBase = import.meta.env.VITE_API_BASE || "";

export const API_BASE = rawBase.replace(/\/$/, "");
console.log(API_BASE)
export const withApiBase = (path) => {
  console.log(API_BASE)
  return `${API_BASE}${path}`;
};

export const getAuthToken = () => {
  return localStorage.getItem("token");
};

export const authHeaders = () => {
  const token = getAuthToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

export const api = {
    get: async (path) => {
        const res = await fetch(withApiBase(path), {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders(),
            },
        });
    }}