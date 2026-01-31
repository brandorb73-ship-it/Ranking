// src/utils/pivotUtils.js

export function buildPivot({ rows, dimension, metric }) {
  const result = {};

  rows.forEach((r) => {
    const key =
      dimension === "PRODUCT"
        ? r.PRODUCT || "Unknown"
        : r.Country || "Unknown";

    const type = (r.Type || "").toLowerCase();
    const value = Number(r[metric] || 0);

    if (!result[key]) {
      result[key] = { Export: 0, Import: 0 };
    }

    if (type === "export") result[key].Export += value;
    if (type === "import") result[key].Import += value;
  });

  return Object.entries(result).map(([name, v]) => ({
    name,
    Export: v.Export,
    Import: v.Import,
    Total: v.Export + v.Import,
  }));
}
