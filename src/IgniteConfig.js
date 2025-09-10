// Centralized runtime configuration for Ignite — single source of truth for appId, etc.
// Avoid reading process.env in browser modules; prefer globals injected at runtime (or defaults).
//
// Usage:
//   import { getAppId, IgniteConfig } from "./IgniteConfig";
//   const appId = getAppId();
//
export function getAppId() {
  // 1) Prefer a bootstrap global: <script>window.__ignite = { appId: "your-app-id" }</script>
  if (typeof globalThis !== "undefined" && globalThis.__ignite?.appId) {
    return String(globalThis.__ignite.appId);
  }
  // 2) Back-compat: prior code used window.__app_id
  if (typeof window !== "undefined" && window.__app_id) {
    return String(window.__app_id);
  }
  // 3) Safe local default for dev
  return "default-app-id";
}

export const IgniteConfig = {
  get appId() {
    return getAppId();
  },
  // Future: orgId, workspaceId, date formats, currency, feature gates, etc.
};
