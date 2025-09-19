// Tax Engine Adapter — selects per-tenant provider and normalizes request/response.
import { getTaxEngineForTenant } from "../IgniteConfig";

export async function calculateWithholding({
  tenantId,
  grossPay,
  federal,
  states = [],
  locals = [],
}) {
  const engine = getTaxEngineForTenant(tenantId);
  if (!engine || engine.provider === "none") {
    // Stubbed fallback — returns zero withholdings so you can wire UI safely in dev.
    return {
      federalTax: 0,
      socialSecurityTax: 0,
      medicareTax: 0,
      stateTax: states.map((s) => ({ stateCode: s.stateCode, amount: 0 })),
      localTax: locals.map((l) => ({
        localityName: l.localityName || l.code || "local",
        amount: 0,
      })),
      netPay: grossPay,
      lines: [{ code: "INFO", label: "No tax engine configured", amount: 0 }],
    };
  }
  // Example shape; implement provider-specific calls here (Symmetry/Gusto/etc.).                    // inline-review
  const url = `${engine.baseUrl}/withholding`;
  const payload = { grossPay, federal, states, locals };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${engine.apiKeyRef}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Tax engine error: ${res.status}`);
  const data = await res.json();
  return data;
}
