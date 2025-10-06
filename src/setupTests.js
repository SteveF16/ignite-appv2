// src/setupTests.js
import "@testing-library/jest-dom";

// Backstop: some libs probe canvas; provide a no-op getContext so tests never blow up.
if (typeof window !== "undefined" && window.HTMLCanvasElement) {
  // eslint-disable-next-line no-extend-native
  HTMLCanvasElement.prototype.getContext =
    HTMLCanvasElement.prototype.getContext || (() => ({}));
}

// jsdom doesn't implement canvas. Avoid noisy errors from libs (e.g., jsPDF).
if (
  typeof HTMLCanvasElement !== "undefined" &&
  !HTMLCanvasElement.prototype.getContext
) {
  // eslint-disable-next-line no-extend-native
  HTMLCanvasElement.prototype.getContext = () => ({});
}
if (typeof URL !== "undefined" && typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:mock";
}
