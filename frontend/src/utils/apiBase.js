import { apiFetch } from "./appClient";

const rawBase = import.meta.env.VITE_API_BASE || "";
console.log(rawBase)
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

const apiGet = async (path) => {
  const res = await fetch(withApiBase(path), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });

  return res;
};

const apiGetJson = async (path) => {
  const res = await apiGet(path);
  let data = null;

  try {
    data = await res.json();
  } catch (error) {
    data = null;
  }

  return { res, data };
};

export const api = {
  get: apiGet,
  getJson: apiGetJson,
};