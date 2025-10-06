// src/__tests__/schemas.test.js

// STEVE - these are Create two light Jest tests that validate:
//The picker labels (Employees = empId — name1, Customers = customerNbr — name1)
//The schemas exist and have fields so we don’t fall back to inferred fields.
//CRA already ships with Jest. These are pure unit tests—no Firestore mocking needed.

import { CollectionSchemas } from "../DataSchemas";

describe("CollectionSchemas sanity", () => {
  test("Customers schema present with fields and defaultSort", () => {
    const s = CollectionSchemas?.Customers;
    expect(s).toBeTruthy();
    expect(Array.isArray(s.fields)).toBe(true);
    expect(s.fields.length).toBeGreaterThan(0);
    expect(s.defaultSort?.key).toBeTruthy();
  });

  test("Employees schema present with fields (prevents fallback/inference)", () => {
    const s = CollectionSchemas?.Employees;
    expect(s).toBeTruthy();
    expect(Array.isArray(s.fields)).toBe(true);
    expect(s.fields.length).toBeGreaterThan(0);
  });
});
