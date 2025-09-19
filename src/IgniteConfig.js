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

// ────────────────────────────────────────────────────────────────────────────────
// Employees module support: per-tenant tax engine selection & PII key metadata.
// These are thin helpers; resolve *real* secrets via server or secure store.
// In production, do NOT expose vendor API keys in browser code.

/** Return a normalized per-tenant config object. Replace with secure fetch if needed. */
export function getTenantConfig(tenantId) {
  // Example shape sourced from a bootstrap global or future config document.
  const t =
    (typeof globalThis !== "undefined" &&
      globalThis.__ignite?.tenants?.[tenantId]) ||
    {};
  return {
    taxEngine: t.taxEngine || { provider: "none", baseUrl: "", apiKeyRef: "" },
    piiKeyRef: t.piiKeyRef || "", // reference ONLY (e.g., KMS alias or secret id)
  };
}

/** Select the tax engine descriptor for a tenant. */
export function getTaxEngineForTenant(tenantId) {
  return getTenantConfig(tenantId).taxEngine; // { provider, baseUrl, apiKeyRef }
}

/** Expose PII key reference metadata for a tenant (no raw keys!). */
export function getPiiKeyInfo(tenantId) {
  return { keyRef: getTenantConfig(tenantId).piiKeyRef };
}
