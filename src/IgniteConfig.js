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

/** System-wide idle pause for realtime listeners (ms). Set to 0 to disable.
 *  Runtime overrides:
 *    window.__ignite.idlePauseMs = 0         // disable everywhere
 *    window.__ignite.idlePauseMs = 300000    // 5 minutes
 *    window.__igniteIdleMs = 300000          // legacy name supported
 *
 * For testing, you can set this in the browser console to a short value (e.g., 5000):
 * window.__igniteBreakOnEdit = true; // enable debugger breakpoints on edits STEVE-- REMOVE AFTER TESTING!!!!
 *
 *
 */

export const IgniteConfig = {
  get appId() {
    return getAppId();
  },
  /** Pause realtime listeners after this many ms of user inactivity (system-wide).
   *  Runtime overrides:
   *    window.__ignite.idlePauseMs = 0         // disable idle pause everywhere
   *    window.__ignite.idlePauseMs = 300000    // 5 min
   *    window.__igniteIdleMs = 300000          // legacy override supported
   */
  get realtimePauseOnIdleMs() {
    const override =
      (typeof window !== "undefined" &&
        window.__ignite &&
        window.__ignite.idlePauseMs) ??
      (typeof window !== "undefined" && window.__igniteIdleMs);
    const n = Number(override);
    return Number.isFinite(n) && n >= 0 ? n : 120000; // default 2 minutes  STEVE-- SET to 0 to disable!!!
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

// --- Realtime idle/pause support -------------------------------------------
// Getter that prefers window override, then IgniteConfig.realtime.pauseOnIdleMs
export function getRealtimePauseOnIdleMs() {
  // Prefer an explicit window override if present
  const fromWindow =
    typeof window !== "undefined" &&
    window.__ignite &&
    typeof window.__ignite.realtimePauseOnIdleMs === "number"
      ? window.__ignite.realtimePauseOnIdleMs
      : undefined;
  if (typeof fromWindow === "number") return fromWindow;

  // Fall back to the getter on IgniteConfig
  const viaGetter =
    typeof IgniteConfig?.realtimePauseOnIdleMs === "number"
      ? IgniteConfig.realtimePauseOnIdleMs
      : undefined;
  if (typeof viaGetter === "number") return viaGetter;

  // default off
  return 0;
}

// Optional named exports for compatibility with older imports
export const REALTIME = (IgniteConfig && IgniteConfig.realtime) || {};
export const appRealtime = REALTIME;
export const realtimePauseOnIdleMs = getRealtimePauseOnIdleMs();
