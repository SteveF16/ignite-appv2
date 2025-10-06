// Centralized helpers for schema normalization and picker labels.

export const DEFAULT_SEARCH_KEYS = [
  "name1",
  "customerNbr",
  "email",
  "city",
  "state",
  "country",
];

export const COMMON_IMMUTABLE = ["tenantId", "appId", "createdAt", "createdBy"];

export function fieldKey(f) {
  return f?.path || f?.key || f?.name || "";
}

// Ensure every caller sees the same, safe shape.
export function normalizeSchema(input, { entityLabel, collectionName } = {}) {
  const s = input && typeof input === "object" ? input : {};
  const fields = Array.isArray(s.fields) ? s.fields : [];
  const search = {
    keys:
      Array.isArray(s?.search?.keys) && s.search.keys.length
        ? s.search.keys
        : DEFAULT_SEARCH_KEYS,
  };
  const list = {
    defaultSort:
      s?.list?.defaultSort && s.list.defaultSort.key
        ? s.list.defaultSort
        : undefined,
  };
  const meta = {
    immutable: Array.isArray(s?.meta?.immutable) ? s.meta.immutable : [],
  };
  return { fields, search, list, meta, entityLabel, collectionName };
}

// Normalize select options from either `enum: string[]` or `options: ({value,label}|string)[]`.
export function selectOptionsFrom(f, schemaFields = []) {
  const key = fieldKey(f);
  const src = schemaFields.find((ff) => fieldKey(ff) === key) || {};
  const enumVals =
    Array.isArray(f?.enum) && f.enum.length
      ? f.enum
      : Array.isArray(src.enum)
      ? src.enum
      : undefined;
  const optVals =
    Array.isArray(f?.options) && f.options.length
      ? f.options
      : Array.isArray(src.options)
      ? src.options
      : undefined;
  if (optVals) {
    return optVals.map((o) =>
      typeof o === "string"
        ? { value: o, label: o }
        : {
            value: String(o.value ?? ""),
            label: String(o.label ?? o.value ?? ""),
          }
    );
  }
  if (enumVals) {
    return enumVals.map((v) => ({ value: String(v), label: String(v) }));
  }
  return [];
}

// Build human-friendly picker labels (Employees → "employeeNbr — name", etc.).
export function buildPickerLabel(entityLabel, data, fallbackId) {
  const d = data || {};
  const idCandidates =
    entityLabel === "Employees"
      ? ["employeeNbr", "employeeId", "empNbr", "empId"]
      : entityLabel === "Customers"
      ? ["customerNbr", "customerId"]
      : ["number", "code", "idNbr"];

  let bizId = null;
  for (const k of idCandidates) {
    if (d[k] != null && d[k] !== "") {
      bizId = String(d[k]);
      break;
    }
  }

  const firstLast =
    d.firstName || d.lastName
      ? [d.firstName, d.lastName].filter(Boolean).join(" ")
      : null;
  const name = d.name1 ?? d.displayName ?? firstLast ?? d.name ?? d.email ?? "";

  if (bizId) return name ? `${bizId} — ${name}` : bizId;
  return name || fallbackId;
}
