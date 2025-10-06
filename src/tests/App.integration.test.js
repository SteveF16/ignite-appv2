import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---- Mocks MUST come before importing App to avoid real side-effects ----
// Keep jsdom happy: stub out jspdf & plugin so canvas isn't required.
jest.mock("jspdf", () => {
  return function MockJsPDF() {
    return {
      addImage: jest.fn(),
      save: jest.fn(),
      setFont: jest.fn(),
      setFontSize: jest.fn(),
      text: jest.fn(),
    };
  };
});
jest.mock("jspdf-autotable", () => jest.fn());

// Short-circuit modules that drag in PDF/canvas so they never load in tests.
jest.mock(require.resolve("../invoice/InvoiceEditor"), () => () => null);
jest.mock(require.resolve("../invoice/pdf/makeInvoicePdf"), () => ({
  makeInvoicePdf: jest.fn(),
}));

// Import App *after* mocks AND pull the same context App uses (re-exported).
const AppMod = require("../App");
const App = AppMod.default;
const { FirebaseContext } = AppMod;

describe("App integration (router  firebase ctx)", () => {
  test("renders sidebar/nav with Customers and Employees", () => {
    const fakeCtx = {
      auth: {}, // minimal shape so App's destructuring works
      user: { email: "test@example.com" },
      tenantId: "test-tenant",
      appId: "default-app-id",
      db: {},
    };
    render(
      <FirebaseContext.Provider value={fakeCtx}>
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      </FirebaseContext.Provider>
    );
    // loose text match so this isn't brittle to layout
    expect(screen.getByText(/Customers/i)).toBeInTheDocument();
    expect(screen.getByText(/Employees/i)).toBeInTheDocument();
  });
});
