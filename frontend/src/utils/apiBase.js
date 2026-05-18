const rawBase = import.meta.env.VITE_API_BASE || "";

export const API_BASE = rawBase.replace(/\/$/, "");

export const withApiBase = (path) => `${API_BASE}${path}`;
