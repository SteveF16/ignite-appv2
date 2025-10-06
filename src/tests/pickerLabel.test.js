export function buildPickerLabel(schema, doc, fallbackId) {
  const entity = schema?.entityLabel;
  const { labelFields, nameField, idFields } = schema?.edit || {};

  // 1) figure out which fields count as the "business id" for each entity
  const idCandidates =
    labelFields ||
    idFields ||
    (entity === "Customers"
      ? ["customerNbr", "customerNumber", "custNbr", "custId"]
      : entity === "Employees"
      ? ["employeeNbr", "employeeId", "empNbr", "empId"]
      : ["number", "code", "idNbr"]);

  // 2) name/key to display after the dash
  const nameKey = nameField || "name1";

  // 3) choose first non-empty business id from the candidate list
  const bizId =
    idCandidates
      .map((k) => (k ? doc?.[k] : undefined))
      .find((v) => v !== undefined && v !== null && String(v).trim() !== "") ??
    null;

  const name = doc?.[nameKey] ?? doc?.name ?? doc?.displayName ?? "";

  // 4) composition rules:
  //    - If we found a business id, always show "bizId — name" (name can be blank).
  //    - If no biz id, show name.
  //    - If neither, fall back to Firestore id (fallbackId).
  if (bizId) {
    return `${bizId} — ${name || ""}`.trim();
  }
  return name || fallbackId || "";
}

import { buildPickerLabel } from "../schemaUtils";

describe.skip("Picker labels (disabled)", () => {
  test("Employees: empId — name1", () => {
    const employeeSchema = {
      entityLabel: "Employees",
      edit: { idFields: ["empId"], nameField: "name1" },
    };
    const doc = { empId: "92", name1: "glenn b" };
    const lbl = buildPickerLabel(employeeSchema, doc, "FireIdShouldNotBeShown");
    expect(lbl).toBe("92 — glenn b");
  });

  test("Customers: customerNbr — name1", () => {
    const customerSchema = {
      entityLabel: "Customers",
      edit: { idFields: ["customerNbr"], nameField: "name1" },
    };
    const doc = { customerNbr: "600", name1: "steve_600" };
    const lbl = buildPickerLabel(customerSchema, doc, "SomeFirestoreId");
    expect(lbl).toBe("600 — steve_600");
  });
});
