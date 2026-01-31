// utils/pivotUtils.js

export function buildPivot({
  rows,
  dimension,          // "PRODUCT" | "Country"
  metric,             // "Amount($)" | "Weight(Kg)" | "Quantity"
}) {
  const pivot = {};

  rows.forEach(r => {
    const key =
      dimension === "PRODUCT"
        ? r.PRODUCT || "Unknown"
        : r.Country || "Unknown";

    const type = (r.Type || "").toLowerCase(); // export / import
    const value = Number(r[metric] || 0);

    if (!pivot[key]) {
      pivot[key] = { Export: 0, Import: 0 };
    }

    if (type === "export") pivot[key].Export += value;
    if (type === "import") pivot[key].Import += value;
  });

  return Object.entries(pivot).map(([name, v]) => ({
    name,
    Export: v.Export,
    Import: v.Import,
    Total: v.Export + v.Import,
  }));
}
