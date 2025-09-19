// debug.js
export const dbg = (...a) => window.__igniteDebug && console.log(...a);
// Optional: group helpers
export const dbgGroup = (label, fn) => {
  if (!window.__igniteDebug) return fn?.();
  console.groupCollapsed(label);
  try {
    return fn?.();
  } finally {
    console.groupEnd();
  }
};
