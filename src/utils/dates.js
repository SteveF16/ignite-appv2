// utils/dates.js — canonical date helpers used across the app
// All helpers accept Firestore Timestamp | Date | string | number (ms),
// and return either Date or formatted strings.

export const toJsDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

// yyyy-MM-dd (for native <input type="date"> and react-datepicker)
export const formatYmd = (dateish) => {
  const d = toJsDate(dateish);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Short, locale-friendly date for read-only audit fields
export const formatDate = (dateish) => {
  const d = toJsDate(dateish);
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      d
    );
  } catch {
    return d.toLocaleDateString?.() || d.toString();
  }
};

// Date  time for audit stamps (createdAt/updatedAt)
export const formatTs = (dateish) => {
  const d = toJsDate(dateish);
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toString();
  }
};
