// config.js — Shared constants
// In development: calls localhost:3001
// In production: uses relative URLs (frontend + backend on same server)

export const BACKEND_URL = import.meta.env.DEV ? "http://localhost:3001" : ""
